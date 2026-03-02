from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import ORJSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from utils.db_tools import get_connection, get_pool, close_all_connections
from database.queries import (
    ACTIVATE_FLIGHT_STATES_QUERY,
    AIRPORTS_LATEST_QUERY,
    FLIGHT_PATH_QUERY,
    LATEST_DRAP_QUERY,
    LATEST_FLIGHT_STATES_QUERY,
)
from config import (
    FlightState,
    FlightStatesResponse,
    DRAPResponse,
    FlightPathResponse,
    ActivateFlightState,
    Airport,
    AirportsResponse,
)
import logging
import json
from contextlib import asynccontextmanager
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):

    await get_pool()
    logger.info("Database connection pool initialized")
    yield

    await close_all_connections()
    logger.info("Database connection pool closed")


app = FastAPI(
    title="Space Weather API",
    description="API for accessing space weather data and flight information",
    version="1.0.0",
    lifespan=lifespan,
    default_response_class=ORJSONResponse,
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


@app.get("/api/v1/airports/latest", response_model=AirportsResponse)
async def get_latest_airports(limit: int = Query(None, ge=1, le=5000)):
    async with get_connection() as conn:
        try:
            rows = await conn.fetch(AIRPORTS_LATEST_QUERY)
            if not rows:
                raise HTTPException(status_code=404, detail="No airport data available")

            airports = []
            for row in rows:
                if limit and len(airports) >= limit:
                    break
                airports.append(
                    Airport(
                        name=row["name"],
                        iata_code=row["iata_code"],
                        gps_code=row["gps_code"],
                        municipality=row["municipality"],
                        country=row["iso_country"],
                        elevation_ft=row["elevation_ft"],
                        lat=round(row["latitude_deg"], 3),
                        lon=round(row["longitude_deg"], 3),
                    )
                )

            return AirportsResponse(airports=airports)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching latest airports: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/flight-path/{icao24}", response_model=FlightPathResponse)
async def get_flight_path(icao24: str):
    async with get_connection() as conn:
        try:
            rows = await conn.fetch(FLIGHT_PATH_QUERY, icao24)
            if not rows:
                raise HTTPException(status_code=404, detail="No flight data available")

            row = rows[0]
            path_geojson = row["path_geojson"]
            if isinstance(path_geojson, str):
                path_geojson = json.loads(path_geojson)

            return FlightPathResponse(
                icao24=row["icao24"],
                callsign=row["callsign"],
                path_geojson=path_geojson,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching flight path for {icao24}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/v1/active-flight-states/latest", response_model=FlightStatesResponse)
async def get_activate_flight_states(limit: int = Query(None, ge=1, le=1000)):
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


@app.get("/api/v1/flight-states/latest", response_model=FlightStatesResponse)
async def get_latest_flight_states(limit: int = Query(None, ge=1, le=1000)):
    """
    Retrieve all flight states from the most recent timestamp.
    Uses optimized query with subquery for better performance.

    - **limit**: Optional parameter to limit results (e.g., ?limit=50 returns 50 records)
    """
    start_time = time.time()

    async with get_connection() as conn:
        try:
            query_start = time.time()

            # Optimized single query: get max time and filter in one go
            rows = await conn.fetch(LATEST_FLIGHT_STATES_QUERY)

            query_time_ms = (time.time() - query_start) * 1000

            if not rows:
                raise HTTPException(status_code=404, detail="No flight data available")

            latest_time = rows[0]["time"]

            flights = []
            for row in rows:
                if limit and len(flights) >= limit:
                    break
                flights.append(
                    FlightState(
                        icao24=row["icao24"],
                        callsign=row["callsign"],
                        time=row["time"].isoformat(),
                        time_pos=(
                            row["time_pos"].isoformat() if row["time_pos"] else None
                        ),
                        lat=row["lat"],
                        lon=row["lon"],
                        baro_altitude=row["baro_altitude"],
                        geo_altitude=row["geo_altitude"],
                        velocity=row["velocity"],
                        heading=row["heading"],
                        vert_rate=row["vert_rate"],
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
                timestamp=latest_time.isoformat(),
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
