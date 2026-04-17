"""Database initialization and maintenance tasks."""

from shared.db_utils import ensure_table_exists
from database.create import (
    ACTIVATE_FLIGHT_CREATE_TABLE_SQL,
    AIRPORT_CREATE_TABLE_SQL,
    COUNTRIES_CREATE_TABLE_SQL,
    REGIONS_CREATE_TABLE_SQL,
    FREQUENCIES_CREATE_TABLE_SQL,
    NAVAIDS_CREATE_TABLE_SQL,
    RUNWAYS_CREATE_TABLE_SQL,
    AURORA_CREATE_TABLE_SQL,
    DRAP_CREATE_TABLE_SQL,
    FLIGHT_STATES_CREATE_TABLE_SQL,
    KP_INDEX_CREATE_TABLE_SQL,
    PROTON_FLUX_CREATE_TABLE_SQL,
    ALERT_CREATE_TABLE_SQL,
    XRAY_6HOUR_CREATE_TABLE_SQL,
    GEOELECTRIC_CREATE_TABLE_SQL,
    TRANSMISSION_LINES_CREATE_TABLE_SQL,
    READONLY_GRANTS_SQL,
    EVENTS_LOCATION_INGEST,
    EVENTS_LOCATION_CREATE_TABLE_SQL,
)
from prefect import task
from shared.logger import get_logger
from prefect.cache_policies import NO_CACHE
from asyncpg import Connection
import asyncio


@task(cache_policy=NO_CACHE)
async def initial_drap_db(conn: Connection):
    """Task to initialize the DRAP region table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring DRAP region table exists...")
        await ensure_table_exists(conn, "drap_region", create_sql=DRAP_CREATE_TABLE_SQL)
        logger.info("DRAP region table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize DRAP region table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_flight_states_db(conn: Connection):
    """Task to initialize the flight_states partitioned table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring flight_states table exists...")
        await ensure_table_exists(
            conn, "flight_states", create_sql=FLIGHT_STATES_CREATE_TABLE_SQL
        )
    except Exception as e:
        logger.error(f"Failed to initialize flight_states table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_activate_flight_db(conn: Connection):
    """Task to initialize the activate_flight table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring activate_flight table exists...")
        await ensure_table_exists(
            conn, "activate_flight", create_sql=ACTIVATE_FLIGHT_CREATE_TABLE_SQL
        )
    except Exception as e:
        logger.error(f"Failed to initialize activate_flight table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_readonly_grants(conn: Connection):
    """Task to grant readonly role access to all tables."""
    logger = get_logger(__name__)
    try:
        logger.info("Applying readonly grants...")
        await conn.execute(READONLY_GRANTS_SQL)
        logger.info("Readonly grants applied.")
    except Exception as e:
        logger.error(f"Failed to apply readonly grants: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_airport_db(conn: Connection):
    """Task to initialize the airports table."""
    logger = get_logger(__name__)

    tables_to_create = [
        ("countries", COUNTRIES_CREATE_TABLE_SQL),
        ("regions", REGIONS_CREATE_TABLE_SQL),
        ("airports", AIRPORT_CREATE_TABLE_SQL),
        ("runways", RUNWAYS_CREATE_TABLE_SQL),
        ("airport_frequencies", FREQUENCIES_CREATE_TABLE_SQL),
        ("navaids", NAVAIDS_CREATE_TABLE_SQL),
    ]

    try:
        for table_name, create_sql in tables_to_create:
            logger.info(f"Ensuring {table_name} table exists...")
            await ensure_table_exists(conn, table_name, create_sql=create_sql)
            logger.info(f"Table '{table_name}' is ready.")

        logger.info("All aviation reference tables initialized successfully!")

    except Exception as e:
        logger.error(f"Failed to initialize airports table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_proton_flux_plot_db(conn: Connection):
    """Task to initialize the proton flux plot table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring goes_proton_flux table exists...")
        await ensure_table_exists(
            conn, "goes_proton_flux", create_sql=PROTON_FLUX_CREATE_TABLE_SQL
        )
        logger.info("goes_proton_flux table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize goes_proton_flux table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_kp_index_db(conn: Connection):
    """Task to initialize the Kp index table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring kp_index table exists...")
        await ensure_table_exists(
            conn, "kp_index", create_sql=KP_INDEX_CREATE_TABLE_SQL
        )
        logger.info("kp_index table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize kp_index table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_alert_db(conn: Connection):
    """Task to initialize the alert table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring alerts table exists...")
        await ensure_table_exists(conn, "alerts", create_sql=ALERT_CREATE_TABLE_SQL)
        logger.info("alerts table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize alerts table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_aurora_db(conn: Connection):
    """Task to initialize the aurora_forecast table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring aurora_forecast table exists...")
        await ensure_table_exists(
            conn, "aurora_forecast", create_sql=AURORA_CREATE_TABLE_SQL
        )
        logger.info("aurora_forecast table is ready!")
    except Exception as e:
        logger.error(f"Failed to initialize aurora_forecast table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_xray_6hour_db(conn: Connection):
    """Task to initialize the goes_xray_6hour table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring goes_xray_6hour table exists...")
        await ensure_table_exists(
            conn, "goes_xray_6hour", create_sql=XRAY_6HOUR_CREATE_TABLE_SQL
        )
        logger.info("goes_xray_6hour table is ready!")
    except Exception as e:
        logger.error(f"Failed to initialize goes_xray_6hour table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_geoelectric_db(conn: Connection):
    """Task to initialize the geoelectric_field table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring geoelectric_field table exists...")
        await ensure_table_exists(
            conn, "geoelectric_field", create_sql=GEOELECTRIC_CREATE_TABLE_SQL
        )
        logger.info("geoelectric_field table is ready!")
    except Exception as e:
        logger.error(f"Failed to initialize geoelectric_field table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_transmission_lines_db(conn: Connection):
    """Task to initialize the electric_transmission_lines table."""
    logger = get_logger(__name__)
    try:
        logger.info("Ensuring electric_transmission_lines table exists...")
        await ensure_table_exists(
            conn,
            "electric_transmission_lines",
            create_sql=TRANSMISSION_LINES_CREATE_TABLE_SQL,
        )
        logger.info("electric_transmission_lines table is ready!")
    except Exception as e:
        logger.error(f"Failed to initialize electric_transmission_lines table: {e}")
        raise


@task
async def wait_for_tables_ready(
    conn: Connection, max_wait: int = 600, interval: int = 120
):
    CHECK_QUERY = """
        SELECT 
            (SELECT COUNT(*) FROM aurora_forecast WHERE observed_at >= NOW() - INTERVAL '1 hour') > 0 AND
            (SELECT COUNT(*) FROM drap_region WHERE observed_at >= NOW() - INTERVAL '1 hour') > 0 AND
            (SELECT COUNT(*) FROM geoelectric_field WHERE observed_at >= NOW() - INTERVAL '1 hour') > 0
        AS all_ready
    """
    elapsed = 0
    while elapsed < max_wait:
        ready = await conn.fetchval(CHECK_QUERY)
        if ready:
            return True
        await asyncio.sleep(interval)
        elapsed += interval

    raise RuntimeError("Tables not ready after 10 minutes")


@task
async def insert_events_location(conn: Connection):
    logger = get_logger(__name__)
    tables = ["drap_region", "aurora_forecast", "geoelectric_field"]
    try:
        await conn.execute(EVENTS_LOCATION_CREATE_TABLE_SQL)
        for table in tables:
            ingest_query = EVENTS_LOCATION_INGEST.format(table_name=table)
            await conn.execute(ingest_query)
            logger.info(f"Inserted locations for {table}")
    except Exception as e:
        logger.error(f"{table} insert failed — playback will crash: {e}")
        raise


# Future usage if any function in Postgres
# @task(cache_policy=NO_CACHE)
# async def initial_partition_function(conn: Connection):
#     """Task to create the partition function in Postgres"""
#     logger = get_logger(__name__)
#     try:
#         logger.info("Start creating partition function in Postgres")
#         await conn.execute(CREATE_PARTITION_FUNCTION_SQL)
#         logger.info("Function create done")
#     except Exception as e:
#         logger.error(f"Failed to create partition function: {e}")
#         raise


# -----
# Cleanup tasks
@task(cache_policy=NO_CACHE)
async def cleanup_table(
    conn: Connection, table_name: str, time_column: str, retention_days: int
):
    """Delete records older than retention_days from a partitioned table."""
    logger = get_logger(__name__)
    logger.info(
        f"Cleaning {table_name}: removing data older than {retention_days} days..."
    )
    res = await conn.execute(
        f"DELETE FROM {table_name} WHERE {time_column} < NOW() - INTERVAL '{retention_days} days'"
    )
    logger.info(f"Cleaned {table_name}: {res}")
