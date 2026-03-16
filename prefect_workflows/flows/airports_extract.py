from prefect import flow, get_run_logger
from tasks import airports
import asyncio

@flow(
    log_prints=True,
    description="ETL flow for airports data extraction.",
)
async def airports_extract_flow():
    logger = get_run_logger()

    try:
        logger.info("Starting sequential parent ingestion...")
        # 1. Root dependencies must go first
        await airports.ingest_countries_csv()
        await airports.ingest_regions_csv()
        
        # 2. Main table next
        await airports.ingest_airports_csv()

        logger.info("Parent tables loaded. Starting concurrent child ingestion...")

        # 3. These depend entirely on airports, so they can all run at the same time
        await asyncio.gather(
            airports.ingest_runways_csv(),
            airports.ingest_frequencies_csv(),
            airports.ingest_navaids_csv(),
            airports.ingest_comments_csv()
        )
        logger.info("Airports data extraction and ingestion completed successfully!")
    except Exception as e:
        logger.error(f"Airports data extraction failed: {e}")
        raise
