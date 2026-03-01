from prefect import flow, get_run_logger
from database.db_tools import get_connection
from tasks import airports


@flow(
    log_prints=True,
    description="ETL flow for airports data extraction.",
)
async def airports_extract_flow():
    logger = get_run_logger()

    try:
        await airports.ingest_airports_csv()
        logger.info("Airports data extraction and ingestion completed successfully!")
    except Exception as e:
        logger.error(f"Airports data extraction failed: {e}")
