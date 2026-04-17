from prefect import flow
from shared.db_utils import get_connection
from shared.logger import get_logger
from tasks.transmission_lines import ingest_transmission_lines_csv

CSV_PATH = "/opt/data/electricity_infra/electric_transmission_lines.csv"


@flow(
    log_prints=True,
    description="One-time ingestion of electric transmission lines from local CSV into PostGIS.",
)
async def transmission_lines_extract_flow(csv_path: str = CSV_PATH) -> None:
    logger = get_logger(__name__)
    logger.info(f"Starting transmission lines ingestion from {csv_path}")

    async with get_connection() as conn:
        await ingest_transmission_lines_csv(conn, csv_path)

    logger.info("Transmission lines ingestion complete.")
