from database.db_tools import get_connection
from tasks.db import (
    initial_drap_db,
    initial_activate_flight_db,
    initial_airport_db,
    cleanup_old_drap_data,
    initial_latest_xray_db,
)
from prefect import flow


@flow(log_prints=True)
async def db_maintenance_flow():
    """Flow to perform database maintenance tasks."""
    print("Starting database maintenance flow...")
    try:
        async with get_connection() as conn:
            await cleanup_old_drap_data(conn, older_than_days=1)
            print("Database maintenance completed successfully!")

    except Exception as e:
        print(f"Database maintenance failed: {e}")


@flow(log_prints=True)
async def initialize_db_flow():
    """Flow to initialize the database schema."""
    print("Starting database initialization flow...")
    try:
        async with get_connection() as conn:
            await initial_drap_db(conn)
            await initial_airport_db(conn)
            await initial_activate_flight_db(conn)
            await initial_latest_xray_db(conn)
            print("Database initialization completed successfully!")

    except Exception as e:
        print(f"Database initialization failed: {e}")
