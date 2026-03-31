from prefect import task
from prefect.cache_policies import NO_CACHE
from shared.logger import get_logger
from asyncpg import Connection
import requests
import json
from tasks.models import ProtonFluxPlot
from database.queries import (
    PROTON_FLUX_STAGING_DDL,
    PROTON_FLUX_STAGING_COLUMNS,
    PROTON_FLUX_TRANSFORM_SQL,
)
from typing import List


@task(retries=3, retry_delay_seconds=5)
def fetch_proton_flux_plot() -> List[ProtonFluxPlot]:
    """Fetch all proton flux plot records from the NOAA API."""
    logger = get_logger(__name__)
    url = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-plot-6-hour.json"
    logger.info(f"Fetching proton flux plot data from {url}")
    response = requests.get(url)
    response.raise_for_status()
    # Map API energy string to model field name
    ENERGY_MAP = {
        ">=10 MeV": "flux_10_mev",
        ">=50 MeV": "flux_50_mev",
        ">=100 MeV": "flux_100_mev",
        ">=500 MeV": "flux_500_mev",
    }

    try:
        data = response.json()

        grouped: dict = {}
        for row in data:
            key = (row["time_tag"], row["satellite"])
            if key not in grouped:
                grouped[key] = {
                    "time_tag": row["time_tag"],
                    "satellite": row["satellite"],
                }
            field = ENERGY_MAP.get(row["energy"])
            if field:
                grouped[key][field] = row["flux"]

        records = [ProtonFluxPlot(**entry) for entry in grouped.values()]
        logger.info(f"Parsed {len(records)} proton flux records")
        return records

    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(
            f"Failed to decode JSON response: {e}", response.text, 0
        )
    except Exception as e:
        raise Exception(f"Error processing proton flux plot data: {e}")


@task(cache_policy=NO_CACHE, retries=3)
async def store_proton_flux_plot(plots: List[ProtonFluxPlot], conn: Connection) -> None:
    """Bulk insert proton flux plot records into the database."""
    logger = get_logger(__name__)
    if not plots:
        logger.warning("No proton flux records to store")
        return

    records = [plot.to_tuple() for plot in plots]
    async with conn.transaction():
        await conn.execute(PROTON_FLUX_STAGING_DDL)
        await conn.copy_records_to_table(
            "goes_proton_flux_staging",
            records=records,
            columns=PROTON_FLUX_STAGING_COLUMNS,
        )
        await conn.execute(PROTON_FLUX_TRANSFORM_SQL)
    logger.info(f"Stored {len(records)} proton flux records")
