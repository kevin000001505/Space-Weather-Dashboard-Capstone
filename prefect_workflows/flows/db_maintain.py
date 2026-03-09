import logging
from database.db_tools import get_connection
from prefect import flow, get_run_logger
from tasks.db import (
    initial_drap_db,
    initial_activate_flight_db,
    initial_airport_db,
    cleanup_old_drap_data,
    initial_latest_xray_db,
    initial_proton_flux_plot_db,
    initial_kp_index_db,
    initial_alert_db,
)

_fallback = logging.getLogger(__name__)


def _logger():
    """Return Prefect run logger if in a flow/task context, else stdlib logger."""
    try:
        return get_run_logger()
    except Exception:
        return _fallback


@flow(log_prints=True)
async def db_maintenance_flow():
    """Flow to perform database maintenance tasks."""
    logger = _logger()
    logger.info("Starting database maintenance flow...")
    try:
        async with get_connection() as conn:
            await cleanup_old_drap_data(conn, older_than_days=1)
            logger.info("Database maintenance completed successfully!")

    except Exception as e:
        logger.error(f"Database maintenance failed: {e}")


@flow(log_prints=True)
async def initialize_db_flow():
    """Flow to initialize the database schema."""
    logger = _logger()
    logger.info("Starting database initialization flow...")
    try:
        async with get_connection() as conn:
            await initial_drap_db(conn)
            await initial_airport_db(conn)
            await initial_activate_flight_db(conn)
            await initial_latest_xray_db(conn)
            await initial_proton_flux_plot_db(conn)
            await initial_kp_index_db(conn)
            await initial_alert_db(conn)
            logger.info("Database initialization completed successfully!")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")


if __name__ == "__main__":
    import asyncio
    import asyncpg
    import os

    async def run():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        try:
            await initial_drap_db.fn(conn)
            await initial_airport_db.fn(conn)
            await initial_activate_flight_db.fn(conn)
            await initial_latest_xray_db.fn(conn)
            await initial_proton_flux_plot_db.fn(conn)
            await initial_kp_index_db.fn(conn)
            await initial_alert_db.fn(conn)
        finally:
            await conn.close()

    asyncio.run(run())
