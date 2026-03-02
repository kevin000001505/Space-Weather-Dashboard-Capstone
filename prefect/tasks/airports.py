from tasks.queries import AIRPORTS_UPSERT_SQL
from prefect import task, get_run_logger
from prefect.cache_policies import NO_CACHE
from tasks.models import AirportRecord
from database.db_tools import get_connection
import requests
import csv
from io import StringIO
from datetime import datetime


def parse_float(value):
    """Parse float value, return None if empty or invalid."""
    if not value or value == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_int(value):
    """Parse int value, return None if empty or invalid."""
    if not value or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_bool(value):
    """Parse boolean value, return None if empty or invalid."""
    if not value or value == "":
        return None
    if isinstance(value, bool):
        return value
    return value.lower() in ('true', '1', 'yes', 'y')


def parse_datetime(value):
    """Parse datetime value, return None if empty or invalid."""
    if not value or value == "":
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, TypeError, AttributeError):
        return None


@task(cache_policy=NO_CACHE)
async def ingest_airports_csv():
    """Task to download and ingest airports CSV data."""
    logger = get_run_logger()
    try:
        logger.info("Downloading airports CSV data...")

        response = requests.get(
            "https://davidmegginson.github.io/ourairports-data/airports.csv"
        )
        response.raise_for_status()

        logger.info("Parsing CSV data...")
        reader = csv.DictReader(StringIO(response.text))

        batch_size = 500
        batch = []
        batch_num = 0
        total_inserted = 0

        async with get_connection() as conn:
            for row in reader:
                airport = AirportRecord(
                    ident=row["ident"],
                    type=row["type"],
                    name=row["name"],
                    latitude_deg=parse_float(row.get("latitude_deg")),
                    longitude_deg=parse_float(row.get("longitude_deg")),
                    elevation_ft=parse_float(row.get("elevation_ft")),
                    continent=row.get("continent") or None,
                    country_name=row.get("country_name") or None,
                    iso_country=row.get("iso_country") or None,
                    region_name=row.get("region_name") or None,
                    iso_region=row.get("iso_region") or None,
                    local_region=row.get("local_region") or None,
                    municipality=row.get("municipality") or None,
                    scheduled_service=parse_bool(row.get("scheduled_service")),
                    gps_code=row.get("gps_code") or None,
                    iata_code=row.get("iata_code") or None,
                    icao_code=row.get("icao_code") or None,
                    local_code=row.get("local_code") or None,
                    home_link=row.get("home_link") or None,
                    wikipedia_link=row.get("wikipedia_link") or None,
                    keywords=row.get("keywords") or None,
                    score=parse_int(row.get("score")),
                    last_updated=parse_datetime(row.get("last_updated")),
                )

                batch.append(airport.to_tuple())

                if len(batch) >= batch_size:
                    batch_num += 1
                    await conn.executemany(AIRPORTS_UPSERT_SQL, batch)
                    total_inserted += len(batch)
                    logger.info(f"Batch {batch_num}: Inserted {len(batch)} airports (Total: {total_inserted})")
                    batch = []

            # Insert remaining records
            if batch:
                batch_num += 1
                await conn.executemany(AIRPORTS_UPSERT_SQL, batch)
                total_inserted += len(batch)
                logger.info(f"Batch {batch_num}: Inserted final {len(batch)} airports (Total: {total_inserted})")

        logger.info(f"✓ Airports data loaded successfully! Total batches: {batch_num}, Total records: {total_inserted}")

    except Exception as e:
        logger.error(f"Failed to load airports data: {e}")
        raise
