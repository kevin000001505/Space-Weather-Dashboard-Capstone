from prefect import flow
from prefect.variables import Variable
from shared.db_utils import get_connection
from shared.logger import get_logger

from tasks.geomatic import (
    extract_file,
    extract_data,
    transform_data,
    load_geoelectric_data,
    broadcast_geoelectric_to_redis,
    parse_observed_at,
    base_url,
)


@flow(
    log_prints=True,
    description="ETL flow for NOAA geoelectric field data extraction and loading.",
)
async def geomatic_extract_flow():
    logger = get_logger(__name__)
    logger.info("Starting geoelectric field extraction flow...")

    file_name = extract_file()
    if not file_name or file_name == "None":
        logger.error("Could not determine latest geoelectric file. Aborting.")
        return

    last_seen = await Variable.get("geoelectric_last_file", default=None)
    logger.info(f"Last seen: '{last_seen}' | Current: '{file_name}'")

    if last_seen == file_name:
        logger.info("No new geoelectric data available. Skipping load.")
        return

    logger.info("New geoelectric data detected. Fetching...")
    url = base_url + file_name
    features = extract_data(url)

    if not features:
        logger.warning("No features returned from API. Aborting.")
        return

    observed_at = parse_observed_at(file_name)
    logger.info(f"Observation time: {observed_at} | Features: {len(features)}")

    records = transform_data(features, observed_at)
    async with get_connection() as conn:
        await load_geoelectric_data(records, conn)

    logger.info("Broadcasting geoelectric data to Redis...")
    await broadcast_geoelectric_to_redis(features, observed_at)

    await Variable.set("geoelectric_last_file", file_name, overwrite=True)
    logger.info("Geoelectric field extraction flow completed successfully!")
