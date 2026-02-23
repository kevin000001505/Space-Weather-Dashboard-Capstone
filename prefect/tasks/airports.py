from tasks.queries import AIRPORTS_UPSERT_SQL
from prefect import task, get_run_logger
from prefect.cache_policies import NO_CACHE
import asyncpg
import requests
import csv
from io import StringIO


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
                await conn.executemany(AIRPORTS_UPSERT_SQL, batch)
                logger.info(f"Inserted batch of {len(batch)} airports...")
                batch = []

        # Insert remaining records
        if batch:
            await conn.executemany(AIRPORTS_UPSERT_SQL, batch)
            logger.info(f"Inserted final batch of {len(batch)} airports...")

        logger.info("Airports data loaded successfully!")

    except Exception as e:
        logger.error(f"Failed to load airports data: {e}")
        raise
