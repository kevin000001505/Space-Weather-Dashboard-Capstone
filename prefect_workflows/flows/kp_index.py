"""Proton Flux Plot data ingestion and maintenance flows."""

from prefect import flow
from config import EVENTS_TIMEOUT
from shared.db_utils import get_connection
from tasks.kp_index import (
    fetch_kp_index,
    store_kp_index,
)


@flow(
    name="Ingest Kp Index Data",
    log_prints=True,
    retries=3,
    retry_delay_seconds=300,
    timeout_seconds=EVENTS_TIMEOUT,
)
async def ingest_kp_index_flow():
    """Main flow for ingesting Kp index data from NOAA."""
    records = fetch_kp_index()
    async with get_connection() as conn:
        await store_kp_index(records, conn)
