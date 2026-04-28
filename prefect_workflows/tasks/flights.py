"""Flight data ingestion and maintenance tasks."""

import json
import pandas as pd
from datetime import datetime, timezone
from asyncpg import Connection
from prefect import task
from prefect.cache_policies import NO_CACHE
from shared.logger import get_logger
from pyopensky.rest import REST
from tasks.models import FlightStateRecord
from database.queries import (
    FLIGHT_DRAP_EVENTS,
    FLIGHT_DRAP_EVENTS_ALERT,
    FLIGHT_STAGING_DDL,
    FLIGHT_STAGING_COLUMNS,
    FLIGHT_STAGING_GEOM_SQL,
    FLIGHT_STATES_TRANSFORM_SQL,
    ACTIVATE_FLIGHT_TRANSFORM_SQL,
    ACTIVATE_FLIGHT_STATES_QUERY,
)

# Pull from the shared volume
from shared.redis import (
    get_redis_client,
    FLIGHTS_CACHE_KEY,
    FLIGHTS_CHANNEL,
    FLIGHT_DRAP_ALERTS_CACHE_KEY,
    FLIGHT_DRAP_ALERTS_CHANNEL,
    FLIGHT_DRAP_ABSORPTION_THRESHOLD_KEY,
    DEFAULT_ABSORPTION_THRESHOLD,
    DEFAULT_TTL,
)


def clean_row(row) -> FlightStateRecord:
    """
    Maps OpenSky Arrow-backed DataFrame row -> Native Python Tuple for AsyncPG.
    AsyncPG requires native Python types (datetime, float, str), not Arrow/Numpy types.
    """

    def get_val(key, type_cast=None):
        val = row.get(key)

        if pd.isna(val) or val is None or val == "":
            return None

        try:
            if type_cast:
                return type_cast(val)
            return val
        except (ValueError, TypeError):
            return None

    def get_ts(key):
        val = row.get(key)
        if pd.isna(val) or val is None or val == "":
            return None
        return val.to_pydatetime()

    time_value = get_ts("timestamp")
    if time_value is None:
        raise ValueError("timestamp cannot be None")

    return FlightStateRecord(
        time=time_value,
        icao24=str(row.get("icao24")).strip(),
        callsign=get_val("callsign", str),
        origin_country=get_val("origin_country", str),
        time_position=get_ts("last_position"),
        latitude=get_val("latitude", float),
        longitude=get_val("longitude", float),
        geo_altitude=get_val("geoaltitude", float),
        baro_altitude=get_val("altitude", float),
        velocity=get_val("groundspeed", float),
        heading=get_val("track", float),
        vertical_rate=get_val("vertical_rate", float),
        on_ground=bool(row.get("onground", False)),
        squawk=get_val("squawk", str),
        spi=bool(row.get("spi", False)),
        position_source=get_val("position_source", int),
        sensors=None,
        geom_lon=get_val("longitude", float),
        geom_lat=get_val("latitude", float),
    )


def clean_records(df: pd.DataFrame) -> list[FlightStateRecord]:
    """
    Clean and validate flight records from DataFrame.

    Args:
        df: DataFrame with flight data

    Returns:
        List of cleaned tuples, or empty list if no valid records
    """
    logger = get_logger(__name__)
    if df.empty:
        return []

    records = []
    for _, row in df.iterrows():
        try:
            record = clean_row(row)
            records.append(record)
        except Exception:
            logger.warning(f"Failed to clean row: {row}")
            continue

    return records


@task(retries=3, retry_delay_seconds=10, name="Fetch Flights from OpenSky")
def fetch_flights() -> pd.DataFrame:
    """
    Sync task running pyopensky.
    """
    logger = get_logger(__name__)
    try:
        rest = REST()
        df = rest.states(own=False)
        logger.info(f"Fetched {len(df)} aircraft.")
        return df
    except Exception as e:
        logger.error(f"pyopensky failed: {e}")
        raise


@task(
    name="Stage Flight Records",
    cache_policy=NO_CACHE,
    retries=2,
    retry_delay_seconds=5,
)
async def stage_flight_records(
    records: list[FlightStateRecord], conn: Connection
) -> int:
    """Create the unified flight_staging temp table and bulk-load records via COPY."""
    logger = get_logger(__name__)
    tuples = [r.to_tuple() for r in records]

    async with conn.transaction():
        # Reset to a clean staging table for this run (PRESERVE ROWS keeps it
        # alive across the downstream tasks' transactions on this connection).
        await conn.execute("DROP TABLE IF EXISTS flight_staging")
        await conn.execute(FLIGHT_STAGING_DDL)
        await conn.copy_records_to_table(
            "flight_staging",
            records=tuples,
            columns=FLIGHT_STAGING_COLUMNS,
        )
        await conn.execute(FLIGHT_STAGING_GEOM_SQL)

    logger.info(f"Staged {len(tuples)} flight records into flight_staging.")
    return len(tuples)


@task(
    name="Insert Flight States",
    cache_policy=NO_CACHE,
    retries=2,
    retry_delay_seconds=5,
)
async def insert_flight_states(conn: Connection) -> None:
    """Append staged rows to the flight_states hypertable."""
    logger = get_logger(__name__)
    async with conn.transaction():
        await conn.execute(FLIGHT_STATES_TRANSFORM_SQL)
    logger.info("flight_states transform complete.")


@task(
    name="Upsert Activate Flight",
    cache_policy=NO_CACHE,
    retries=2,
    retry_delay_seconds=5,
)
async def upsert_activate_flight(conn: Connection) -> None:
    """Upsert per-aircraft live state into activate_flight (path_points logic)."""
    logger = get_logger(__name__)
    async with conn.transaction():
        await conn.execute(ACTIVATE_FLIGHT_TRANSFORM_SQL)
    logger.info("activate_flight upsert complete.")


@task(
    name="Insert Flight DRAP Events",
    cache_policy=NO_CACHE,
    retries=2,
    retry_delay_seconds=5,
)
async def insert_flight_drap_events(conn: Connection) -> None:
    """Join staged flights with recent DRAP snapshots and append to flight_drap_events."""
    logger = get_logger(__name__)
    async with conn.transaction():
        await conn.execute(FLIGHT_DRAP_EVENTS)
    logger.info("flight_drap_events insert complete.")


@task(name="Drop Flight Staging", cache_policy=NO_CACHE)
async def drop_flight_staging(conn: Connection) -> None:
    """Tear down the staging temp table at the end of the run."""
    await conn.execute("DROP TABLE IF EXISTS flight_staging")


@task(name="Broadcast Active Flights to Redis", cache_policy=NO_CACHE, retries=3)
async def broadcast_active_flights_to_redis(conn: Connection) -> None:
    """Pull the latest active flights state from Postgres and push to Redis."""
    logger = get_logger(__name__)

    # Fetch the true, calculated state from the database
    rows = await conn.fetch(ACTIVATE_FLIGHT_STATES_QUERY)

    # Format it for the frontend
    flights_data = []
    for r in rows:
        flights_data.append(
            {
                "icao24": r["icao24"],
                "callsign": r["callsign"],
                "lat": r["lat"],
                "lon": r["lon"],
                "geo_altitude": r["geo_altitude"],
                "velocity": r["velocity"],
                "heading": r["heading"],
                "on_ground": r["on_ground"],
            }
        )

    payload = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(flights_data),
        "flights": flights_data,
    }

    # Cache and Broadcast
    try:
        client = get_redis_client()

        # ex=300 sets a 5-minute Time-To-Live so old data clears if ingestion fails
        await client.set(FLIGHTS_CACHE_KEY, json.dumps(payload), ex=DEFAULT_TTL)
        await client.publish(FLIGHTS_CHANNEL, "new_data")

        await client.aclose()
        logger.info(f"Broadcasted {len(flights_data)} post-processed flights to Redis.")

    except Exception as e:
        logger.error(f"Failed to broadcast to Redis: {e}")


@task(name="Broadcast Flight DRAP Alerts to Redis", cache_policy=NO_CACHE, retries=3)
async def broadcast_flight_drap_alerts_to_redis(conn: Connection) -> None:
    """Query flight_drap_events for recent alerts above threshold and push to Redis."""
    logger = get_logger(__name__)

    client = get_redis_client()
    raw = await client.get(FLIGHT_DRAP_ABSORPTION_THRESHOLD_KEY)
    threshold = float(raw) if raw is not None else DEFAULT_ABSORPTION_THRESHOLD

    rows = await conn.fetch(FLIGHT_DRAP_EVENTS_ALERT, threshold)
    alerts = [
        {
            "time": r["time"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "time_pos": r["time_pos"].strftime("%Y-%m-%dT%H:%M:%SZ")
            if r["time_pos"]
            else None,
            "icao24": r["icao24"],
            "callsign": r["callsign"],
            "lat": r["lat"],
            "lon": r["lon"],
            "geo_altitude": r["geo_altitude"],
            "velocity": r["velocity"],
            "heading": r["heading"],
            "vert_rate": r["vert_rate"],
            "drap_observed_at": r["drap_observed_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "absorption": r["absorption"],
        }
        for r in rows
    ]

    payload = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "threshold": threshold,
        "count": len(alerts),
        "alerts": alerts,
    }

    try:
        await client.set(
            FLIGHT_DRAP_ALERTS_CACHE_KEY, json.dumps(payload), ex=DEFAULT_TTL
        )
        await client.publish(FLIGHT_DRAP_ALERTS_CHANNEL, "new_data")
        await client.aclose()
        logger.info(
            f"Broadcasted {len(alerts)} flight DRAP alerts to Redis (threshold={threshold})."
        )
    except Exception as e:
        logger.error(f"Failed to broadcast flight DRAP alerts to Redis: {e}")
