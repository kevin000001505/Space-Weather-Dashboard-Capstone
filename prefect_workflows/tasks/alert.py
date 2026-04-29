import re
import json
import requests
from prefect import task
from prefect.cache_policies import NO_CACHE
from shared.logger import get_logger
from shared.redis import get_redis_client, ALERTS_CACHE_KEY, ALERTS_CHANNEL, MEDIUM_TTL
from shared.alert_parser import parse_message_to_json
from asyncpg import Connection
from datetime import datetime
from typing import List
from database.queries import (
    ALERTS_STAGING_DDL,
    ALERTS_STAGING_COLUMNS,
    ALERTS_TRANSFORM_SQL,
)
from tasks.models import AlertRecord

url = "https://services.swpc.noaa.gov/products/alerts.json"

_REDUNDANT_PATTERNS = re.compile(
    r"^\s*Space Weather Message Code:.*\n?"
    r"|^\s*Serial Number:.*\n?"
    r"|^\s*Issue Time:.*\n?"
    r"|NOAA Space Weather Scale descriptions can be found at\s*\nwww\.swpc\.noaa\.gov/noaa-scales-explanation\s*\n?",
    re.MULTILINE,
)


def _clean_message(message: str) -> str:
    cleaned = _REDUNDANT_PATTERNS.sub("", message)
    # Collapse runs of blank lines to a single blank line, strip leading/trailing whitespace
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


@task(retries=3, retry_delay_seconds=5)
def fetch_alerts() -> List[dict]:
    """Fetch space weather alerts from the NOAA API."""
    logger = get_logger(__name__)
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
    """Parse raw alert data into AlertRecord objects.

    Date-based dedup is no longer done here — the (alert_id, issue_datetime)
    primary key handles it at ingest time. Parsing failures still produce a
    record so the original message is preserved with NULL parsed columns.
    """
    logger = get_logger(__name__)
    records: List[AlertRecord] = []
    for alert in raw_alerts:
        try:
            data_time = datetime.fromisoformat(alert.get("issue_datetime", ""))
            cleaned = _clean_message(alert.get("message", ""))
            parsed: dict = {}
            try:
                parsed = parse_message_to_json(cleaned)
            except Exception as parse_err:
                logger.warning(
                    f"Failed to parse alert {alert.get('product_id')}: {parse_err}"
                )
            record = AlertRecord(
                alert_id=alert.get("product_id", ""),
                issue_datetime=data_time,
                message=cleaned,
                type=parsed.get("type") or None,
                subject=parsed.get("subject") or None,
                fields=parsed.get("fields") or None,
                potential_impacts=parsed.get("potential_impacts") or None,
            )
            records.append(record)
        except Exception as e:
            logger.warning(f"Skipping invalid alert record {alert}: {e}")
    logger.info(f"Parsed {len(records)} alert records")
    return records


@task(retries=3, retry_delay_seconds=5, cache_policy=NO_CACHE)
async def store_alert(alerts_records: List[AlertRecord], conn: Connection) -> None:
    """Store alert records in the database."""
    logger = get_logger(__name__)
    if not alerts_records:
        logger.warning("No alert records to store")
        return

    records = [r.to_tuple() for r in alerts_records]
    async with conn.transaction():
        await conn.execute(ALERTS_STAGING_DDL)
        await conn.copy_records_to_table(
            "alerts_staging",
            records=records,
            columns=ALERTS_STAGING_COLUMNS,
        )
        await conn.execute(ALERTS_TRANSFORM_SQL)

    logger.info(f"Stored {len(records)} alert records")

    payload = [
        {
            "alert_id": r.alert_id,
            "time": r.issue_datetime.isoformat(),
            "message": r.message,
            "parsed_message": r.parsed_payload(),
        }
        for r in alerts_records
    ]
    try:
        client = get_redis_client()
        await client.set(ALERTS_CACHE_KEY, json.dumps(payload), ex=MEDIUM_TTL)
        await client.publish(ALERTS_CHANNEL, "new_data")
        await client.aclose()
    except Exception as e:
        logger.error(f"Failed to broadcast alerts to Redis: {e}")
