from prefect import flow, get_run_logger
from prefect.variables import Variable
from tasks.drap import extract_data, load_data


@flow(
    log_prints=True,
    description="ETL flow for D-RAP data extraction, transformation, and loading.",
)
async def rap_extract_flow():
    last_seen = await Variable.get("data_last_updated", default=None)
    metadata, df_wide, df_long = await extract_data()
    current_updated = metadata.get("valid_at", "Unknown")

    logger = get_run_logger()
    logger.info(f"Last seen: '{last_seen}' (type: {type(last_seen)})")
    logger.info(f"Current: '{current_updated}' (type: {type(current_updated)})")

    if last_seen == current_updated:
        logger.info("No new data available. Last updated at: %s", last_seen)
    else:
        logger.info("New data detected. Loading...")
        await load_data(df_long)
        await Variable.set("data_last_updated", current_updated, overwrite=True)
        logger.info("Metadata: %s", metadata)
        logger.info("Wide DataFrame:\n%s", df_wide.head())
        logger.info("Long DataFrame:\n%s", df_long.head())
