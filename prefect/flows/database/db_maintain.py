from db_tools import ensure_table_exists, get_connection, cleanup_old_data
from queries import (
    ACTIVATE_FLIGHT_CREATE_TABLE_SQL,
    AIRPORT_CREATE_TABLE_SQL,
    AIRPORTS_INSERT_SQL,
    DRAP_CREATE_TABLE_SQL,
)
from prefect import flow, task, get_run_logger
from prefect.cache_policies import NO_CACHE
import asyncpg
import requests
import csv
from io import StringIO


@flow(log_prints=True)
async def db_maintenance_flow():
    """Flow to perform database maintenance tasks."""
    print("Starting database maintenance flow...")
    try:
        async with get_connection() as conn:
            print("Cleaning up old DRAP data...")
            await cleanup_old_data(conn, "drap_region", older_than_days=1)
            print("Old data cleanup completed successfully!")

    except Exception as e:
        print(f"Database maintenance failed: {e}")


# Initial DB
@task(cache_policy=NO_CACHE)
async def initial_drap_db(conn: asyncpg.Connection):
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
async def initial_activate_flight_db(conn: asyncpg.Connection):
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
async def ingest_airports_csv(conn: asyncpg.Connection):
    """Task to download and ingest airports CSV data."""
    logger = get_run_logger()
    try:
        logger.info("Downloading airports CSV data...")

        # Download CSV
        response = requests.get(
            "https://davidmegginson.github.io/ourairports-data/airports.csv"
        )
        response.raise_for_status()

        logger.info("Parsing CSV data...")

        # Parse CSV
        reader = csv.DictReader(StringIO(response.text))

        # Insert data in batches
        batch_size = 500
        batch = []

        for row in reader:
            # Convert scheduled_service to boolean
            scheduled = row.get("scheduled_service", "no").lower() == "yes"

            batch.append(
                (
                    int(row["id"]),
                    row["ident"],
                    row["type"],
                    row["name"],
                    float(row["latitude_deg"]),
                    float(row["longitude_deg"]),
                    int(row["elevation_ft"]) if row.get("elevation_ft") else None,
                    row.get("continent"),
                    row.get("iso_country"),
                    row.get("iso_region"),
                    row.get("municipality"),
                    scheduled,
                    row.get("icao_code") or None,
                    row.get("iata_code") or None,
                    row.get("gps_code") or None,
                    row.get("local_code") or None,
                )
            )

            if len(batch) >= batch_size:
                await conn.executemany(AIRPORTS_INSERT_SQL, batch)
                logger.info(f"Inserted batch of {len(batch)} airports...")
                batch = []

        # Insert remaining records
        if batch:
            await conn.executemany(AIRPORTS_INSERT_SQL, batch)
            logger.info(f"Inserted final batch of {len(batch)} airports...")

        logger.info("Airports data loaded successfully!")

    except Exception as e:
        logger.error(f"Failed to load airports data: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_airport_db(conn: asyncpg.Connection):
    """Task to initialize the airports table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring airports table exists...")
        await ensure_table_exists(conn, "airports", create_sql=AIRPORT_CREATE_TABLE_SQL)
        logger.info("airports table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize airports table: {e}")
        raise


@flow(log_prints=True)
async def initialize_db_flow():
    """Flow to initialize the database schema."""
    print("Starting database initialization flow...")
    try:
        async with get_connection() as conn:
            await initial_drap_db(conn)
            await initial_airport_db(conn)
            await initial_activate_flight_db(conn)
            await ingest_airports_csv(conn)
            print("Database initialization completed successfully!")

    except Exception as e:
        print(f"Database initialization failed: {e}")
