from prefect import task
from shared.logger import get_logger
import requests
from asyncpg import Connection
from datetime import datetime
from tasks.models import KPIndexRecord
from database.queries import KP_STAGING_DDL, KP_STAGING_COLUMNS, KP_TRANSFORM_SQL
from typing import List

KP_INDEX_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"


@task(retries=3, retry_delay_seconds=5)
def fetch_kp_index() -> List[KPIndexRecord]:
    """Fetch Kp index records from the NOAA API.

    The API returns a list-of-lists where the first row is the header:
      ['time_tag', 'Kp', 'a_running', 'station_count']
    Subsequent rows contain string values that are cast to their proper types.
    """
    logger = get_logger(__name__)
    logger.info(f"Fetching Kp index data from {KP_INDEX_URL}")

    response = requests.get(KP_INDEX_URL, timeout=30)
    response.raise_for_status()

    raw: List[List[str]] = response.json()

    if not raw or len(raw) < 2:
        logger.warning("No Kp index data returned from API")
        return []

    # First row is the header; skip it
    header, rows = raw[0], raw[1:]
    logger.info(f"Received {len(rows)} Kp index rows (header: {header})")

    records: List[KPIndexRecord] = []
    for row in rows:
        try:
            record = KPIndexRecord(
                time_tag=datetime.fromisoformat(row[0]),
                kp=float(row[1]),
                a_running=int(row[2]),
                station_count=int(row[3]),
            )
            records.append(record)
        except Exception as e:
            logger.warning(f"Skipping invalid Kp row {row}: {e}")

    logger.info(f"Parsed {len(records)} valid Kp index records")
    return records


@task
async def store_kp_index(kp_records: List[KPIndexRecord], conn: Connection) -> None:
    """Bulk insert Kp index records into the database."""
    logger = get_logger(__name__)

    if not kp_records:
        logger.warning("No Kp index records to store")
        return

    records = [r.to_tuple() for r in kp_records]
    async with conn.transaction():
        await conn.execute(KP_STAGING_DDL)
        await conn.copy_records_to_table(
            "kp_index_staging",
            records=records,
            columns=KP_STAGING_COLUMNS,
        )
        await conn.execute(KP_TRANSFORM_SQL)
    logger.info(f"Stored {len(records)} Kp index records")
