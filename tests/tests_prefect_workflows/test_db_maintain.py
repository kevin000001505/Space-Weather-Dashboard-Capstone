import os
import pytest
import pytest_asyncio
import asyncpg
from contextlib import asynccontextmanager
from unittest.mock import patch

from tasks.db import (
    initial_drap_db,
    initial_activate_flight_db,
    initial_airports_db,
    initial_latest_xray_db,
    initial_proton_flux_plot_db,
    initial_kp_index_db,
    initial_alert_db,
    cleanup_old_drap_data,
)
from flows.db_maintain import initialize_db_flow


_user = os.environ["DEVELOPER_USER"]
_pass = os.environ["DEVELOPER_PASSWORD"]
_db = os.environ["DEVELOPER_DB"]
_host = os.environ.get("PGHOST", "localhost")
_port = os.environ.get("PGPORT", "5432")
DATABASE_URL = f"postgresql://{_user}:{_pass}@{_host}:{_port}/{_db}"

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="session")
async def pool():
    """One connection pool for the entire test session."""
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    yield pool
    await pool.close()


@pytest_asyncio.fixture
async def conn(pool):
    """
    Per-test transaction that rolls back automatically.
    asyncpg's PoolConnectionProxy satisfies your task type hints directly.
    """
    async with pool.acquire() as connection:
        tx = connection.transaction()
        await tx.start()
        yield connection  # this IS a PoolConnectionProxy
        await tx.rollback()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def table_exists(conn, table_name: str) -> bool:
    row = await conn.fetchrow(
        """
        SELECT EXISTS (
            SELECT FROM pg_catalog.pg_tables
            WHERE schemaname = 'public'
            AND tablename = $1
        )
    """,
        table_name,
    )
    return row["exists"]


# ---------------------------------------------------------------------------
# Individual task tests — pass conn directly via .fn()
# ---------------------------------------------------------------------------


class TestInitialDrapDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_drap_db.fn(conn)
        assert await table_exists(conn, "drap_region")


class TestInitialAirportDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_airports_db.fn(conn)
        assert await table_exists(conn, "airports")


class TestInitialActivateFlightDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_activate_flight_db.fn(conn)
        assert await table_exists(conn, "activate_flight")


class TestInitialXrayDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_latest_xray_db.fn(conn)
        assert await table_exists(conn, "goes_xray_events")


class TestInitialProtonFluxDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_proton_flux_plot_db.fn(conn)
        assert await table_exists(conn, "goes_proton_flux")


class TestInitialKpIndexDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_kp_index_db.fn(conn)
        assert await table_exists(conn, "kp_index")


class TestInitialAlertDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_alert_db.fn(conn)
        assert await table_exists(conn, "alerts")


# ---------------------------------------------------------------------------
# Full flow test — patches get_connection to inject test conn
# ---------------------------------------------------------------------------


class TestInitializeDbFlow:
    @pytest.mark.asyncio
    async def test_all_tables_created(self, conn):
        @asynccontextmanager
        async def mock_get_connection():
            yield conn

        with patch("flows.db_maintain.get_connection", mock_get_connection):
            await initialize_db_flow.fn()

        expected = [
            "drap_region",
            "activate_flight",
            "airports",
            "goes_xray_events",
            "goes_proton_flux",
            "kp_index",
            "alerts",
        ]
        for table in expected:
            assert await table_exists(conn, table), f"Missing table: {table}"

    @pytest.mark.asyncio
    async def test_flow_is_idempotent(self, conn):
        @asynccontextmanager
        async def mock_get_connection():
            yield conn

        with patch("flows.db_maintain.get_connection", mock_get_connection):
            await initialize_db_flow.fn()
            await initialize_db_flow.fn()  # second run must not raise


# ---------------------------------------------------------------------------
# Cleanup task test
# ---------------------------------------------------------------------------


class TestCleanupOldDrapData:
    @pytest.mark.asyncio
    async def test_removes_old_records(self, conn):
        await initial_drap_db.fn(conn)
        await cleanup_old_drap_data.fn(conn, older_than_days=3)

        count = await conn.fetchval(
            "SELECT COUNT(*) FROM drap_region WHERE observed_at < NOW() - INTERVAL '3 days'"
        )
        assert count == 0, "Records older than 3 days should have been deleted"
