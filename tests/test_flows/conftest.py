import os
from datetime import datetime, timezone
import pytest
import pytest_asyncio
import asyncpg
from tasks.kp_index import fetch_kp_index
from tasks.alert import fetch_alerts
from tasks.xray_latest import extract_xray_6hour_data, parse_xray_6hour_data
from tasks.drap import (
    extract_data as drap_extract_data,
    transform_data as drap_transform_data,
)
from tasks.aurora import fetch_aurora_data
from tasks.geomatic import (
    extract_file as geo_extract_file,
    extract_data as geo_extract_data,
    transform_data as geo_transform_data,
)
from tasks.proton_flux_plot import fetch_proton_flux_plot
from database.functions import CREATE_PARTITION_FUNCTION_SQL

GEOELECTRIC_BASE_URL = (
    "https://services.swpc.noaa.gov/json/lists/rgeojson/US-Canada-1D/"
)

# ── DB fixtures ───────────────────────────────────────────────────────────────

_user = os.environ["DEVELOPER_USER"]
_pass = os.environ["DEVELOPER_PASSWORD"]
_db = os.environ["DEVELOPER_DB"]
_host = os.environ.get("PGHOST", "localhost")
_port = os.environ.get("PGPORT", "5432")
DATABASE_URL = f"postgresql://{_user}:{_pass}@{_host}:{_port}/{_db}"


@pytest_asyncio.fixture(scope="session")
async def pool():
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    yield pool
    await pool.close()


@pytest_asyncio.fixture(scope="session")
async def db_setup(pool):
    """Install the partition helper function once for the session."""
    async with pool.acquire() as connection:
        await connection.execute(CREATE_PARTITION_FUNCTION_SQL)


@pytest_asyncio.fixture
async def conn(pool, db_setup):
    async with pool.acquire() as connection:
        tx = connection.transaction()
        await tx.start()
        yield connection
        await tx.rollback()


# ── API fetch fixtures (session scoped — fetch once, reuse) ───────────────────


@pytest.fixture(scope="session")
def kp_records():
    """Fetch once from real API, reuse for all kp tests."""
    return fetch_kp_index.fn()


# -- Alert --
@pytest.fixture(scope="session")
def raw_alerts():
    """Fetch once, reuse for parse tests"""
    return fetch_alerts.fn()


@pytest.fixture(scope="session")
def parsed_alerts(raw_alerts):
    """Run the production parse_alerts task on raw API data."""
    from tasks.alert import parse_alerts

    return parse_alerts.fn(raw_alerts)


# -- Xray 6 hours --
@pytest.fixture(scope="session")
def raw_xray_6hours():
    """Parse once, reuse for store tests"""
    return extract_xray_6hour_data.fn()


@pytest.fixture(scope="session")
def parse_xray_6hours(raw_xray_6hours):
    return parse_xray_6hour_data(raw_xray_6hours)


# -- DRAP --
@pytest.fixture(scope="session")
def drap_result():
    """Fetch raw DRAP data string from API."""
    return drap_extract_data.fn()


@pytest.fixture(scope="session")
def transformed_drap(drap_result):
    """Parse raw DRAP string into (metadata, df_wide, df_long)."""
    return drap_transform_data.fn(drap_result)


# -- Aurora --
@pytest.fixture(scope="session")
def raw_aurora():
    """Fetch once from real API, reuse for aurora tests."""
    return fetch_aurora_data.fn()


# -- Geoelectric --
@pytest.fixture(scope="session")
def geomatic_filename():
    """Fetch the latest geoelectric filename from NOAA listing."""
    return geo_extract_file.fn()


@pytest.fixture(scope="session")
def raw_geoelectric(geomatic_filename):
    """Fetch geoelectric features for the latest file."""
    return geo_extract_data.fn(GEOELECTRIC_BASE_URL + geomatic_filename)


@pytest.fixture(scope="session")
def transformed_geoelectric(raw_geoelectric):
    """Transform raw features into DB-ready tuples."""
    observed_at = datetime.now(timezone.utc)
    return geo_transform_data.fn(raw_geoelectric, observed_at)


# -- Proton Flux --
@pytest.fixture(scope="session")
def proton_flux_plots():
    """Fetch once from real API, reuse for proton flux tests."""
    return fetch_proton_flux_plot.fn()
