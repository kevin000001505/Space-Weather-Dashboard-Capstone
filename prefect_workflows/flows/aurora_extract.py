from prefect import flow
from shared.logger import get_logger
from prefect.variables import Variable
from shared.prefect_utils import variable_upsert
from shared.db_utils import get_connection
from tasks.aurora import broadcast_aurora_to_redis, fetch_aurora_data, load_aurora_data


@flow(
    log_prints=True,
    description="ETL flow for aurora forecast data extraction and loading.",
)
async def aurora_extract_flow():
    logger = get_logger(__name__)
    logger.info("Starting aurora forecast extraction flow...")

    data = fetch_aurora_data()
    current_observation = data.get("Observation Time")

    last_seen = await Variable.get("aurora_last_observation_time", default=None)
    logger.info(f"Last seen: '{last_seen}' | Current: '{current_observation}'")

    if last_seen == current_observation:
        logger.info("No new aurora data available. Skipping load.")
        return

    logger.info("New aurora data detected. Loading...")
    async with get_connection() as conn:
        await load_aurora_data(data, conn)

    logger.info("Broadcasting new aurora data to redis...")
    await broadcast_aurora_to_redis(data)

    await variable_upsert("aurora_last_observation_time", current_observation)
    logger.info("Aurora forecast extraction flow completed successfully!")
