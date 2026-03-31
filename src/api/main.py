import asyncio
from datetime import datetime, timezone, timedelta
from typing import Literal, Optional, List, AsyncGenerator
import asyncpg

from fastapi import FastAPI, HTTPException, Query, Response, Request, Depends
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from shared.db_utils import create_db_pool
from database.queries import (
    ACTIVATE_FLIGHT_STATES_QUERY,
    ALERT_QUERY,
    AIRPORTS_LATEST_QUERY,
    AIRPORT_QUERY,
    AURORA_QUERY,
    AURORA_RANGE_QUERY,
    FLIGHT_PATH_QUERY,
    FLIGHTS_RANGE_QUERY,
    KP_INDEX_RANGE_QUERY,
    LATEST_DRAP_QUERY,
    DRAP_RANGE_QUERY,
    XRAY_FLUX_RANGE_QUERY,
    PROTON_FLUX_RANGE_QUERY,
    LATEST_GEOELECTRIC_QUERY,
    GEOELECTRIC_RANGE_QUERY,
)
from config import (
    AuroraResponse,
    FlightStatesResponse,
    DRAPResponse,
    FlightPathResponse,
    Airport,
    AirportsResponse,
    AirportDetailResponse,
    KpIndexResponse,
    XRayResponse,
    ProtonFluxResponse,
    AlertResponse,
    GeoelectricResponse,
    TimeTestingData,
)
from validator import points_adapter, airports_adapter
import shared.redis as redis_config  # Pull from the shared volume
import logging
import json
import time
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00:00Z")


def _iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).strftime(
        "%Y-%m-%dT%H:00:00Z"
    )


def _iso_hours_ago(hours: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime(
        "%Y-%m-%dT%H:00:00Z"
    )


def _normalize_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _resolve_time_window(
    start: Optional[datetime],
    end: Optional[datetime],
    default_hours: int = 3,
) -> tuple[datetime, datetime]:

    now = datetime.now(timezone.utc)
    default_delta = timedelta(hours=default_hours)

    # Validate: don't allow future timestamps
    if end:
        end = _normalize_utc(end)
    if start:
        start = _normalize_utc(start)
    if (end and end > now) or (start and start > now):
        invalid_time = end if (end and end > now) else start
        raise HTTPException(
            status_code=400,
            detail=f"query_time cannot be in the future (requested: {invalid_time}, now: {now})",
        )

    if start is None:
        if end is None:
            return now - default_delta, now

        else:
            # Only end provided: default window before end → end
            end_utc = _normalize_utc(end)
            return end_utc - default_delta, end_utc

    else:
        if end is None:
            # Only start provided: start → now
            return _normalize_utc(start), now

    # Both provided: full validation
    start_utc = _normalize_utc(start)
    end_utc = _normalize_utc(end)

    if end_utc <= start_utc:
        raise HTTPException(
            status_code=422,
            detail="'end' must be greater than 'start'.",
        )

    return start_utc, end_utc


async def redis_heartbeat_loop():
    """Background task that pulses Redis every 15 seconds."""
    client = redis_config.get_redis_client()
    try:
        while True:
            await asyncio.sleep(15)
            # The payload doesn't matter, we just need to wake up the socket
            await client.publish(redis_config.HEARTBEAT_CHANNEL, "ping")
    except asyncio.CancelledError:
        pass
    finally:
        await client.aclose()


@asynccontextmanager
async def lifespan(app: FastAPI):

    app.state.pool = await create_db_pool(min_size=2, max_size=10)
    logger.info("Database connection pool initialized")

    # Warm up the pool
    async with app.state.pool.acquire() as conn:
        await conn.execute("SELECT 1")
    heartbeat_task = asyncio.create_task(redis_heartbeat_loop())

    yield

    heartbeat_task.cancel()
    await app.state.pool.close()
    logger.info("Database connection pool closed")


async def get_db_connection(
    request: Request,
) -> AsyncGenerator[asyncpg.Connection, None]:
    """Dependency that gives a route a single connection from the pool."""
    async with request.app.state.pool.acquire() as conn:
        yield conn


app = FastAPI(
    title="Space Weather API",
    description="API for accessing space weather data and flight information",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_process_time_header(request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.perf_counter() - t0)
    return response


app.add_middleware(GZipMiddleware, minimum_size=1000)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

query_dict = {
    "drap": DRAP_RANGE_QUERY,
    "geoelectric": GEOELECTRIC_RANGE_QUERY,
    "aurora": AURORA_RANGE_QUERY,
    "flight": FLIGHTS_RANGE_QUERY,
}


@app.get("/")
async def root():
    return {"message": "D-RAP Data API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/v1/stream/live")
async def live_dashboard_stream(request: Request):
    redis_client = redis_config.get_redis_client()

    async def event_generator():
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(
            redis_config.FLIGHTS_CHANNEL,
            redis_config.AURORA_CHANNEL,
            redis_config.DRAP_CHANNEL,
            redis_config.XRAY_CHANNEL,
            redis_config.PROTONFLUX_CHANNEL,
            redis_config.KPINDEX_CHANNEL,
            redis_config.ALERTS_CHANNEL,
            redis_config.GEOELECTRIC_CHANNEL,
            redis_config.HEARTBEAT_CHANNEL,  # For keeping the connection alive
        )

        try:
            # Block until Redis pushes a message.
            async for message in pubsub.listen():
                # If the user closed their browser tab, kill the generator
                if await request.is_disconnected():
                    break

                # The first message is always a 'subscribe' confirmation, ignore it
                if message["type"] != "message":
                    continue

                channel = message["channel"]

                match channel:
                    case redis_config.FLIGHTS_CHANNEL:
                        latest_data = await redis_client.get(
                            redis_config.FLIGHTS_CACHE_KEY
                        )
                        if latest_data:
                            yield f"event: planes\ndata: {latest_data}\n\n"

                    case redis_config.AURORA_CHANNEL:
                        latest_aurora = await redis_client.get(
                            redis_config.AURORA_CACHE_KEY
                        )
                        if latest_aurora:
                            yield f"event: aurora\ndata: {latest_aurora}\n\n"

                    case redis_config.DRAP_CHANNEL:
                        latest_drap = await redis_client.get(
                            redis_config.DRAP_CACHE_KEY
                        )
                        if latest_drap:
                            yield f"event: drap\ndata: {latest_drap}\n\n"

                    case redis_config.XRAY_CHANNEL:
                        latest_xray = await redis_client.get(
                            redis_config.XRAY_CACHE_KEY
                        )
                        if latest_xray:
                            yield f"event: xray\ndata: {latest_xray}\n\n"

                    case redis_config.PROTONFLUX_CHANNEL:
                        latest_protonflux = await redis_client.get(
                            redis_config.PROTONFLUX_CACHE_KEY
                        )
                        if latest_protonflux:
                            yield f"event: protonflux\ndata: {latest_protonflux}\n\n"

                    case redis_config.KPINDEX_CHANNEL:
                        latest_kpindex = await redis_client.get(
                            redis_config.KPINDEX_CACHE_KEY
                        )
                        if latest_kpindex:
                            yield f"event: kpindex\ndata: {latest_kpindex}\n\n"

                    case redis_config.ALERTS_CHANNEL:
                        latest_alerts = await redis_client.get(
                            redis_config.ALERTS_CACHE_KEY
                        )
                        if latest_alerts:
                            yield f"event: alerts\ndata: {latest_alerts}\n\n"

                    case redis_config.GEOELECTRIC_CHANNEL:
                        latest_geoelectric = await redis_client.get(
                            redis_config.GEOELECTRIC_CACHE_KEY
                        )
                        if latest_geoelectric:
                            yield f"event: geoelectric\ndata: {latest_geoelectric}\n\n"

                    case _:
                        yield ": heartbeat\n\n"

        finally:
            await pubsub.unsubscribe()
            await pubsub.close()
            await redis_client.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/v1/airports", response_model=List[Airport], response_class=Response)  # Drop response_model — you're returning raw Response
async def get_latest_airports(
    conn: asyncpg.Connection = Depends(get_db_connection),
    limit: int = Query(None, ge=1, le=200000),
    debug: bool = Query(False),
):
    t_start = time.perf_counter()
    redis_client = redis_config.get_redis_client()
    try:
        t_query_start = time.perf_counter()
        cached_bytes: bytes | None = await redis_client.get(redis_config.AIRPORTS_CACHE_KEY)

        if cached_bytes:
            t_query_end = time.perf_counter()

            if debug:
                return JSONResponse(content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result())

            if limit:
                airports_data = airports_adapter.validate_json(cached_bytes)
                return Response(
                    content=airports_adapter.dump_json(airports_data[:limit]),
                    media_type="application/json",
                )

            return Response(content=cached_bytes, media_type="application/json")

        rows = await conn.fetch(AIRPORTS_LATEST_QUERY)
        t_query_end = time.perf_counter()

        if not rows:
            raise HTTPException(status_code=404, detail="No airport data available")

        airports_models = airports_adapter.validate_python(rows)  
        cache_payload_bytes = airports_adapter.dump_json(airports_models)

        await redis_client.set(
            redis_config.AIRPORTS_CACHE_KEY,
            cache_payload_bytes,
            ex=redis_config.VERY_LONG_TTL,
        )

        if debug:
            return JSONResponse(content=TimeTestingData(
                start=t_start,
                query_start=t_query_start,
                query_end=t_query_end,
                finish=time.perf_counter(),
            ).result())

        if limit:
            return Response(
                content=airports_adapter.dump_json(airports_models[:limit]),
                media_type="application/json",
            )

        return Response(content=cache_payload_bytes, media_type="application/json")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest airports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await redis_client.aclose()


@app.get("/api/v1/airport/{ident}", response_model=AirportDetailResponse)
async def get_airport_details(
    ident: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
    debug: bool = Query(False),
):
    t_start = time.perf_counter()

    try:
        t_query_start = time.perf_counter()
        row = await conn.fetchrow(AIRPORT_QUERY, ident.upper())
        t_query_end = time.perf_counter()

        if not row:
            raise HTTPException(status_code=404, detail=f"Airport {ident} not found")

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        airport_data = dict(row)
        json_fields = ["geom", "runways", "frequencies", "navaids", "comments"]
        for field in json_fields:
            val = airport_data.get(field)
            if isinstance(val, str):
                airport_data[field] = json.loads(val)

        return AirportDetailResponse(**airport_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching airport details for {ident}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/flight-path/{icao24}", response_model=FlightPathResponse)
async def get_flight_path(
    icao24: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
    debug: bool = Query(False),
):
    t_start = time.perf_counter()

    try:
        t_query_start = time.perf_counter()
        rows = await conn.fetch(FLIGHT_PATH_QUERY, icao24)
        t_query_end = time.perf_counter()

        if not rows:
            raise HTTPException(status_code=404, detail="No flight data available")

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        row = rows[0]
        path_points = row["path_points"] or []

        return FlightPathResponse(
            icao24=row["icao24"],
            callsign=row["callsign"],
            path_points=path_points,
            number_of_points=len(path_points),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching flight path for {icao24}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/active-flight-states/latest")
async def get_activate_flight_states(
    conn: asyncpg.Connection = Depends(get_db_connection),
    limit: int = Query(None, ge=1, le=20000),
    debug: bool = Query(False),
):
    """
    Retrieve all flight states from the most recent timestamp in activate_flight table.

    - **limit**: Optional parameter to limit results (e.g., ?limit=50 returns 50 records)
    """
    t_start = time.perf_counter()

    try:
        t_query_start = time.perf_counter()
        rows = await conn.fetch(ACTIVATE_FLIGHT_STATES_QUERY)
        t_query_end = time.perf_counter()

        if not rows:
            raise HTTPException(status_code=404, detail="No flight data available")

        if limit:
            rows = rows[:limit]

        # 3. Fast Dictionary Conversion: No manual mapping needed!
        flights_data = [dict(row) for row in rows]

        # 4. Construct the raw Python dictionary payload
        payload_dict = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "count": len(flights_data),
            "flights": flights_data  
        }

        payload_model = FlightStatesResponse.model_validate(payload_dict)

        json_bytes = payload_model.model_dump_json()

        t_finish = time.perf_counter()
        timing = TimeTestingData(
            start=t_start,
            query_start=t_query_start,
            query_end=t_query_end,
            finish=t_finish,
        )
        logger.info(f"Retrieved {len(flights_data)} flights - {timing.result()}")

        if debug:
            return JSONResponse(content=timing.result())

        return Response(content=json_bytes, media_type="application/json")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching flight states: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/drap/latest", response_model=DRAPResponse)
async def latest_drap(
    conn: asyncpg.Connection = Depends(get_db_connection), debug: bool = Query(False)
):
    t_start = time.perf_counter()
    redis_client = redis_config.get_redis_client()
    try:
        t_query_start = time.perf_counter()
        cached_drap = await redis_client.get(redis_config.DRAP_CACHE_KEY)
        t_query_end = time.perf_counter()

        if cached_drap:
            if debug:
                return JSONResponse(
                    content=TimeTestingData(
                        start=t_start,
                        query_start=t_query_start,
                        query_end=t_query_end,
                        finish=time.perf_counter(),
                    ).result()
                )

            return Response(content=cached_drap, media_type="application/json")

        t_query_start = time.perf_counter()
        row = await conn.fetchrow(LATEST_DRAP_QUERY)
        t_query_end = time.perf_counter()

        if not row:
            raise HTTPException(status_code=404, detail="No D-RAP data available")

        drap_dict = dict(row)
        drap_dict["points"] = points_adapter.validate_json(drap_dict["points"])

        final_model = DRAPResponse(**drap_dict)
        cache_payload_bytes = final_model.model_dump_json()

        await redis_client.set(
            redis_config.DRAP_CACHE_KEY,
            cache_payload_bytes,
            ex=redis_config.VERY_LONG_TTL,  # Or whatever your DRAP TTL is
        )

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        return Response(content=cache_payload_bytes, media_type="application/json")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.get("/api/v1/kp-index", response_model=List[KpIndexResponse])
async def kp_index(
    conn: asyncpg.Connection = Depends(get_db_connection),
    start: Optional[datetime] = Query(
        default=None,
        description="Start of time range (ISO 8601 UTC). Defaults to 3 hours before end.",
        openapi_examples={
            "3_hours_ago": {"summary": "3 hours ago", "value": _iso_hours_ago(3)},
            "6_hours_ago": {"summary": "6 hours ago", "value": _iso_hours_ago(6)},
        },
    ),
    end: Optional[datetime] = Query(
        default=None,
        description="End of time range (ISO 8601 UTC). Defaults to now.",
        openapi_examples={
            "now": {"summary": "Current time", "value": _iso_now()},
        },
    ),
    debug: bool = Query(False),
):
    """
    Retrieve Kp index data for either:
    1) A custom start/end time range.

    - **start** and **end**: Optional custom range (both required together, minimum span: 1 hour)
    """
    t_start = time.perf_counter()
    try:
        start_utc, end_utc = _resolve_time_window(start, end, default_hours=3)

        t_query_start = time.perf_counter()
        rows = await conn.fetch(KP_INDEX_RANGE_QUERY, start_utc, end_utc)
        t_query_end = time.perf_counter()

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        return [dict(row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest Kp index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/xray", response_model=List[XRayResponse])
async def xray_flux(
    conn: asyncpg.Connection = Depends(get_db_connection),
    start: Optional[datetime] = Query(
        default=None,
        description="Start of time range (ISO 8601 UTC). Defaults to 3 hours before end.",
        openapi_examples={
            "3_hours_ago": {"summary": "3 hours ago", "value": _iso_hours_ago(3)},
            "6_hours_ago": {"summary": "6 hours ago", "value": _iso_hours_ago(6)},
        },
    ),
    end: Optional[datetime] = Query(
        default=None,
        description="End of time range (ISO 8601 UTC). Defaults to now.",
        openapi_examples={
            "now": {"summary": "Current time", "value": _iso_now()},
        },
    ),
    debug: bool = Query(False),
):
    """
    Retrieve the latest X-ray flux data from the past specified hours.

    - **start** and **end**: Optional custom range (both required together, minimum span: 1 hour)
    """
    t_start = time.perf_counter()
    try:
        start_utc, end_utc = _resolve_time_window(start, end)

        t_query_start = time.perf_counter()
        rows = await conn.fetch(XRAY_FLUX_RANGE_QUERY, start_utc, end_utc)
        t_query_end = time.perf_counter()

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        return [dict(row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest X-ray flux: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/proton-flux", response_model=List[ProtonFluxResponse])
async def proton_flux(
    conn: asyncpg.Connection = Depends(get_db_connection),
    start: Optional[datetime] = Query(
        default=None,
        description="Start of time range (ISO 8601 UTC). Defaults to 3 hours before end.",
        openapi_examples={
            "3_hours_ago": {"summary": "3 hours ago", "value": _iso_hours_ago(3)},
            "6_hours_ago": {"summary": "6 hours ago", "value": _iso_hours_ago(6)},
        },
    ),
    end: Optional[datetime] = Query(
        default=None,
        description="End of time range (ISO 8601 UTC). Defaults to now.",
        openapi_examples={
            "now": {"summary": "Current time", "value": _iso_now()},
        },
    ),
    debug: bool = Query(False),
):
    """
    Retrieve proton flux data from the past specified hours.

    - **start** and **end**: Optional custom range (both required together, minimum span: 1 hour)
    """
    t_start = time.perf_counter()
    try:
        start_utc, end_utc = _resolve_time_window(start, end)

        t_query_start = time.perf_counter()
        rows = await conn.fetch(PROTON_FLUX_RANGE_QUERY, start_utc, end_utc)
        t_query_end = time.perf_counter()

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        return [dict(row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching proton flux: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/aurora", response_model=AuroraResponse)
async def aurora(
    conn: asyncpg.Connection = Depends(get_db_connection),
    utc_time: Optional[str] = Query(
        default=None,
        description="Observation time in ISO 8601 UTC format (required).",
        openapi_examples={
            "recent": {"summary": "Recent observation", "value": _iso_now()},
            "earlier": {"summary": "Earlier observation", "value": _iso_days_ago(1)},
        },
    ),
    debug: bool = Query(False),
):
    """Retrieve aurora forecast data.

    - With **utc_time** (ISO 8601 UTC): returns data for that observation time.
    """
    t_start = time.perf_counter()

    try:
        t_query_start = time.perf_counter()
        # Option A: No time provided? Grab from Redis
        if not utc_time:
            redis_client = redis_config.get_redis_client()
            cached_data = await redis_client.get(redis_config.AURORA_CACHE_KEY)
            await redis_client.aclose()

            if cached_data:
                t_query_end = time.perf_counter()
                raw_data = json.loads(cached_data)

                if debug:
                    return JSONResponse(
                        content=TimeTestingData(
                            start=t_start,
                            query_start=t_query_start,
                            query_end=t_query_end,
                            finish=time.perf_counter(),
                        ).result()
                    )
                payload = {
                    "observation_time": raw_data.get("observation_time"),
                    "forecast_time": raw_data.get("forecast_time"),
                    "coordinates": raw_data.get("coordinates", [])
                }
                return payload

        # Option B: Historical time provided (or Redis was empty). Hit Postgres.

        if utc_time:
            try:
                obs_time = datetime.fromisoformat(
                    utc_time.replace("Z", "+00:00")
                ).astimezone(timezone.utc)
            except ValueError:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid UTC time format: '{utc_time}'. Use ISO 8601, e.g. 2026-03-13T06:17:00Z",
                )

            payload = await conn.fetchval(AURORA_QUERY, obs_time)
        else:
            payload = await conn.fetchval(AURORA_QUERY, None)

        t_query_end = time.perf_counter()

        if isinstance(payload, str):
            payload = json.loads(payload)

        if not payload or payload.get("count", 0) == 0:
            if utc_time:
                raise HTTPException(
                    status_code=404, detail=f"No aurora forecast data for {utc_time}"
                )
            raise HTTPException(
                status_code=404, detail="No aurora forecast data available"
            )

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        timing = TimeTestingData(
            start=t_start,
            query_start=t_query_start,
            query_end=t_query_end,
            finish=time.perf_counter(),
        ).result()
        payload["query_time_ms"] = timing["query_time_ms"]
        payload["total_time_ms"] = timing["total_time_ms"]
        return payload

    except HTTPException:
        raise
    except Exception as e:
        if utc_time:
            logger.error(f"Error fetching aurora forecast for {utc_time}: {str(e)}")
        else:
            logger.error(f"Error fetching latest aurora forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/alert", response_model=List[AlertResponse])
async def get_alerts(
    conn: asyncpg.Connection = Depends(get_db_connection),
    days: int = Query(default=1, ge=1, le=30),
    debug: bool = Query(False),
):
    """Retrieve alert records with only time and message.

    - **days**: Number of days to include ending today (default: 1, today only)
    """
    t_start = time.perf_counter()
    try:
        t_query_start = time.perf_counter()
        rows = await conn.fetch(ALERT_QUERY, days)
        t_query_end = time.perf_counter()

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        return [dict(row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/geoelectric/latest", response_model=GeoelectricResponse)
async def latest_geoelectric(
    conn: asyncpg.Connection = Depends(get_db_connection), debug: bool = Query(False)
):
    t_start = time.perf_counter()
    try:
        t_query_start = time.perf_counter()
        row = await conn.fetchrow(LATEST_GEOELECTRIC_QUERY)
        t_query_end = time.perf_counter()

        if not row:
            raise HTTPException(status_code=404, detail="No Geoelectric data available")

        geoelectric_data = dict(row)
        geoelectric_data["points"] = points_adapter.validate_json(
            geoelectric_data["points"]
        )

        if debug:
            return JSONResponse(
                content=TimeTestingData(
                    start=t_start,
                    query_start=t_query_start,
                    query_end=t_query_end,
                    finish=time.perf_counter(),
                ).result()
            )

        return geoelectric_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.get("/api/v1/kermit/")
async def range_data_retrieve(
    conn: asyncpg.Connection = Depends(get_db_connection),
    start: Optional[datetime] = Query(
        default=None,
        description="The start time for event (ISO 8601 UTC). Defaults to 1 day before end.",
    ),
    end: Optional[datetime] = Query(
        default=None,
        description="The end time for event (ISO 8601 UTC). Defaults to now.",
    ),
    event: Literal["drap", "geoelectric", "aurora"] = Query(
        default="drap", description="Space weather event."
    ),
    interval: int = Query(default=5, description="The time range for each data gap."),
):
    start_utc, end_utc = _resolve_time_window(start, end, default_hours=24)
    start_utc = start_utc.replace(second=0, microsecond=0)
    end_utc = end_utc.replace(second=0, microsecond=0)
    query = query_dict[event]

    rows = await conn.fetch(query, start_utc, end_utc, interval)

    if not rows:
        raise HTTPException(
            status_code=404, detail=f"No {event} data available for the given range"
        )

    snapshots = {}
    for row in rows:
        if row["observed_at"] in snapshots:
            snapshots[row["observed_at"]].append(
                [row["lat"], row["long"], row["intensity"]]
            )
        else:
            snapshots[row["observed_at"]] = [
                [row["lat"], row["long"], row["intensity"]]
            ]

    sorted_snapshots = [
        {"observed_at": ts, "points": snapshots[ts]}
        for ts in sorted(snapshots.keys(), reverse=True)
    ]

    return sorted_snapshots


@app.get("/api/kermit")
def get_image():
    return FileResponse("/app/images/evil-laugh-kermit.gif", media_type="image/gif")
