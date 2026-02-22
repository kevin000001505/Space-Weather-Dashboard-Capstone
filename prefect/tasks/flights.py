"""Flight data ingestion and maintenance tasks."""

import pandas as pd
from datetime import datetime, timedelta, timezone
from database.db_tools import get_connection
from prefect import task, get_run_logger
from prefect.variables import Variable
from pyopensky.rest import REST
from tasks.queries import (
    FLIGHT_STATES_INSERT_QUERY,
    ACTIVATE_FLIGHT_UPSERT_QUERY,
    CLEANUP_OLD_FLIGHT_DATA_QUERY,
    CREATE_PARTITION_IF_MISSING_QUERY,
)


def clean_row(row):
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

    return (
        get_ts("timestamp"),  # time
        str(row.get("icao24")).strip(),  # icao24
        get_val("callsign", str),  # callsign
        get_val("origin_country", str),  # origin_country
        get_ts("last_position"),  # time_pos
        get_val("latitude", float),  # lat
        get_val("longitude", float),  # lon
        get_val("geoaltitude", float),  # geo_altitude
        get_val("altitude", float),  # baro_altitude
        get_val("groundspeed", float),  # velocity
        get_val("track", float),  # heading
        get_val("vertical_rate", float),  # vert_rate
        bool(row.get("onground", False)),  # on_ground
        get_val("squawk", str),  # squawk
        bool(row.get("spi", False)),  # spi
        get_val("position_source", int),  # source
        None,  # sensors
        get_val("longitude", float),  # geom_lon
        get_val("latitude", float),  # geom_lat
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

    records = [clean_row(row) for _, row in df.iterrows()]

    # Filter: timestamp and icao24 must exist
    records = [r for r in records if r[0] is not None and r[1]]

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
async def insert_batch(records):
    """Insert batch of flight records into flight_states table."""
    logger = get_run_logger()

    async with get_connection() as conn:
        first_ts = records[0][0]
        await conn.execute(CREATE_PARTITION_IF_MISSING_QUERY, first_ts)

        await conn.executemany(FLIGHT_STATES_INSERT_QUERY, records)
        logger.info(f"Inserted {len(records)} records into flight_states.")


@task(name="Insert Activate Flight Data")
async def insert_activate_flight(records):
    """Insert or update flight records in activate_flight table."""
    logger = get_run_logger()
    async with get_connection() as conn:
        await conn.executemany(ACTIVATE_FLIGHT_UPSERT_QUERY, records)
        logger.info(f"Inserted {len(records)} records into activate_flight.")


@task(name="Cleanup Old Flight Data")
async def cleanup_db():
    """Clean up old flight state records based on retention policy."""
    logger = get_run_logger()

    retention_days = await Variable[int].aget("flight_data_retention_days", default=3)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    async with get_connection() as conn:
        res = await conn.execute(CLEANUP_OLD_FLIGHT_DATA_QUERY, cutoff)
        logger.info(f"Cleaned old data: {res}")
