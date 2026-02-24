"""Database initialization and maintenance tasks."""

from database.db_tools import (
    ensure_table_exists,
    cleanup_old_data,
)
from tasks.queries import (
    ACTIVATE_FLIGHT_CREATE_TABLE_SQL,
    AIRPORT_CREATE_TABLE_SQL,
    DRAP_CREATE_TABLE_SQL,
    LATEST_X_RAY_CREATE_TABLE_SQL,
)
from prefect import task, get_run_logger
from prefect.cache_policies import NO_CACHE
from asyncpg.pool import PoolConnectionProxy


@task(cache_policy=NO_CACHE)
async def initial_drap_db(conn: PoolConnectionProxy):
    """Task to initialize the DRAP region table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring DRAP region table exists...")
        await ensure_table_exists(conn, "drap_region", create_sql=DRAP_CREATE_TABLE_SQL)
        logger.info("DRAP region table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize DRAP region table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_activate_flight_db(conn: PoolConnectionProxy):
    """Task to initialize the activate_flight table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring activate_flight table exists...")
        await ensure_table_exists(
            conn, "activate_flight", create_sql=ACTIVATE_FLIGHT_CREATE_TABLE_SQL
        )
    except Exception as e:
        logger.error(f"Failed to initialize activate_flight table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_airport_db(conn: PoolConnectionProxy):
    """Task to initialize the airports table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring airports table exists...")
        await ensure_table_exists(conn, "airports", create_sql=AIRPORT_CREATE_TABLE_SQL)
        logger.info("airports table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize airports table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_latest_xray_db(conn: PoolConnectionProxy):
    """Task to initialize the xray table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring xray table exists...")
        await ensure_table_exists(
            conn, "solar_flare_events", create_sql=LATEST_X_RAY_CREATE_TABLE_SQL
        )
        logger.info("xray table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize xray table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def cleanup_old_drap_data(conn: PoolConnectionProxy, older_than_days: int = 1):
    """Task to clean up old DRAP data."""
    logger = get_run_logger()
    try:
        logger.info(f"Cleaning up DRAP data older than {older_than_days} days...")
        await cleanup_old_data(conn, "drap_region", older_than_days=older_than_days)
        logger.info("Old DRAP data cleanup completed!")
    except Exception as e:
        logger.error(f"Failed to cleanup old DRAP data: {e}")
        raise
