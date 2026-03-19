import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from shared.db_utils import get_connection, get_pool, close_all_connections
from database.queries import (
    ACTIVATE_FLIGHT_STATES_QUERY,
    ALERT_QUERY,
    AIRPORTS_LATEST_QUERY,
    AIRPORT_QUERY,
    AURORA_QUERY,
    FLIGHT_PATH_QUERY,
    KP_INDEX_RANGE_QUERY,
    LATEST_DRAP_QUERY,
    XRAY_FLUX_RANGE_QUERY,
    PROTON_FLUX_RANGE_QUERY,
)
from config import (
    AuroraResponse,
    FlightStatesResponse,
    DRAPResponse,
    FlightPathResponse,
    ActivateFlightState,
    Airport,
    AirportsResponse,
    AirportDetailResponse,
    KpIndexResponse,
    KpIndexListResponse,
    XRayResponse,
    XRayListResponse,
    ProtonFluxResponse,
    ProtonFluxListResponse,
    AlertResponse,
    AlertListResponse,
)
import shared.redis as redis_config # Pull from the shared volume
import logging, json, time
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00:00Z")

def _iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:00:00Z")

def _normalize_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _resolve_time_window(
    start: Optional[datetime],
    end: Optional[datetime],
    min_time: Optional[int] = 1,
    default_days: int = 3,
) -> tuple[datetime, datetime]:

    now = datetime.now(timezone.utc)  

    if start is None:
        if end is None:
            # Default: last 3 days to now
            return now - timedelta(days=default_days), now
        
        else:
            # Only end provided: 3 days before end → end
            end_utc = _normalize_utc(end)
            return end_utc - timedelta(days=default_days), end_utc
    
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

    if min_time and (end_utc - start_utc).total_seconds() < 3600 * min_time:
        raise HTTPException(
            status_code=422,
            detail=f"Minimum time range is {min_time} hour.",
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

    pool = await get_pool()
    logger.info("Database connection pool initialized")

    # Warm up the pool
    async with pool.acquire() as conn:
        await conn.execute("SELECT 1")
    heartbeat_task = asyncio.create_task(redis_heartbeat_loop())

    yield

    heartbeat_task.cancel()
    await close_all_connections()
    logger.info("Database connection pool closed")


app = FastAPI(
    title="Space Weather API",
    description="API for accessing space weather data and flight information",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
                        latest_data = await redis_client.get(redis_config.FLIGHTS_CACHE_KEY)
                        if latest_data:
                            yield f"event: planes\ndata: {latest_data}\n\n"
                    
                    case redis_config.AURORA_CHANNEL:
                        latest_aurora = await redis_client.get(redis_config.AURORA_CACHE_KEY)
                        if latest_aurora:
                            yield f"event: aurora\ndata: {latest_aurora}\n\n"

                    case redis_config.DRAP_CHANNEL:
                        latest_drap = await redis_client.get(redis_config.DRAP_CACHE_KEY)
                        if latest_drap:
                            yield f"event: drap\ndata: {latest_drap}\n\n"
                            
                    case redis_config.XRAY_CHANNEL:
                        latest_xray = await redis_client.get(redis_config.XRAY_CACHE_KEY)
                        if latest_xray:
                            yield f"event: xray\ndata: {latest_xray}\n\n"
                            
                    case redis_config.PROTONFLUX_CHANNEL:
                        latest_protonflux = await redis_client.get(redis_config.PROTONFLUX_CACHE_KEY)
                        if latest_protonflux:
                            yield f"event: protonflux\ndata: {latest_protonflux}\n\n"
                            
                    case redis_config.KPINDEX_CHANNEL:
                        latest_kpindex = await redis_client.get(redis_config.KPINDEX_CACHE_KEY)
                        if latest_kpindex:
                            yield f"event: kpindex\ndata: {latest_kpindex}\n\n"
                            
                    case redis_config.ALERTS_CHANNEL:
                        latest_alerts = await redis_client.get(redis_config.ALERTS_CACHE_KEY)
                        if latest_alerts:
                            yield f"event: alerts\ndata: {latest_alerts}\n\n"
                    
                    case redis_config.GEOELECTRIC_CHANNEL:
                        latest_geoelectric = await redis_client.get(redis_config.GEOELECTRIC_CACHE_KEY)
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
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/v1/airports", response_model=AirportsResponse)
async def get_latest_airports(limit: int = Query(None, ge=1, le=200000)):
    redis_client = redis_config.get_redis_client()
    try:
        # 1. Attempt to grab the full dataset from Redis RAM
        cached_airports = await redis_client.get(redis_config.AIRPORTS_CACHE_KEY)
        
        if cached_airports:
            # CACHE HIT: Parse the JSON string back into a Python list of dicts
            airports_data = json.loads(cached_airports)
            
            # Slice the array if the user provided a limit
            if limit:
                airports_data = airports_data[:limit]
                
            return AirportsResponse(airports=airports_data)
        
        # 2. CACHE MISS: Query PostgreSQL
        async with get_connection() as conn:
            rows = await conn.fetch(AIRPORTS_LATEST_QUERY)
            if not rows:
                raise HTTPException(status_code=404, detail="No airport data available")

            airports = []
            for row in rows:
                airports.append(
                    Airport(
                        ident=row["ident"],
                        name=row["name"],
                        iata_code=row["iata_code"],
                        gps_code=row["gps_code"],
                        type=row["type"],
                        municipality=row["municipality"],
                        country=row["iso_country"],
                        elevation_ft=row["elevation_ft"],
                        lat=round(row["latitude_deg"], 3),
                        lon=round(row["longitude_deg"], 3),
                    )
                )

            cache_payload = [airport.model_dump() for airport in airports]
            
            await redis_client.set(
                redis_config.AIRPORTS_CACHE_KEY, 
                json.dumps(cache_payload), 
                ex=redis_config.VERY_LONG_TTL
            )

            if limit:
                return AirportsResponse(airports=airports[:limit])

            return AirportsResponse(airports=airports)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest airports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        # Crucial: Always close the connection back to the pool
        await redis_client.aclose()


@app.get("/api/v1/airport/{ident}", response_model=AirportDetailResponse)
async def get_airport_details(ident: str):
    async with get_connection() as conn:
        try:
            # Using ident.upper() ensures we match the uppercase data in the DB
            row = await conn.fetchrow(AIRPORT_QUERY, ident.upper())
            
            if not row:
                raise HTTPException(status_code=404, detail=f"Airport {ident} not found")

            # Convert the asyncpg Record into a mutable dictionary
            airport_data = dict(row)

            # Parse the JSONB strings back into native Python objects
            json_fields = ['geom', 'runways', 'frequencies', 'navaids', 'comments']
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
async def get_flight_path(icao24: str):
    async with get_connection() as conn:
        try:
            rows = await conn.fetch(FLIGHT_PATH_QUERY, icao24)
            if not rows:
                raise HTTPException(status_code=404, detail="No flight data available")

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


@app.get("/api/v1/active-flight-states/latest", response_model=FlightStatesResponse)
async def get_activate_flight_states(limit: int = Query(None, ge=1, le=20000)):
    """
    Retrieve all flight states from the most recent timestamp in activate_flight table.

    - **limit**: Optional parameter to limit results (e.g., ?limit=50 returns 50 records)
    """
    start_time = time.time()

    async with get_connection() as conn:
        try:
            query_start = time.time()

            rows = await conn.fetch(ACTIVATE_FLIGHT_STATES_QUERY)

            query_time_ms = (time.time() - query_start) * 1000

            if not rows:
                raise HTTPException(status_code=404, detail="No flight data available")

            flights = []
            for row in rows:
                if limit and len(flights) >= limit:
                    break
                flights.append(
                    ActivateFlightState(
                        icao24=row["icao24"],
                        callsign=row["callsign"],
                        lat=row["lat"],
                        lon=row["lon"],
                        geo_altitude=row.get("geo_altitude"),
                        velocity=row.get("velocity"),
                        heading=row.get("heading"),
                        on_ground=(
                            row["on_ground"] if row["on_ground"] is not None else False
                        ),
                    )
                )

            total_time_ms = (time.time() - start_time) * 1000

            logger.info(
                f"Retrieved {len(flights)} flights - Query: {query_time_ms:.2f}ms, Total: {total_time_ms:.2f}ms"
            )

            return FlightStatesResponse(
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                count=len(flights),
                flights=flights,
                query_time_ms=round(query_time_ms, 2),
                total_time_ms=round(total_time_ms, 2),
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching flight states: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/drap/latest", response_model=DRAPResponse)
async def latest_drap():
    start_time = time.time()

    try:
        query_start = time.time()

        async with get_connection() as conn:
            payload = await conn.fetchval(LATEST_DRAP_QUERY)

        query_time_ms = (time.time() - query_start) * 1000

        if isinstance(payload, str):
            payload = json.loads(payload)

        if (
            not payload
            or payload.get("count", 0) == 0
            or payload.get("timestamp") is None
        ):
            raise HTTPException(status_code=404, detail="No D-RAP data available")

        total_time_ms = (time.time() - start_time) * 1000
        payload["query_time_ms"] = round(query_time_ms, 2)
        payload["total_time_ms"] = round(total_time_ms, 2)

        return payload

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.get("/api/v1/kp-index", response_model=KpIndexListResponse)
async def kp_index(
    start: Optional[datetime] = Query(
        default=None,
        description="Start of time range (ISO 8601 UTC). Defaults to 3 days before end.",
        openapi_examples={
            "3_day_ago": {"summary": "3-day ago", "value": _iso_days_ago(3)},
            "7_day_ago": {"summary": "7-day ago", "value": _iso_days_ago(7)},
        },
    ),
    end: Optional[datetime] = Query(
        default=None,
        description="End of time range (ISO 8601 UTC). Defaults to now.",
        openapi_examples={
            "now": {"summary": "Current time", "value": _iso_now()},
        },
    ),
):
    """
    Retrieve Kp index data for either:
    1) A custom start/end time range.

    - **start** and **end**: Optional custom range (both required together, minimum span: 1 hour)
    """
    try:
        start_utc, end_utc = _resolve_time_window(start, end, 3)

        async with get_connection() as conn:
            rows = await conn.fetch(KP_INDEX_RANGE_QUERY, start_utc, end_utc)

        if not rows:
            raise HTTPException(status_code=404, detail="No Kp index data available")

        indices = []
        for row in rows:
            indices.append(
                KpIndexResponse(
                    time_tag=row["time_tag"],
                    kp=row["kp"],
                    a_running=row.get("a_running"),
                    station_count=row.get("station_count"),
                )
            )

        return KpIndexListResponse(indices=indices)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest Kp index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/xray", response_model=XRayListResponse)
async def xray_flux(
    start: Optional[datetime] = Query(
        default=None,
        description="Start of time range (ISO 8601 UTC). Defaults to 3 days before end.",
        openapi_examples={
            "3_day_ago": {"summary": "3-day ago", "value": _iso_days_ago(3)},
            "7_day_ago": {"summary": "7-day ago", "value": _iso_days_ago(7)},
        },
    ),
    end: Optional[datetime] = Query(
        default=None,
        description="End of time range (ISO 8601 UTC). Defaults to now.",
        openapi_examples={
            "now": {"summary": "Current time", "value": _iso_now()},
        },
    ),
):
    """
    Retrieve the latest X-ray flux data from the past specified hours.

    - **start** and **end**: Optional custom range (both required together, minimum span: 1 hour)
    """
    try:
        start_utc, end_utc = _resolve_time_window(start, end)

        async with get_connection() as conn:
            rows = await conn.fetch(XRAY_FLUX_RANGE_QUERY, start_utc, end_utc)

        if not rows:
            raise HTTPException(status_code=404, detail="No X-ray flux data available")

        xray_fluxes = []
        for row in rows:
            xray_fluxes.append(
                XRayResponse(
                    time_tag=row["time_tag"],
                    satellite=row["satellite"],
                    flux=row["flux"],
                    observed_flux=row["observed_flux"],
                    electron_correction=row["electron_correction"],
                    electron_contamination=row["electron_contamination"],
                    energy=row["energy"],
                )
            )

        return XRayListResponse(xray_fluxes=xray_fluxes)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest X-ray flux: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/proton-flux", response_model=ProtonFluxListResponse)
async def proton_flux(
    start: Optional[datetime] = Query(
        default=None,
        description="Start of time range (ISO 8601 UTC). Defaults to 3 days before end.",
        openapi_examples={
            "3_day_ago": {"summary": "3-day ago", "value": _iso_days_ago(3)},
            "7_day_ago": {"summary": "7-day ago", "value": _iso_days_ago(7)},
        },
    ),
    end: Optional[datetime] = Query(
        default=None,
        description="End of time range (ISO 8601 UTC). Defaults to now.",
        openapi_examples={
            "now": {"summary": "Current time", "value": _iso_now()},
        },
    ),
):
    """
    Retrieve proton flux data from the past specified hours.

    - **start** and **end**: Optional custom range (both required together, minimum span: 1 hour)
    """
    try:
        start_utc, end_utc = _resolve_time_window(start, end)
        async with get_connection() as conn:
            rows = await conn.fetch(PROTON_FLUX_RANGE_QUERY, start_utc, end_utc)

        if not rows:
            raise HTTPException(status_code=404, detail="No proton flux data available")

        data = []
        for row in rows:
            data.append(
                ProtonFluxResponse(
                    time_tag=row["time_tag"],
                    satellite=row["satellite"],
                    flux_10_mev=row.get("flux_10_mev"),
                    flux_50_mev=row.get("flux_50_mev"),
                    flux_100_mev=row.get("flux_100_mev"),
                    flux_500_mev=row.get("flux_500_mev"),
                )
            )

        return ProtonFluxListResponse(data=data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching proton flux: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/aurora", response_model=AuroraResponse)
async def aurora(
    utc_time: Optional[str] = Query(
        default=None,
        description="Observation time in ISO 8601 UTC format (required).",
        openapi_examples={
            "recent": {"summary": "Recent observation", "value": _iso_now()},
            "earlier": {"summary": "Earlier observation", "value": _iso_days_ago(1)},
        },
    ),
):
    """Retrieve aurora forecast data.

    - With **utc_time** (ISO 8601 UTC): returns data for that observation time.
    """
    start_time = time.time()

    try:
        query_start = time.time()
        # Option A: No time provided? Grab from Redis
        if not utc_time:
            redis_client = redis_config.get_redis_client()
            cached_data = await redis_client.get(redis_config.AURORA_CACHE_KEY)
            await redis_client.aclose()
            
            if cached_data:
                raw_data = json.loads(cached_data)
                query_time_ms = (time.time() - query_start) * 1000
                payload = {
                    "observation_time": raw_data.get("Observation Time"),
                    "forecast_time": raw_data.get("Forecast Time"),
                    "count": len(raw_data.get("coordinates", [])),
                    "coordinates": raw_data.get("coordinates", []),
                    "query_time_ms": round(query_time_ms, 2),
                    "total_time_ms": round(query_time_ms, 2),
                }
                return payload

        # Option B: Historical time provided (or Redis was empty). Hit Postgres.
        async with get_connection() as conn:
            if utc_time:
                try:
                    obs_time = datetime.fromisoformat(utc_time.replace("Z", "+00:00")).astimezone(timezone.utc)
                except ValueError:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Invalid UTC time format: '{utc_time}'. Use ISO 8601, e.g. 2026-03-13T06:17:00Z",
                    )

                payload = await conn.fetchval(AURORA_QUERY, obs_time)
            else:
                # Default to latest if no time provided
                payload = await conn.fetchval(AURORA_QUERY, None)

        query_time_ms = (time.time() - query_start) * 1000

        if isinstance(payload, str):
            payload = json.loads(payload)

        if not payload or payload.get("count", 0) == 0:
            if utc_time:
                raise HTTPException(status_code=404, detail=f"No aurora forecast data for {utc_time}")
            raise HTTPException(status_code=404, detail="No aurora forecast data available")

        total_time_ms = (time.time() - start_time) * 1000
        payload["query_time_ms"] = round(query_time_ms, 2)
        payload["total_time_ms"] = round(total_time_ms, 2)
        return payload

    except HTTPException:
        raise
    except Exception as e:
        if utc_time:
            logger.error(f"Error fetching aurora forecast for {utc_time}: {str(e)}")
        else:
            logger.error(f"Error fetching latest aurora forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/alert", response_model=AlertListResponse)
async def get_alerts(days: int = Query(default=1, ge=1, le=30)):
    """Retrieve alert records with only time and message.

    - **days**: Number of days to include ending today (default: 1, today only)
    """
    try:
        async with get_connection() as conn:
            rows = await conn.fetch(ALERT_QUERY, days)
        return AlertListResponse(data=[
            AlertResponse(
                time=row["issue_datetime"],
                message=row["alert_messages"],
            ) for row in rows
        ])
    except Exception as e:
        logger.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
