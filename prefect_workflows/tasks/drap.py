import json
from pandas import DataFrame
from prefect import task
from prefect.cache_policies import NO_CACHE

from shared.logger import get_logger
from tasks.d_rap_etl import extractors, transformers, loaders
from asyncpg import Connection
from shared.redis import (
    get_redis_client,
    DRAP_CACHE_KEY,
    DRAP_CHANNEL,
    MEDIUM_TTL,
)

d_rap_url = "https://services.swpc.noaa.gov/text/drap_global_frequencies.txt"


@task(log_prints=True, retries=3, retry_delay_seconds=5)
def extract_data():
    """Extract data from API."""
    data_string = extractors.extract_drap_data(d_rap_url)
    return data_string


@task(log_prints=True, retries=3, retry_delay_seconds=5)
def transform_data(data_string):
    metadata, df_wide, df_long = transformers.parse_drap_data(data_string)
    return (metadata, df_wide, df_long)

@task(log_prints=True, cache_policy=NO_CACHE)
async def load_data(df_long: DataFrame, conn: Connection):
    """Load data into PostgreSQL."""
    logger = get_logger(__name__)
    try:
        await loaders.insert_drap_data(df_long, conn)
        logger.info("✓ Data loading completed successfully!")
    except Exception as e:
        logger.error(f"✗ Data loading failed: {e}")
        raise

@task(name="Broadcast DRAP to Redis")
async def broadcast_drap_to_redis(df_long: DataFrame, timestamp) -> None:
    """Format the in-memory pandas DataFrame and push straight to Redis."""
    logger = get_logger(__name__)
    
    if df_long.empty:
        logger.warning("DataFrame is empty, nothing to broadcast.")
        return

    # Ensure the timestamp is formatted as ISO 8601 for the frontend
    if hasattr(timestamp, "strftime"):
        formatted_time = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        # Fallback if it's already a string from the metadata
        formatted_time = str(timestamp) 

    # Extract just the columns we need and convert to a native Python list of lists
    # .astype(float) ensures we don't pass weird numpy datatypes to the JSON serializer
    logger.info(df_long)
    points = df_long[['Latitude', 'Longitude', 'Absorption']].astype(float).values.tolist()
    
    payload = {
        "timestamp": formatted_time,
        "count": len(points),
        "points": points
    }
    
    try:
        client = get_redis_client()
        
        await client.set(DRAP_CACHE_KEY, json.dumps(payload), ex=MEDIUM_TTL)
        await client.publish(DRAP_CHANNEL, "new_data")
        
        await client.aclose()
        logger.info(f"Broadcasted DRAP grid ({len(points)} points) directly from memory to Redis.")
        
    except Exception as e:
        logger.error(f"Failed to broadcast DRAP to Redis: {e}")