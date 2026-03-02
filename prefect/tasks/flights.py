"""Flight data ingestion and maintenance tasks."""

import pandas as pd
from datetime import datetime, timedelta, timezone
from database.db_tools import get_connection
from prefect import task, get_run_logger
from prefect.variables import Variable
from pyopensky.rest import REST
from tasks.models import FlightStateRecord
from tasks.queries import (
    FLIGHT_STATES_INSERT_QUERY,
    ACTIVATE_FLIGHT_UPSERT_QUERY,
    CLEANUP_OLD_FLIGHT_DATA_QUERY,
    CREATE_PARTITION_IF_MISSING_QUERY,
)


BATCH_SIZE = 500


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


def clean_records(df):
    """
    Clean and validate flight records from DataFrame.

    Args:
        df: DataFrame with flight data

    Returns:
        List of cleaned tuples, or empty list if no valid records
    """
    if df.empty:
        return []

    records = []
    for _, row in df.iterrows():
        try:
            record = clean_row(row)
            records.append(record)
        except Exception:
            get_run_logger().warning(f"Failed to clean row: {row}")
            continue

    return records


@task(retries=3, retry_delay_seconds=10, name="Fetch Flights from OpenSky")
def fetch_flights():
    """
    Sync task running pyopensky.
    """
    logger = get_run_logger()
    try:
        rest = REST()
        df = rest.states(own=False)
        logger.info(f"Fetched {len(df)} aircraft.")
        return df
    except Exception as e:
        logger.error(f"pyopensky failed: {e}")
        raise


@task(name="Insert Flight States Batch")
async def insert_batch(records, batch_size: int = BATCH_SIZE):
    """Insert flight records into both tables in chunked transactions to avoid timeouts."""
    logger = get_run_logger()
    logger.info(f"Inserting {len(records)} records in batches of {batch_size}.")

    async with get_connection() as conn:
        first_ts = records[0].time
        await conn.execute(CREATE_PARTITION_IF_MISSING_QUERY, first_ts)

        total = 0
        for i in range(0, len(records), batch_size):
            chunk = records[i : i + batch_size]
            tuples = [r.to_tuple() for r in chunk]

            async with conn.transaction():
                await conn.executemany(FLIGHT_STATES_INSERT_QUERY, tuples)
                await conn.executemany(ACTIVATE_FLIGHT_UPSERT_QUERY, tuples)

            total += len(chunk)
            logger.info(
                f"Batch {i // batch_size + 1}: inserted {total}/{len(records)} records"
            )

        logger.info(f"Finished inserting {total} records.")


@task(name="Cleanup Old Flight Data")
async def cleanup_db():
    """Clean up old flight state records based on retention policy."""
    logger = get_run_logger()

    retention_days = await Variable[int].aget("flight_data_retention_days", default=30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    async with get_connection() as conn:
        res = await conn.execute(CLEANUP_OLD_FLIGHT_DATA_QUERY, cutoff)
        logger.info(f"Cleaned old data: {res}")
