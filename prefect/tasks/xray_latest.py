from prefect import task, get_run_logger
from database.db_tools import get_connection
import requests
import json
from tasks.models import XrayRecord
from tasks.queries import LATEST_X_RAY_INSERT_SQL

solar_flare_url = (
    "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json"
)
solar_flare_url_backup = (
    "https://services.swpc.noaa.gov/json/goes/secondary/xray-flares-latest.json"
)


def parse_xray_data(xray_data, logger: get_run_logger):
    """Parse X-ray data into a format suitable for database insertion."""
    parsed_data = []
    for item in xray_data:
        try:
            # Create XrayRecord using Pydantic model for validation
            xray_record = XrayRecord(
                time_tag=item.get("time_tag"),
                satellite=item.get("satellite"),
                current_class=item.get("current_class"),
                current_ratio=item.get("current_ratio"),
                current_int_xrlong=item.get("current_int_xrlong"),
                begin_time=item.get("begin_time"),
                begin_class=item.get("begin_class"),
                max_time=item.get("max_time"),
                max_class=item.get("max_class"),
                max_xrlong=item.get("max_xrlong"),
                end_time=item.get("end_time"),
                end_class=item.get("end_class"),
                max_ratio_time=item.get("max_ratio_time"),
                max_ratio=item.get("max_ratio"),
            )
            logger.info(f"Parsed X-ray record: {xray_record}")
            parsed_data.append(xray_record.to_tuple())
        except Exception as e:
            logger.warning(f"Failed to parse X-ray record: {e}")
            continue

    return parsed_data


@task(log_prints=True, retries=3, retry_delay_seconds=5)
async def extract_xray_data():
    """Extract X-ray data from API."""
    xray_data = None
    logger = get_run_logger()
    try:
        response = requests.get(solar_flare_url)
        response.raise_for_status()

        # Try normal parsing first
        xray_data = response.json()
    except json.JSONDecodeError:
        # Fallback: try to extract the first JSON array/object
        text = response.text
        start = text.find("[")
        end = text.rfind("]")
        if start == -1:
            xray_data = json.loads("[" + text)

        if end == -1:
            xray_data = json.loads(text + "]")

        if start == -1 and end == -1:
            xray_data = json.loads(f"[{text}]")

    if xray_data is None or not isinstance(xray_data, list):
        logger.info("Start backup plan to secondary satellite data source.")
        xray_data = extract_xray_data_backup()

    else:
        logger.info(
            f"✓ X-ray data request successful! Retrieved {len(xray_data)} records"
        )

    parsed_xray_data = parse_xray_data(xray_data, logger)

    if not parsed_xray_data:
        logger.warning("No valid X-ray records to insert")
        return xray_data

    async with get_connection() as conn:
        await conn.executemany(LATEST_X_RAY_INSERT_SQL, parsed_xray_data)
        logger.info(
            f"✓ X-ray data inserted successfully! {len(parsed_xray_data)} records"
        )

    return xray_data


def extract_xray_data_backup():
    """Extract X-ray data from backup API."""
    response = requests.get(solar_flare_url_backup)
    response.raise_for_status()

    try:
        response = requests.get(solar_flare_url_backup)
        response.raise_for_status()

        # Try normal parsing first
        xray_data = response.json()
    except json.JSONDecodeError:
        # Fallback: try to extract the first JSON array/object
        text = response.text
        start = text.find("[")
        end = text.rfind("]")
        if start == -1:
            xray_data = json.loads("[" + text)

        if end == -1:
            xray_data = json.loads(text + "]")

        if start == -1 and end == -1:
            xray_data = json.loads(f"[{text}]")

    except Exception as e:
        raise ValueError(f"Backup data source failed: {e}")

    return xray_data
