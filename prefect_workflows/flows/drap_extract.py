from prefect import flow
from shared.logger import get_logger
from shared.prefect_utils import variable_upsert
from prefect.variables import Variable
from shared.db_utils import get_connection
from tasks.drap import broadcast_drap_to_redis, extract_data, transform_data, load_data
from config import EVENTS_TIMEOUT


@flow(
    log_prints=True,
    timeout_seconds=EVENTS_TIMEOUT,
    description="ETL flow for D-RAP data extraction, transformation, and loading.",
)
async def rap_extract_flow():
    last_seen = Variable.get("data_last_updated", default=None)
    data_string = extract_data()
    metadata, df_wide, df_long = transform_data(data_string)
    current_updated = metadata.get("valid_at", "Unknown")

    logger = get_logger(__name__)
    logger.info(f"Last seen: '{last_seen}' (type: {type(last_seen)})")
    logger.info(f"Current: '{current_updated}' (type: {type(current_updated)})")

    if last_seen == current_updated:
        logger.info("No new data available. Last updated at: %s", last_seen)
        return

    logger.info("New data detected. Loading...")
    async with get_connection() as conn:
        await load_data(df_long, conn)

    logger.info("Broadcasting new D-RAP data to redis...")
    await broadcast_drap_to_redis(df_long, current_updated)

    await variable_upsert("data_last_updated", current_updated)
    logger.info("Metadata: %s", metadata)
    logger.info("Wide DataFrame:\n%s", df_wide.head())
    logger.info("Long DataFrame:\n%s", df_long.head())
