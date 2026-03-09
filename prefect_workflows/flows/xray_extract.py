from prefect import flow, get_run_logger
from tasks.xray_latest import extract_xray_data


@flow(
    log_prints=True,
    description="ETL flow for X-ray data extraction.",
)
async def xray_extract_flow():
    logger = get_run_logger()
    try:
        logger.info("Starting X-ray data extraction flow...")
        await extract_xray_data()
        logger.info("X-ray data extraction flow completed successfully!")
    except Exception as e:
        logger.error(f"X-ray data extraction flow failed: {e}")
        raise
