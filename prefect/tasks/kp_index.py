from prefect import task, get_run_logger
from database.db_tools import get_connection
import requests
from datetime import datetime
from tasks.models import KPIndexRecord
from tasks.queries import KP_INDEX_INSERT_SQL
from typing import List

KP_INDEX_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"


@task(retries=3, retry_delay_seconds=5)
def fetch_kp_index() -> List[KPIndexRecord]:
    """Fetch Kp index records from the NOAA API.

    The API returns a list-of-lists where the first row is the header:
      ['time_tag', 'Kp', 'a_running', 'station_count']
    Subsequent rows contain string values that are cast to their proper types.
    """
    logger = get_run_logger()
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
async def store_kp_index(kp_records: List[KPIndexRecord]) -> None:
    """Bulk insert Kp index records into the database."""
    logger = get_run_logger()

    if not kp_records:
        logger.warning("No Kp index records to store")
        return

    records = [r.to_tuple() for r in kp_records]
    async with get_connection() as conn:
        await conn.executemany(KP_INDEX_INSERT_SQL, records)
    logger.info(f"Stored {len(records)} Kp index records")
