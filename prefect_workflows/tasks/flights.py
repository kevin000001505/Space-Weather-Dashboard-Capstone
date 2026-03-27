"""Flight data ingestion and maintenance tasks."""

import json
import redis.asyncio as redis
import pandas as pd
from datetime import datetime, timedelta, timezone
from asyncpg import Connection
from prefect import task
from prefect.cache_policies import NO_CACHE
from shared.logger import get_logger
from prefect.variables import Variable
from pyopensky.rest import REST
from tasks.models import FlightStateRecord
from database.queries import (
    CLEANUP_OLD_FLIGHT_DATA_QUERY,
    CREATE_PARTITION_IF_MISSING_QUERY,
    FLIGHT_STATES_STAGING_DDL,
    FLIGHT_STATES_STAGING_COLUMNS,
    FLIGHT_STATES_TRANSFORM_SQL,
    ACTIVATE_FLIGHT_STAGING_DDL,
    ACTIVATE_FLIGHT_STAGING_COLUMNS,
    ACTIVATE_FLIGHT_TRANSFORM_SQL,
    ACTIVATE_FLIGHT_STATES_QUERY,
)
# Pull from the shared volume
from shared.redis import (
    get_redis_client,
    FLIGHTS_CACHE_KEY,
    FLIGHTS_CHANNEL,
    DEFAULT_TTL
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


@task(name="Insert Flight States", cache_policy=NO_CACHE)
async def insert_batch(records: list[FlightStateRecord], conn: Connection) -> None:
    """Insert flight records into both tables using COPY + server-side transform."""
    logger = get_logger(__name__)
    logger.info(f"Inserting {len(records)} records.")

    tuples = [r.to_tuple() for r in records]  # convert once, not per batch

    await conn.execute(CREATE_PARTITION_IF_MISSING_QUERY, records[0].time)

    try:
        async with conn.transaction():
            # flight_states
            await conn.execute(FLIGHT_STATES_STAGING_DDL)
            await conn.copy_records_to_table(
                "flight_states_staging",
                records=tuples,
                columns=FLIGHT_STATES_STAGING_COLUMNS,
            )
            await conn.execute(FLIGHT_STATES_TRANSFORM_SQL)

            # activate_flight
            await conn.execute(ACTIVATE_FLIGHT_STAGING_DDL)
            await conn.copy_records_to_table(
                "activate_flight_staging",
                records=tuples,
                columns=ACTIVATE_FLIGHT_STAGING_COLUMNS,
            )
            await conn.execute(ACTIVATE_FLIGHT_TRANSFORM_SQL)

        logger.info(f"Finished inserting {len(records)} records.")

    except TimeoutError:
        logger.warning("Transaction timed out, lock released via rollback.")
    except Exception as e:
        logger.error(f"Insert failed: {e}")
        raise



@task(name="Broadcast Active Flights to Redis", cache_policy=NO_CACHE, retries=3)
async def broadcast_active_flights_to_redis(conn: Connection) -> None:
    """Pull the latest active flights state from Postgres and push to Redis."""
    logger = get_logger(__name__)

    # Fetch the true, calculated state from the database
    rows = await conn.fetch(ACTIVATE_FLIGHT_STATES_QUERY)
        
    # Format it for the frontend
    flights_data = []
    for r in rows:
        flights_data.append({
            "icao24": r["icao24"],
            "callsign": r["callsign"],
            "lat": r["lat"],
            "lon": r["lon"],
            "geo_altitude": r["geo_altitude"],
            "velocity": r["velocity"],
            "heading": r["heading"],
            "on_ground": r["on_ground"]
        })
        
    payload = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(flights_data),
        "flights": flights_data
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


@task(name="Cleanup Old Flight Data", cache_policy=NO_CACHE)
async def cleanup_db(conn: Connection) -> None:
    """Clean up old flight state records based on retention policy."""
    logger = get_logger(__name__)

    retention_days = await Variable[int].aget("flight_data_retention_days", default=30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    res = await conn.execute(CLEANUP_OLD_FLIGHT_DATA_QUERY, cutoff)
    logger.info(f"Cleaned old data: {res}")
