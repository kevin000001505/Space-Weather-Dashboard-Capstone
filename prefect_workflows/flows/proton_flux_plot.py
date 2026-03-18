"""Proton Flux Plot data ingestion and maintenance flows."""

from prefect import flow
from shared.db_utils import get_connection
from tasks.proton_flux_plot import (
    fetch_proton_flux_plot,
    store_proton_flux_plot,
)


@flow(
    name="Ingest Proton Flux Plot Data",
    log_prints=True,
    retries=3,
    retry_delay_seconds=5,
)
async def ingest_proton_flux_plot_flow():
    """Main flow for ingesting proton flux plot data from NOAA."""
    records = fetch_proton_flux_plot()
    async with get_connection() as conn:
        await store_proton_flux_plot(records, conn)
