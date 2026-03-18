from prefect import flow, get_run_logger
from shared.db_utils import get_connection
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
        async with get_connection() as conn:
            await airports.ingest_countries_csv(conn)
            await airports.ingest_regions_csv(conn)

            # 2. Main table next
            await airports.ingest_airports_csv(conn)

        logger.info("Parent tables loaded. Starting concurrent child ingestion...")

        # 3. These depend entirely on airports, so they can all run at the same time
        # Each concurrent task gets its own connection to avoid conflicts
        async with (
            get_connection() as conn1,
            get_connection() as conn2,
            get_connection() as conn3,
            get_connection() as conn4,
        ):
            await asyncio.gather(
                airports.ingest_runways_csv(conn1),
                airports.ingest_frequencies_csv(conn2),
                airports.ingest_navaids_csv(conn3),
                airports.ingest_comments_csv(conn4),
            )
        logger.info("Airports data extraction and ingestion completed successfully!")
    except Exception as e:
        logger.error(f"Airports data extraction failed: {e}")
        raise
