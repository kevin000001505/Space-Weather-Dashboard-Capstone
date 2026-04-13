import json
import numpy as np
from datetime import datetime, timezone
from typing import List, Dict, Any

import requests
from pyquery import PyQuery as pq
from prefect import task
from prefect.cache_policies import NO_CACHE
from shared.logger import get_logger
from asyncpg import Connection
from shared.redis import (
    get_redis_client,
    GEOELECTRIC_CACHE_KEY,
    GEOELECTRIC_CHANNEL,
    MEDIUM_TTL,
)
from shared.compression import delta_bitpack_compress
from tasks.models import GeoelectricRecord
from database.queries import (
    GEOELECTRIC_STAGING_DDL,
    GEOELECTRIC_STAGING_COLUMNS,
    GEOELECTRIC_TRANSFORM_SQL,
)

base_url = "https://services.swpc.noaa.gov/json/lists/rgeojson/US-Canada-1D/"


@task(log_prints=True, retries=3, retry_delay_seconds=5)
def extract_file() -> str:
    """Extract the latest filename from the NOAA geoelectric listing page."""
    logger = get_logger(__name__)
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        raw = pq(response.text)
        items = list(raw("body a").items())
        file_name = items[-1].attr("href")
        if file_name is None:
            raise ValueError("Could not extract filename from href attribute")
        logger.info(f"Latest geoelectric file: {file_name}")
        return str(file_name)
    except Exception as e:
        logger.error(f"Error fetching geoelectric date: {e}")
        return "None"


@task(log_prints=True, retries=3, retry_delay_seconds=5)
def extract_data(url: str) -> List[Dict[str, Any]]:
    """Fetch GeoJSON features from the NOAA geoelectric endpoint."""
    logger = get_logger(__name__)
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()["features"]
        logger.info(f"Fetched {len(data)} geoelectric features from {url}")
        return data
    except Exception as e:
        logger.error(f"Error fetching geoelectric data: {e}")
        return []


@task(log_prints=True)
def transform_data(
    features: List[Dict[str, Any]], observed_at: datetime
) -> List[tuple]:
    """Parse GeoJSON features into GeoelectricRecord tuples."""
    logger = get_logger(__name__)
    records = []
    skipped = 0
    for feature in features:
        try:
            coords = feature["geometry"]["coordinates"]
            props = feature["properties"]
            record = GeoelectricRecord(
                observed_at=observed_at,
                longitude=coords[0],
                latitude=coords[1],
                ex=props["Ex"],
                ey=props["Ey"],
                e_magnitude=np.sqrt(props["Ex"] ** 2 + props["Ey"] ** 2),
                quality_flag=props["quality_flag"],
                distance_nearest_station=props["distance_nearest_station"],
            )
            records.append(record.to_tuple())
        except Exception as e:
            skipped += 1
            if skipped <= 3:
                logger.warning(f"Skipping invalid geoelectric record: {e}")

    if skipped:
        logger.warning(f"Skipped {skipped} invalid geoelectric records total")

    return records


@task(log_prints=True, cache_policy=NO_CACHE, retries=3)
async def load_geoelectric_data(records: List[tuple], conn: Connection) -> None:
    """Bulk-insert geoelectric field records into the database."""
    logger = get_logger(__name__)
    if not records:
        logger.warning("No valid geoelectric records to insert")
        return

    async with conn.transaction():
        await conn.execute(GEOELECTRIC_STAGING_DDL)
        await conn.copy_records_to_table(
            "geoelectric_field_staging",
            records=records,
            columns=GEOELECTRIC_STAGING_COLUMNS,
        )
        await conn.execute(GEOELECTRIC_TRANSFORM_SQL)

    logger.info(f"Geoelectric field data inserted: {len(records)} records")


@task(name="Broadcast Geoelectric to Redis")
async def broadcast_geoelectric_to_redis(
    features: List[Dict[str, Any]], observed_at: datetime
) -> None:
    """Push geoelectric field data to Redis cache and pub/sub channel."""
    logger = get_logger(__name__)
    if not features:
        logger.warning("No geoelectric data to broadcast.")
        return

    try:
        client = get_redis_client()

        # Ensure the timestamp is formatted as ISO 8601 for the frontend
        formatted_time = (
            observed_at.strftime("%Y-%m-%dT%H:%M:%SZ")
            if hasattr(observed_at, "strftime")
            else str(observed_at)
        )

        # Sort features to match events_location order (lat DESC, long ASC)
        sorted_features = sorted(
            features,
            key=lambda f: (
                -f["geometry"]["coordinates"][1],
                f["geometry"]["coordinates"][0],
            ),
        )
        # Extract e_magnitude values and compress
        values = [
            float(np.sqrt(f["properties"]["Ex"] ** 2 + f["properties"]["Ey"] ** 2))
            for f in sorted_features
        ]
        compressed_points = delta_bitpack_compress(values)

        payload = json.dumps(
            {
                "timestamp": formatted_time,
                "encoding": "delta-bitpack",
                "points": compressed_points,
            }
        )
        await client.set(GEOELECTRIC_CACHE_KEY, payload, ex=MEDIUM_TTL)
        await client.publish(GEOELECTRIC_CHANNEL, "new_data")
        await client.aclose()
        logger.info(f"Broadcasted {len(features)} geoelectric records to Redis.")
    except Exception as e:
        logger.error(f"Failed to broadcast geoelectric data to Redis: {e}")


def parse_observed_at(filename: str) -> datetime:
    """Parse the observation datetime from the NOAA filename (e.g. '20231015T120000Z.json')."""
    name = filename.split("-")[0]
    return datetime.strptime(name, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
