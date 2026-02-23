"""Flight data ingestion and maintenance flows."""

from prefect import flow
from tasks.flights import (
    fetch_flights,
    clean_records,
    insert_activate_flight,
    insert_batch,
    cleanup_db,
)


@flow(name="Ingest Flight Data", log_prints=True)
async def ingest_flow():
    """Main flow for ingesting flight data from OpenSky."""
    df = fetch_flights()
    records = clean_records(df)
    await insert_activate_flight(records)
    await insert_batch(records)


@flow(name="Daily Maintenance", log_prints=True)
async def maintenance_flow():
    """Daily maintenance flow for cleaning up old flight data."""
    await cleanup_db()
