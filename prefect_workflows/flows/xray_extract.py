from prefect import flow, get_run_logger
from shared.db_utils import get_connection
from tasks.xray_latest import extract_xray_6hour_data, load_xray_6hour_data


@flow(
    log_prints=True,
    description="ETL flow for X-ray data extraction.",
)
async def xray_extract_flow():
    logger = get_run_logger()
    try:
        logger.info("Starting X-ray data extraction flow...")
        xray_data = await extract_xray_6hour_data()
        async with get_connection() as conn:
            await load_xray_6hour_data(xray_data, conn)
        logger.info("X-ray data extraction flow completed successfully!")
    except Exception as e:
        logger.error(f"X-ray data extraction flow failed: {e}")
        raise
