from database.queries import (
    AIRPORTS_STAGING_DDL,
    AIRPORTS_STAGING_COLUMNS,
    AIRPORTS_TRANSFORM_SQL,
    COUNTRIES_STAGING_DDL,
    COUNTRIES_STAGING_COLUMNS,
    COUNTRIES_TRANSFORM_SQL,
    REGIONS_STAGING_DDL,
    REGIONS_STAGING_COLUMNS,
    REGIONS_TRANSFORM_SQL,
    FREQUENCIES_STAGING_DDL,
    FREQUENCIES_STAGING_COLUMNS,
    FREQUENCIES_TRANSFORM_SQL,
    COMMENTS_STAGING_DDL,
    COMMENTS_STAGING_COLUMNS,
    COMMENTS_TRANSFORM_SQL,
    RUNWAYS_STAGING_DDL,
    RUNWAYS_STAGING_COLUMNS,
    RUNWAYS_TRANSFORM_SQL,
    NAVAIDS_STAGING_DDL,
    NAVAIDS_STAGING_COLUMNS,
    NAVAIDS_TRANSFORM_SQL
)
from prefect import task
from shared.logger import get_logger
from prefect.cache_policies import NO_CACHE
from tasks.models import (
    AirportRecord,
    CountryRecord,
    RegionRecord,
    FrequencyRecord,
    RunwayRecord,
    NavaidRecord,
    CommentRecord
)
from asyncpg import Connection
from asyncpg import Connection
import requests
import csv
from io import StringIO
from datetime import datetime
from pydantic import ValidationError

airports_base_url = "https://davidmegginson.github.io/ourairports-data/"
airports_url = f"{airports_base_url}airports.csv"
countries_url = f"{airports_base_url}countries.csv"
regions_url = f"{airports_base_url}regions.csv"
runways_url = f"{airports_base_url}runways.csv"
navaids_url = f"{airports_base_url}navaids.csv"
freqs_url = f"{airports_base_url}airport-frequencies.csv"
comments_url = f"{airports_base_url}airport-comments.csv"


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
    return value.lower() in ("true", "1", "yes", "y")


def parse_datetime(value):
    """Parse datetime value, return None if empty or invalid."""
    if not value or value == "":
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError, AttributeError):
        return None

# Generic Ingestion Helper
async def run_ingest_pipeline(url: str, model_class, staging_table: str, staging_ddl: str, columns: list, transform_sql: str, conn: Connection):
    logger = get_logger(__name__)
    try:
        logger.info(f"Downloading data from {url}...")

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        logger.info("Parsing CSV data...")
        reader = csv.DictReader(StringIO(response.text))

        all_tuples = []
        skipped_count = 0
        for row in reader:
            try:
                # If Pydantic validates it perfectly, add it to the list
                record = model_class(**row)
                all_tuples.append(record.to_tuple())
            except ValidationError:
                # If a required field is missing (or CSV is mangled), skip this row entirely!
                skipped_count += 1
                continue

        logger.info(f"Parsed {len(all_tuples)} records (Skipped {skipped_count} malformed rows).")
        logger.info(f"Starting COPY to {staging_table}...")

        async with conn.transaction():
            await conn.execute(staging_ddl)
            await conn.copy_records_to_table(
                staging_table,
                records=all_tuples,
                columns=columns,
            )
            await conn.execute(transform_sql)
        async with conn.transaction():
            await conn.execute(staging_ddl)
            await conn.copy_records_to_table(
                staging_table,
                records=all_tuples,
                columns=columns,
            )
            await conn.execute(transform_sql)

        logger.info(f"✓ {staging_table} data loaded successfully!")


    except Exception as e:
        logger.error(f"Failed to load airports data: {e}")
        raise

@task(cache_policy=NO_CACHE)
async def ingest_countries_csv(conn: Connection):
async def ingest_countries_csv(conn: Connection):
    await run_ingest_pipeline(
        countries_url, CountryRecord, "countries_staging",
        COUNTRIES_STAGING_DDL, COUNTRIES_STAGING_COLUMNS, COUNTRIES_TRANSFORM_SQL, conn
        COUNTRIES_STAGING_DDL, COUNTRIES_STAGING_COLUMNS, COUNTRIES_TRANSFORM_SQL, conn
    )

@task(cache_policy=NO_CACHE)
async def ingest_regions_csv(conn: Connection):
async def ingest_regions_csv(conn: Connection):
    await run_ingest_pipeline(
        regions_url, RegionRecord, "regions_staging",
        REGIONS_STAGING_DDL, REGIONS_STAGING_COLUMNS, REGIONS_TRANSFORM_SQL, conn
    )

@task(cache_policy=NO_CACHE)
async def ingest_airports_csv(conn: Connection):
async def ingest_airports_csv(conn: Connection):
    await run_ingest_pipeline(
        airports_url, AirportRecord, "airports_staging",
        AIRPORTS_STAGING_DDL, AIRPORTS_STAGING_COLUMNS, AIRPORTS_TRANSFORM_SQL, conn
        AIRPORTS_STAGING_DDL, AIRPORTS_STAGING_COLUMNS, AIRPORTS_TRANSFORM_SQL, conn
    )

@task(cache_policy=NO_CACHE)
async def ingest_runways_csv(conn: Connection):
async def ingest_runways_csv(conn: Connection):
    await run_ingest_pipeline(
        runways_url, RunwayRecord, "runways_staging",
        RUNWAYS_STAGING_DDL, RUNWAYS_STAGING_COLUMNS, RUNWAYS_TRANSFORM_SQL, conn
        RUNWAYS_STAGING_DDL, RUNWAYS_STAGING_COLUMNS, RUNWAYS_TRANSFORM_SQL, conn
    )

@task(cache_policy=NO_CACHE)
async def ingest_frequencies_csv(conn: Connection):
async def ingest_frequencies_csv(conn: Connection):
    await run_ingest_pipeline(
        freqs_url, FrequencyRecord, "frequencies_staging",
        FREQUENCIES_STAGING_DDL, FREQUENCIES_STAGING_COLUMNS, FREQUENCIES_TRANSFORM_SQL, conn
        FREQUENCIES_STAGING_DDL, FREQUENCIES_STAGING_COLUMNS, FREQUENCIES_TRANSFORM_SQL, conn
    )

@task(cache_policy=NO_CACHE)
async def ingest_navaids_csv(conn: Connection):
async def ingest_navaids_csv(conn: Connection):
    await run_ingest_pipeline(
        navaids_url, NavaidRecord, "navaids_staging",
        NAVAIDS_STAGING_DDL, NAVAIDS_STAGING_COLUMNS, NAVAIDS_TRANSFORM_SQL, conn
        NAVAIDS_STAGING_DDL, NAVAIDS_STAGING_COLUMNS, NAVAIDS_TRANSFORM_SQL, conn
    )

@task(cache_policy=NO_CACHE)
async def ingest_comments_csv(conn: Connection):
async def ingest_comments_csv(conn: Connection):
    await run_ingest_pipeline(
        comments_url, CommentRecord, "comments_staging",
        COMMENTS_STAGING_DDL, COMMENTS_STAGING_COLUMNS, COMMENTS_TRANSFORM_SQL, conn
        COMMENTS_STAGING_DDL, COMMENTS_STAGING_COLUMNS, COMMENTS_TRANSFORM_SQL, conn
    )
