from prefect import flow
from config import EVENTS_TIMEOUT
from shared.logger import get_logger
from shared.db_utils import get_connection
from tasks.xray_latest import (
    extract_xray_6hour_data,
    load_xray_6hour_data,
    parse_xray_6hour_data,
)


@flow(
    log_prints=True,
    description="ETL flow for X-ray data extraction.",
)
async def xray_extract_flow():
    logger = get_logger(__name__)
    try:
        logger.info("Starting X-ray data extraction flow...")
        xray_data = extract_xray_6hour_data()
        parsed = parse_xray_6hour_data(xray_data)

        async with get_connection() as conn:
            await load_xray_6hour_data(parsed, conn)
        logger.info("X-ray data extraction flow completed successfully!")
    except Exception as e:
        logger.error(f"X-ray data extraction flow failed: {e}")
        raise
