from datetime import datetime, timezone

from shared.db_utils import get_connection
from prefect import flow
from shared.logger import get_logger
from tasks.db import (
    initial_aurora_db,
    initial_drap_db,
    initial_activate_flight_db,
    initial_airport_db,
    cleanup_old_drap_data,
    initial_partition_function,
    initial_proton_flux_plot_db,
    initial_kp_index_db,
    initial_alert_db,
    initial_xray_6hour_db,
    initial_geoelectric_db,
    create_tables_partition,
)
from database.queries import PARTITION_TABLE_LISTS


@flow(log_prints=True)
async def db_maintenance_flow():
    """Flow to perform database maintenance tasks."""
    logger = get_logger(__name__)
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
    logger = get_logger(__name__)
    logger.info("Starting database initialization flow...")
    try:
        async with get_connection() as conn:
            await initial_drap_db(conn)
            await initial_airport_db(conn)
            await initial_activate_flight_db(conn)
            await initial_proton_flux_plot_db(conn)
            await initial_kp_index_db(conn)
            await initial_alert_db(conn)
            await initial_xray_6hour_db(conn)
            await initial_aurora_db(conn)
            await initial_geoelectric_db(conn)
            await initial_partition_function(conn)
            logger.info("Database initialization completed successfully!")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")


@flow(log_prints=True)
async def partition_maintain():
    """Create each table datetime partition."""
    date = datetime.now(timezone.utc)
    logger = get_logger(__name__)
    logger.info("Starting all database partition")
    try:
        async with get_connection() as conn:
            for table_name in PARTITION_TABLE_LISTS:
                await create_tables_partition(conn, table_name, date)

    except Exception as e:
        logger.debug(f"Table {table_name} failed to create {date} of partition")
        logger.error(f"Database Error failed: {e}")


if __name__ == "__main__":
    import asyncio
    import asyncpg
    import os
    from datetime import datetime, timezone
    from database.queries import PARTITION_TABLE_LISTS

    date = datetime.now(timezone.utc)

    async def run():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        try:
            await initial_drap_db.fn(conn)
            await initial_airport_db.fn(conn)
            await initial_activate_flight_db.fn(conn)
            await initial_proton_flux_plot_db.fn(conn)
            await initial_kp_index_db.fn(conn)
            await initial_alert_db.fn(conn)
            await initial_xray_6hour_db.fn(conn)
            await initial_aurora_db.fn(conn)
            await initial_geoelectric_db.fn(conn)
            await initial_partition_function.fn(conn)

            for table_name in PARTITION_TABLE_LISTS:
                await create_tables_partition(conn, table_name, date)

        finally:
            await conn.close()

    asyncio.run(run())
