import json
from prefect import task
from prefect.cache_policies import NO_CACHE
from shared.logger import get_logger
import requests
from asyncpg import Connection
from tasks.models import AuroraRecord
from database.queries import (
    AURORA_STAGING_DDL,
    AURORA_STAGING_COLUMNS,
    AURORA_TRANSFORM_SQL,
)
from shared.redis import get_redis_client, AURORA_CACHE_KEY, AURORA_CHANNEL, MEDIUM_TTL

AURORA_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json"


@task(log_prints=True, retries=3, retry_delay_seconds=5)
def fetch_aurora_data() -> dict:
    """Fetch aurora forecast JSON from NOAA. Returns the raw response dict."""
    logger = get_logger(__name__)
    try:
        logger.info(f"Fetching aurora data from {AURORA_URL}")
        response = requests.get(AURORA_URL, timeout=30)
        response.raise_for_status()
        data = response.json()
        logger.info(
            f"Fetched aurora data: observation_time={data.get('Observation Time')}, "
            f"{len(data.get('coordinates', []))} coordinate points"
        )
        return data
    except requests.exceptions.JSONDecodeError as e:
        logger.error(f"JSON parse failed at pos {e.pos}/{len(response.text)}: {e}")
        logger.error(f"Full response text:\n{response.text}")
        raise


@task(log_prints=True, cache_policy=NO_CACHE, retries=3)
async def load_aurora_data(data: dict, conn: Connection) -> None:
    """Parse and bulk-insert aurora forecast records into the database."""
    logger = get_logger(__name__)

    observation_time = data.get("Observation Time")
    forecast_time = data.get("Forecast Time")
    coordinates = data.get("coordinates", [])

    if not observation_time or not forecast_time:
        logger.warning("Missing observation_time or forecast_time in aurora response")
        return

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

    async with conn.transaction():
        await conn.execute(AURORA_STAGING_DDL)
        await conn.copy_records_to_table(
            "aurora_forecast_staging",
            records=records,
            columns=AURORA_STAGING_COLUMNS,
        )
        await conn.execute(AURORA_TRANSFORM_SQL)

    logger.info(f"Aurora forecast inserted: {len(records)} records")


@task(name="Broadcast Aurora to Redis")
async def broadcast_aurora_to_redis(data: dict) -> None:
    """Push the raw NOAA dictionary straight from memory to Redis."""
    logger = get_logger(__name__)

    if not data or not data.get("coordinates"):
        logger.warning("No Aurora data to broadcast.")
        return

    try:
        client = get_redis_client()

        observation_time = data.get("Observation Time")
        forecast_time = data.get("Forecast Time")

        # Ensure the timestamp is formatted as ISO 8601 for the frontend
        formatted_observation_time = (
            observation_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            if observation_time and hasattr(observation_time, "strftime")
            else str(observation_time)
            if observation_time
            else ""
        )
        formatted_forecast_time = (
            forecast_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            if forecast_time and hasattr(forecast_time, "strftime")
            else str(forecast_time)
            if forecast_time
            else ""
        )

        payload = {
            "observation_time": formatted_observation_time,
            "forecast_time": formatted_forecast_time,
            "count": len(data.get("coordinates", [])),
            "coordinates": data.get("coordinates", []),
        }
        await client.set(AURORA_CACHE_KEY, json.dumps(payload), ex=MEDIUM_TTL)
        await client.publish(AURORA_CHANNEL, "new_data")

        await client.aclose()
        logger.info("Broadcasted Aurora grid directly from memory to Redis.")

    except Exception as e:
        logger.error(f"Failed to broadcast Aurora to Redis: {e}")
