from prefect import task, get_run_logger
from database.db_tools import get_connection
import requests
import json
from tasks.models import XraySixHourRecord
from tasks.queries import (
    XRAY_6HOUR_STAGING_DDL,
    XRAY_6HOUR_STAGING_COLUMNS,
    XRAY_6HOUR_TRANSFORM_SQL,
)

XRAY_6HOUR_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json"
XRAY_6HOUR_URL_BACKUP = "https://services.swpc.noaa.gov/json/goes/secondary/xrays-6-hour.json"


def _fetch_json(url: str) -> list:
    """Fetch JSON list from a URL with basic fallback parsing."""
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    try:
        return response.json()
    except requests.exceptions.JSONDecodeError:
        text = response.text
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1:
            return json.loads(text[start : end + 1])
        raise


def parse_xray_6hour_data(xray_data: list, logger) -> list[tuple]:
    """Parse 6-hour X-ray flux records into tuples for DB insertion."""
    parsed = []
    for item in xray_data:
        try:
            record = XraySixHourRecord(
                time_tag=item["time_tag"],
                satellite=item["satellite"],
                flux=item["flux"],
                observed_flux=item["observed_flux"],
                electron_correction=item["electron_correction"],
                electron_contamination=item.get("electron_contaminaton", False),
                energy=item["energy"],
            )
            parsed.append(record.to_tuple())
        except Exception as e:
            logger.warning(f"Skipping invalid X-ray 6-hour record: {e}")
    return parsed


@task(log_prints=True, retries=3, retry_delay_seconds=5)
async def extract_xray_6hour_data():
    """Extract 6-hour X-ray flux data from NOAA GOES primary (with secondary fallback)."""
    logger = get_run_logger()

    try:
        xray_data = _fetch_json(XRAY_6HOUR_URL)
        logger.info(f"Primary source returned {len(xray_data)} records")
    except Exception as e:
        logger.warning(f"Primary source failed ({e}), trying backup...")
        try:
            xray_data = _fetch_json(XRAY_6HOUR_URL_BACKUP)
            logger.info(f"Backup source returned {len(xray_data)} records")
        except Exception as e2:
            raise ValueError(f"Both X-ray 6-hour sources failed: {e2}") from e2

    if not isinstance(xray_data, list) or not xray_data:
        logger.warning("No X-ray 6-hour data returned from API")
        return []

    parsed = parse_xray_6hour_data(xray_data, logger)

    if not parsed:
        logger.warning("No valid X-ray 6-hour records to insert")
        return xray_data

    async with get_connection() as conn:
        async with conn.transaction():
            await conn.execute(XRAY_6HOUR_STAGING_DDL)
            await conn.copy_records_to_table(
                "goes_xray_6hour_staging",
                records=parsed,
                columns=XRAY_6HOUR_STAGING_COLUMNS,
            )
            await conn.execute(XRAY_6HOUR_TRANSFORM_SQL)

    logger.info(f"X-ray 6-hour data inserted: {len(parsed)} records")
    return xray_data
