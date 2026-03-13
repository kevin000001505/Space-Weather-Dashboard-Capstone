from prefect import task, get_run_logger
from database.db_tools import get_connection
import requests
from tasks.models import AuroraRecord
from tasks.queries import AURORA_STAGING_DDL, AURORA_STAGING_COLUMNS, AURORA_TRANSFORM_SQL

AURORA_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json"


@task(log_prints=True, retries=3, retry_delay_seconds=5)
def fetch_aurora_data() -> dict:
    """Fetch aurora forecast JSON from NOAA. Returns the raw response dict."""
    logger = get_run_logger()
    logger.info(f"Fetching aurora data from {AURORA_URL}")
    response = requests.get(AURORA_URL, timeout=30)
    response.raise_for_status()
    data = response.json()
    logger.info(
        f"Fetched aurora data: observation_time={data.get('Observation Time')}, "
        f"{len(data.get('coordinates', []))} coordinate points"
    )
    return data


@task(log_prints=True)
async def load_aurora_data(data: dict) -> None:
    """Parse and bulk-insert aurora forecast records into the database."""
    logger = get_run_logger()

    observation_time = data.get("Observation Time")
    forecast_time = data.get("Forecast Time")
    coordinates = data.get("coordinates", [])

    if not coordinates:
        logger.warning("No coordinate data in aurora response")
        return

    records = []
    skipped = 0
    for coord in coordinates:
        if coord[2] == 0:
            continue
        try:
            record = AuroraRecord(
                observation_time=observation_time,
                forecast_time=forecast_time,
                longitude=coord[0],
                latitude=coord[1],
                aurora=coord[2],
            )
            records.append(record.to_tuple())
        except Exception as e:
            skipped += 1
            if skipped <= 3:
                logger.warning(f"Skipping invalid aurora record {coord}: {e}")

    if skipped:
        logger.warning(f"Skipped {skipped} invalid records total")

    if not records:
        logger.warning("No valid aurora records to insert")
        return

    async with get_connection() as conn:
        async with conn.transaction():
            await conn.execute(AURORA_STAGING_DDL)
            await conn.copy_records_to_table(
                "aurora_forecast_staging",
                records=records,
                columns=AURORA_STAGING_COLUMNS,
            )
            await conn.execute(AURORA_TRANSFORM_SQL)

    logger.info(f"Aurora forecast inserted: {len(records)} records")
