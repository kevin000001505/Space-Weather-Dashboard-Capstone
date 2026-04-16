"""Flight data ingestion and maintenance flows."""

from prefect import flow
from shared.db_utils import get_connection
from tasks.flights import (
    fetch_flights,
    clean_records,
    insert_batch,
    broadcast_active_flights_to_redis,
)


@flow(name="Ingest Flight Data", log_prints=True)
async def ingest_flow():
    """Main flow for ingesting flight data from OpenSky."""
    df = fetch_flights()
    records = clean_records(df)
    async with get_connection() as conn:
        await insert_batch(records, conn)

        if records:
            await broadcast_active_flights_to_redis(conn)
        
