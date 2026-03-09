from prefect import task, get_run_logger

from database.db_tools import get_connection
from tasks.d_rap_etl import extractors, transformers, loaders

d_rap_url = "https://services.swpc.noaa.gov/text/drap_global_frequencies.txt"


@task(log_prints=True, retries=3, retry_delay_seconds=5)
async def extract_data():
    """Extract data from API."""
    data_string = extractors.extract_drap_data(d_rap_url)
    metadata, df_wide, df_long = transformers.parse_drap_data(data_string)
    return (metadata, df_wide, df_long)


@task(log_prints=True)
async def load_data(df_long):
    """Load data into PostgreSQL."""
    logger = get_run_logger()
    try:
        async with get_connection() as conn:
            await loaders.insert_drap_data(df_long, conn)
            logger.info("✓ Data loading completed successfully!")
    except Exception as e:
        logger.error(f"✗ Data loading failed: {e}")
        raise
