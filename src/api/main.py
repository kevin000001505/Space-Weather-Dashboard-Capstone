import asyncio
from datetime import datetime, timezone, timedelta
from typing import Literal, Optional, List, AsyncGenerator
import asyncpg

from fastapi import FastAPI, HTTPException, Query, Response, Request, Depends, Path
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
    LATEST_DRAP_QUERY_V2,
    LATEST_GEOELECTRIC_QUERY_V2,
    LATEST_AURORA_QUERY_V2,
    GEOELECTRIC_RANGE_QUERY_V2,
    DRAP_RANGE_QUERY_V2,
    AURORA_RANGE_QUERY_V2,
    LOCATION_QUERY,
    LATEST_EVENT_QUERY_V2,
)
from config import (
    AuroraResponse,
    EventsResponseV2,
    FlightStatesResponse,
    DRAPResponse,
    FlightPathResponse,
    Airport,
    AirportDetailResponse,
    KpIndexResponse,
    XRayResponse,
    ProtonFluxResponse,
    AlertResponse,
    GeoelectricResponse,
    TimeTestingData,
    SnapshotResponse,
    SnapshotResponseV2,
    EventType,
    LocationData,
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{process_time:.6f}"
    return response


query_dict = {
    "drap": DRAP_RANGE_QUERY,
    "geoelectric": GEOELECTRIC_RANGE_QUERY,
    "aurora": AURORA_RANGE_QUERY,
    "flight": FLIGHTS_RANGE_QUERY,
}

query_dict_v2 = {
    "drap": DRAP_RANGE_QUERY_V2,
    "geoelectric": GEOELECTRIC_RANGE_QUERY_V2,
    "aurora": AURORA_RANGE_QUERY_V2,
}

events_dict = {
    "drap": LATEST_DRAP_QUERY_V2,
    "geoelectric": LATEST_GEOELECTRIC_QUERY_V2,
    "aurora": LATEST_AURORA_QUERY_V2,
}

event_name_info = {
    "drap": {"table": "drap_region", "value": "absorption"},
    "aurora": {"table": "aurora_forecast", "value": "aurora"},
    "geoelectric": {"table": "geoelectric_field", "value": "e_magnitude"},
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


@app.get("/api/v1/airports", response_model=List[Airport], response_class=Response)
async def get_latest_airports(
    conn: asyncpg.Connection = Depends(get_db_connection),
    limit: int = Query(None, ge=1, le=200000),
    debug: bool = Query(False),
):
    t_start = time.perf_counter()
    redis_client = redis_config.get_redis_client()
    try:
        t_query_start = time.perf_counter()
        cached_bytes: bytes | None = await redis_client.get(
            redis_config.AIRPORTS_CACHE_KEY
        )

        if cached_bytes:
            t_query_end = time.perf_counter()
            if debug:
                return timing_debug_response(t_start, t_query_start, t_query_end)

            if limit:
                airports_data = airports_adapter.validate_json(cached_bytes)
                response = Response(
                    content=airports_adapter.dump_json(airports_data[:limit]),
                    media_type="application/json",
                )
                add_timing_headers(response, t_start, t_query_start, t_query_end)
                return response

            response = Response(content=cached_bytes, media_type="application/json")
            add_timing_headers(response, t_start, t_query_start, t_query_end)
            return response

        rows = await conn.fetch(AIRPORTS_LATEST_QUERY)
        t_query_end = time.perf_counter()

        if not rows:
            raise HTTPException(status_code=404, detail="No airport data available")

        # Fix: convert Records to dicts for Pydantic V2
        airports_models = airports_adapter.validate_python([dict(row) for row in rows])
        cache_payload_bytes = airports_adapter.dump_json(airports_models)

        await redis_client.set(
            redis_config.AIRPORTS_CACHE_KEY,
            cache_payload_bytes,
            ex=redis_config.VERY_LONG_TTL,
        )

        if debug:
            return timing_debug_response(t_start, t_query_start, t_query_end)

        if limit:
            response = Response(
                content=airports_adapter.dump_json(airports_models[:limit]),
                media_type="application/json",
            )
            add_timing_headers(response, t_start, t_query_start, t_query_end)
            return response

        response = Response(content=cache_payload_bytes, media_type="application/json")
        add_timing_headers(response, t_start, t_query_start, t_query_end)
        return response

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
    response: Response,
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
            return timing_debug_response(t_start, t_query_start, t_query_end)

        airport_data = dict(row)
        json_fields = ["geom", "runways", "frequencies", "navaids"]
        for field in json_fields:
            val = airport_data.get(field)
            if isinstance(val, str):
                airport_data[field] = json.loads(val)

        add_timing_headers(response, t_start, t_query_start, t_query_end)
        return AirportDetailResponse(**airport_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching airport details for {ident}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/flight-path/{icao24}", response_model=FlightPathResponse)
async def get_flight_path(
    icao24: str,
    response: Response,
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
            return timing_debug_response(t_start, t_query_start, t_query_end)

        row = rows[0]
        path_points = row["path_points"] or []

        add_timing_headers(response, t_start, t_query_start, t_query_end)
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
    response: Response,
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

        flights_data = [dict(row) for row in rows]

        payload_dict = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "count": len(flights_data),
            "flights": flights_data,
        }

        payload_model = FlightStatesResponse.model_validate(payload_dict)

        json_bytes = payload_model.model_dump_json()

        t_finish = time.perf_counter()

        if debug:
            return timing_debug_response(
                t_start, t_query_start, t_query_end, finish=t_finish
            )

        response = Response(content=json_bytes, media_type="application/json")
        add_timing_headers(
            response, t_start, t_query_start, t_query_end, finish=t_finish
        )
        return response

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
                return timing_debug_response(t_start, t_query_start, t_query_end)

            response = Response(content=cached_drap, media_type="application/json")
            add_timing_headers(response, t_start, t_query_start, t_query_end)
            return response

        t_query_start = time.perf_counter()
        row = await conn.fetchrow(LATEST_DRAP_QUERY)
        t_query_end = time.perf_counter()

        if not row:
            raise HTTPException(status_code=404, detail="No D-RAP data available")

        raw_json_string = row["payload"]
        final_model = DRAPResponse.model_validate_json(raw_json_string)

        # 3. Dump back to JSON for Redis and the response
        cache_payload_bytes = final_model.model_dump_json()

        await redis_client.set(
            redis_config.DRAP_CACHE_KEY,
            cache_payload_bytes,
            ex=redis_config.VERY_LONG_TTL,  # Or whatever your DRAP TTL is
        )

        if debug:
            return timing_debug_response(t_start, t_query_start, t_query_end)

        response = Response(content=cache_payload_bytes, media_type="application/json")
        add_timing_headers(response, t_start, t_query_start, t_query_end)
        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.get("/api/v2/{events}/latest", response_model=EventsResponseV2)
async def latest_events(
    conn: asyncpg.Connection = Depends(get_db_connection),
    events: EventType = Path(
        ..., description="Event type: drap, geoelectric, or aurora"
    ),
    debug: bool = Query(False),
):
    t_start = time.perf_counter()
    # redis_client = redis_config.get_redis_client()
    try:
        t_query_start = time.perf_counter()
        # cached_event = await redis_client.get(redis_config.DRAP_CACHE_KEY)
        t_query_end = time.perf_counter()

        # if cached_event:
        #     if debug:
        #         return timing_debug_response(t_start, t_query_start, t_query_end)

        #     response = Response(content=cached_event, media_type="application/json")
        #     add_timing_headers(response, t_start, t_query_start, t_query_end)
        #     return response

        table_info = event_name_info[events]

        t_query_start = time.perf_counter()
        row = await conn.fetchrow(
            LATEST_EVENT_QUERY_V2.format(
                table=table_info["table"], column=table_info["value"]
            )
        )
        t_query_end = time.perf_counter()

        if not row:
            raise HTTPException(status_code=404, detail=f"No {events} data available")

        raw_json_string = row["values"]
        final_model = EventsResponseV2.model_validate_json(raw_json_string)

        # 3. Dump back to JSON for Redis and the response
        cache_payload_bytes = final_model.model_dump_json()

        # await redis_client.set(
        #     redis_config.DRAP_CACHE_KEY,
        #     cache_payload_bytes,
        #     ex=redis_config.VERY_LONG_TTL,  # Or whatever your DRAP TTL is
        # )

        if debug:
            return timing_debug_response(t_start, t_query_start, t_query_end)

        response = Response(content=cache_payload_bytes, media_type="application/json")
        add_timing_headers(response, t_start, t_query_start, t_query_end)
        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.get("/api/v1/kp-index", response_model=List[KpIndexResponse])
async def kp_index(
    response: Response,
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
    return await fetch_time_series(
        response=response,
        conn=conn,
        query=KP_INDEX_RANGE_QUERY,
        start=start,
        end=end,
        debug=debug,
        default_hours=3,
        error_message="Error fetching Kp index",
    )


@app.get("/api/v1/xray", response_model=List[XRayResponse])
async def xray_flux(
    response: Response,
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
    return await fetch_time_series(
        response=response,
        conn=conn,
        query=XRAY_FLUX_RANGE_QUERY,
        start=start,
        end=end,
        debug=debug,
        default_hours=3,
        error_message="Error fetching Kp index",
    )


@app.get("/api/v1/proton-flux", response_model=List[ProtonFluxResponse])
async def proton_flux(
    response: Response,
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
    return await fetch_time_series(
        response=response,
        conn=conn,
        query=PROTON_FLUX_RANGE_QUERY,
        start=start,
        end=end,
        debug=debug,
        default_hours=3,
        error_message="Error fetching proton flux",
    )


@app.get("/api/v1/aurora", response_model=AuroraResponse)
async def aurora(
    response: Response,
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
        row = await conn.fetchrow(AURORA_QUERY)
        t_query_end = time.perf_counter()

        if not row:
            raise HTTPException(status_code=404, detail="No aurora data available")

        aurora_data = dict(row)
        aurora_data["points"] = points_adapter.validate_json(aurora_data["points"])

        if debug:
            return timing_debug_response(t_start, t_query_start, t_query_end)

        add_timing_headers(response, t_start, t_query_start, t_query_end)
        return aurora_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.get("/api/v1/alert", response_model=List[AlertResponse])
async def get_alerts(
    response: Response,
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
            return timing_debug_response(t_start, t_query_start, t_query_end)

        add_timing_headers(response, t_start, t_query_start, t_query_end)
        return [dict(row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/geoelectric/latest", response_model=GeoelectricResponse)
async def latest_geoelectric(
    response: Response,
    conn: asyncpg.Connection = Depends(get_db_connection),
    debug: bool = Query(False),
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
            return timing_debug_response(t_start, t_query_start, t_query_end)

        add_timing_headers(response, t_start, t_query_start, t_query_end)
        return geoelectric_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.get("/api/v1/kermit", response_model=List[SnapshotResponse])
async def range_data_retrieve(
    response: Response,
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
    t_start = time.perf_counter()
    start_utc, end_utc = _resolve_time_window(start, end, default_hours=2)
    start_utc = start_utc.replace(second=0, microsecond=0)
    end_utc = end_utc.replace(second=0, microsecond=0)
    query = query_dict[event]

    t_query_start = time.perf_counter()
    rows = await conn.fetch(query, start_utc, end_utc, interval)
    t_query_end = time.perf_counter()

    if not rows:
        raise HTTPException(
            status_code=404, detail=f"No {event} data available for the given range"
        )

    result = []
    for row in rows:
        row_dict = dict(row)
        raw_points = row_dict.get("points")
        row_dict["points"] = (
            points_adapter.validate_json(raw_points) if raw_points is not None else None
        )
        result.append(SnapshotResponse.model_validate(row_dict))

    add_timing_headers(response, t_start, t_query_start, t_query_end)
    return result


@app.get("/api/v2/kermit", response_model=List[SnapshotResponseV2])
async def range_data_values_retrieve(
    response: Response,
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
    t_start = time.perf_counter()
    start_utc, end_utc = _resolve_time_window(start, end, default_hours=2)
    start_utc = start_utc.replace(second=0, microsecond=0)
    end_utc = end_utc.replace(second=0, microsecond=0)
    query = query_dict_v2[event]

    t_query_start = time.perf_counter()
    rows = await conn.fetch(query, start_utc, end_utc, interval)
    t_query_end = time.perf_counter()

    if not rows:
        raise HTTPException(
            status_code=404, detail=f"No {event} data available for the given range"
        )

    result = []
    for row in rows:
        row_dict = dict(row)
        raw_points = row_dict.get("points")
        row_dict["points"] = json.loads(raw_points) if raw_points is not None else None
        result.append(SnapshotResponseV2.model_validate(row_dict))

    add_timing_headers(response, t_start, t_query_start, t_query_end)
    return result


@app.get("/api/v2/location", response_model=LocationData)
async def retrieve_events_locations(
    response: Response, conn: asyncpg.Connection = Depends(get_db_connection)
):
    t_start = time.perf_counter()
    t_query_start = time.perf_counter()
    rows = await conn.fetch(LOCATION_QUERY)
    t_query_end = time.perf_counter()

    if not rows:
        raise HTTPException(status_code=404, detail="No location data available")

    event_name_map = {
        "drap_region": "drap",
        "aurora_forecast": "aurora",
        "geoelectric_field": "geoelectric",
    }
    result = {}
    for row in rows:
        row_dict = dict(row)
        key = event_name_map.get(row_dict["events"], row_dict["events"])
        result[key] = row_dict["locations"]

    add_timing_headers(response, t_start, t_query_start, t_query_end)

    return LocationData(**result)


@app.get("/api/kermit")
def get_image():
    return FileResponse("/app/images/evil-laugh-kermit.gif", media_type="image/gif")


# --- Helper Function ---


async def fetch_time_series(
    response: Response,
    conn: asyncpg.Connection,
    query: str,
    start: datetime | None,
    end: datetime | None,
    debug: bool,
    default_hours: int = 3,
    error_message: str = "Database error",
):
    t_start = time.perf_counter()

    try:
        start_utc, end_utc = _resolve_time_window(
            start, end, default_hours=default_hours
        )

        t_query_start = time.perf_counter()
        rows = await conn.fetch(query, start_utc, end_utc)
        t_query_end = time.perf_counter()

        if debug:
            return timing_debug_response(t_start, t_query_start, t_query_end)

        add_timing_headers(response, t_start, t_query_start, t_query_end)

        return [dict(row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        logger.error("%s: %s", error_message, str(e))
        raise HTTPException(status_code=500, detail=f"{error_message}: {str(e)}")


def add_timing_headers(
    response: Response,
    t_start: float,
    t_query_start: float,
    t_query_end: float,
    finish: float | None = None,
) -> None:
    if finish is None:
        finish = time.perf_counter()
    response.headers["X-Query-Time"] = f"{t_query_end - t_query_start:.6f}"
    response.headers["X-Handler-Time"] = f"{finish - t_start:.6f}"


def timing_debug_response(
    t_start: float,
    t_query_start: float,
    t_query_end: float,
    finish: float | None = None,
) -> JSONResponse:
    if finish is None:
        finish = time.perf_counter()
    response = JSONResponse(
        content=TimeTestingData(
            start=t_start,
            query_start=t_query_start,
            query_end=t_query_end,
            finish=finish,
        ).result()
    )
    add_timing_headers(
        response,
        t_start=t_start,
        t_query_start=t_query_start,
        t_query_end=t_query_end,
        finish=finish,
    )
    return response
