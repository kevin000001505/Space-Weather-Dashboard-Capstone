import requests
from prefect import task, get_run_logger
from database.db_tools import get_connection
from datetime import datetime
from typing import List
from tasks.queries import ALERTS_STAGING_DDL, ALERTS_STAGING_COLUMNS, ALERTS_TRANSFORM_SQL
from tasks.models import AlertRecord

url = "https://services.swpc.noaa.gov/products/alerts.json"


@task(retries=3, retry_delay_seconds=5)
def fetch_alerts() -> List[dict]:
    """Fetch space weather alerts from the NOAA API."""
    logger = get_run_logger()
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        logger.info(f"Received {len(data)} alert records")
        return data
    except requests.RequestException as e:
        logger.error(f"Error fetching alerts: {e}")
        return []


@task(retries=3, retry_delay_seconds=5)
def parse_alerts(raw_alerts: List[dict]) -> List[AlertRecord]:
    """Parse raw alert data into AlertRecord objects."""
    logger = get_run_logger()
    records: List[AlertRecord] = []
    for alert in raw_alerts:
        try:
            record = AlertRecord(
                alert_id=alert.get("product_id", ""),
                issue_datetime=datetime.fromisoformat(alert.get("issue_datetime", "")),
                message=alert.get("message", "")
                .replace(
                    "NOAA Space Weather Scale descriptions can be found at",
                    "",
                )
                .replace("www.swpc.noaa.gov/noaa-scales-explanation", ""),
            )
            records.append(record)
        except Exception as e:
            logger.warning(f"Skipping invalid alert record {alert}: {e}")
    logger.info(f"Parsed {len(records)} valid alert records")
    return records


@task(retries=3, retry_delay_seconds=5)
async def store_alert(alerts_records: List[AlertRecord]) -> None:
    """Store alert records in the database."""
    logger = get_run_logger()
    if not alerts_records:
        logger.warning("No alert records to store")
        return

    records = [r.to_tuple() for r in alerts_records]
    async with get_connection() as conn:
        async with conn.transaction():
            await conn.execute(ALERTS_STAGING_DDL)
            await conn.copy_records_to_table(
                "alerts_staging",
                records=records,
                columns=ALERTS_STAGING_COLUMNS,
            )
            await conn.execute(ALERTS_TRANSFORM_SQL)

    logger.info(f"Stored {len(records)} alert records")
