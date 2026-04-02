import os
from datetime import datetime, timezone

from shared.db_utils import get_connection
from prefect import flow
from shared.logger import get_logger
from tasks.db import (
    initial_aurora_db,
    initial_drap_db,
    initial_flight_states_db,
    initial_activate_flight_db,
    initial_airport_db,
    initial_partition_function,
    initial_proton_flux_plot_db,
    initial_kp_index_db,
    initial_alert_db,
    initial_xray_6hour_db,
    initial_geoelectric_db,
    cleanup_table,
    initial_readonly_grants,
    create_tables_partition,
)
from database.queries import PARTITION_TABLE_LISTS, RETENTION_CONFIG
from flows.kp_index import ingest_kp_index_flow
from flows.airports_extract import airports_extract_flow


@flow(log_prints=True)
async def db_maintenance_flow():
    """Flow to enforce retention policy on all partitioned tables."""
    logger = get_logger(__name__)
    logger.info("Starting database maintenance flow...")
    try:
        async with get_connection() as conn:
            for table_name, (time_col, env_var) in RETENTION_CONFIG.items():
                retention_days = int(os.environ.get(env_var, 0))
                if retention_days <= 0:
                    logger.info(f"Skipping {table_name}: {env_var} not set")
                    continue
                await cleanup_table(conn, table_name, time_col, retention_days)
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
            await initial_partition_function(conn)
            await initial_flight_states_db(conn)
            await initial_drap_db(conn)
            await initial_airport_db(conn)
            await initial_activate_flight_db(conn)
            await initial_proton_flux_plot_db(conn)
            await initial_kp_index_db(conn)
            await initial_alert_db(conn)
            await initial_xray_6hour_db(conn)
            await initial_aurora_db(conn)
            await initial_geoelectric_db(conn)
            await initial_readonly_grants(conn)
            logger.info("Database schema initialization completed successfully!")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return

    await partition_maintain()
    await seed_empty_tables()


@flow(log_prints=True)
async def seed_empty_tables():
    """Trigger immediate data pulls for tables with long schedule intervals if they are empty."""
    logger = get_logger(__name__)
    tables_to_seed = [
        ("kp_index",  ingest_kp_index_flow),
        ("airports",  airports_extract_flow),
    ]
    async with get_connection() as conn:
        for table_name, seed_flow in tables_to_seed:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table_name}")
            if count == 0:
                logger.info(f"{table_name} is empty, triggering initial data pull...")
                await seed_flow()
            else:
                logger.info(f"{table_name} already has {count} rows, skipping seed.")


@flow(log_prints=True)
async def partition_maintain():
    """Create each table datetime partition."""
    date = datetime.now(timezone.utc)
    logger = get_logger(__name__)
    table_name = None
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

    asyncio.run(initialize_db_flow())
