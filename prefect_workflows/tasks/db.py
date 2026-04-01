"""Database initialization and maintenance tasks."""

from datetime import datetime, timedelta

from shared.db_utils import ensure_table_exists, cleanup_old_data
from database.create import (
    ACTIVATE_FLIGHT_CREATE_TABLE_SQL,
    AIRPORT_CREATE_TABLE_SQL,
    COUNTRIES_CREATE_TABLE_SQL,
    REGIONS_CREATE_TABLE_SQL,
    FREQUENCIES_CREATE_TABLE_SQL,
    AIRPORT_COMMENTS_CREATE_TABLE_SQL,
    NAVAIDS_CREATE_TABLE_SQL,
    RUNWAYS_CREATE_TABLE_SQL,
    AURORA_CREATE_TABLE_SQL,
    DRAP_CREATE_TABLE_SQL,
    KP_INDEX_CREATE_TABLE_SQL,
    PROTON_FLUX_CREATE_TABLE_SQL,
    ALERT_CREATE_TABLE_SQL,
    XRAY_6HOUR_CREATE_TABLE_SQL,
    GEOELECTRIC_CREATE_TABLE_SQL,
    CREATE_TABLE_PARTITION_IF_MISSING,
)
from database.functions import CREATE_PARTITION_FUNCTION_SQL
from prefect import task
from shared.logger import get_logger
from prefect.cache_policies import NO_CACHE
from asyncpg import Connection


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
async def initial_airport_db(conn: Connection):
    """Task to initialize the airports table."""
    logger = get_logger(__name__)

    tables_to_create = [
        ("countries", COUNTRIES_CREATE_TABLE_SQL),
        ("regions", REGIONS_CREATE_TABLE_SQL),
        ("airports", AIRPORT_CREATE_TABLE_SQL),
        ("runways", RUNWAYS_CREATE_TABLE_SQL),
        ("airport_frequencies", FREQUENCIES_CREATE_TABLE_SQL),
        ("airport_comments", AIRPORT_COMMENTS_CREATE_TABLE_SQL),
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
async def initial_partition_function(conn: Connection):
    """Task to create the partition function in Postgres"""
    logger = get_logger(__name__)
    try:
        logger.info("Start creating partition function in Postgres")
        await conn.execute(CREATE_PARTITION_FUNCTION_SQL)
        logger.info("Function create done")
    except Exception as e:
        logger.error(f"Failed to create partition function: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def create_tables_partition(
    conn: Connection, table_name: str, datetime: datetime
):
    """Task to create all the table partition"""
    await conn.execute(CREATE_TABLE_PARTITION_IF_MISSING, table_name, datetime)
    await conn.execute(
        CREATE_TABLE_PARTITION_IF_MISSING, table_name, datetime + timedelta(days=30)
    )


# -----
# Cleanup tasks
@task(cache_policy=NO_CACHE)
async def cleanup_old_drap_data(conn: Connection, older_than_days: int = 1):
    """Task to clean up old DRAP data."""
    logger = get_logger(__name__)
    try:
        logger.info(f"Cleaning up DRAP data older than {older_than_days} days...")
        await cleanup_old_data(conn, "drap_region", older_than_days=older_than_days)
        logger.info("Old DRAP data cleanup completed!")
    except Exception as e:
        logger.error(f"Failed to cleanup old DRAP data: {e}")
        raise
