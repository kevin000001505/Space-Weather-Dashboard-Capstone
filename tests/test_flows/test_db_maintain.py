import pytest
from contextlib import asynccontextmanager
from unittest.mock import patch
import tasks.db as db_tasks

from tasks.db import (
    initial_drap_db,
    initial_activate_flight_db,
    initial_airport_db,
    # initial_latest_xray_db,
    initial_proton_flux_plot_db,
    initial_kp_index_db,
    initial_alert_db,
    cleanup_old_drap_data,
    initial_geoelectric_db,
    initial_aurora_db,
    initial_xray_6hour_db,
    initial_partition_function,
    create_tables_partition,
)
from flows.db_maintain import initialize_db_flow

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
# Task tests — 
# ---------------------------------------------------------------------------

class TestCoverageEnforcement:
    def test_all_initial_db_tasks_have_test_class(self):
        """Fails if a new initial_*_db task is added without a corresponding test class."""
        
        # Find all initial_*_db tasks in tasks.db
        initial_tasks = [
            name for name in dir(db_tasks)
            if name.startswith("initial_") and name.endswith("_db")
        ]

        # Map task names to expected test class names
        # initial_kp_index_db → TestInitialKpIndexDb
        def to_class_name(task_name: str) -> str:
            return "Test" + "".join(
                part.capitalize() for part in task_name.split("_")
            )

        import sys
        current_module = sys.modules[__name__]

        missing = []
        for task_name in initial_tasks:
            class_name = to_class_name(task_name)
            if not hasattr(current_module, class_name):
                missing.append(f"{task_name} → expected {class_name}")

        assert not missing, (
            f"Missing test classes for these tasks:\n" +
            "\n".join(missing)
        )

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
        await initial_airport_db.fn(conn)
        assert await table_exists(conn, "airports")


class TestInitialActivateFlightDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_activate_flight_db.fn(conn)
        assert await table_exists(conn, "activate_flight")


# class TestInitialLatestXrayDb:
#     @pytest.mark.asyncio
#     async def test_creates_table(self, conn):
#         await initial_latest_xray_db.fn(conn)
#         assert await table_exists(conn, "goes_xray_events")


class TestInitialProtonFluxPlotDb:
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

class TestInitialGeoelectricDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_geoelectric_db.fn(conn)
        assert await table_exists(conn, "geoelectric_field")


class TestInitialAuroraDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_aurora_db.fn(conn)
        assert await table_exists(conn, "aurora_forecast")


class TestInitialXray6hourDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, conn):
        await initial_xray_6hour_db.fn(conn)
        assert await table_exists(conn, "goes_xray_6hour")


class TestFunctionWork:
    @pytest.mark.asyncio
    async def test_initial_partition_function_creates_function(self, conn):
        await initial_partition_function.fn(conn)
        exists = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_monthly_partition_if_missing')"
        )
        assert exists

    @pytest.mark.asyncio
    async def test_create_tables_partition_creates_partition(self, conn):
        from datetime import datetime, timezone
        await initial_drap_db.fn(conn)
        await initial_partition_function.fn(conn)
        now = datetime.now(timezone.utc)
        await create_tables_partition.fn(conn, "drap_region", now)
        partition_name = "drap_region_" + now.strftime("%Y_%m")
        assert await table_exists(conn, partition_name)


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
            # "goes_xray_events",
            "goes_proton_flux",
            "kp_index",
            "alerts",
            "geoelectric_field",
            "aurora_forecast",
            "goes_xray_6hour",
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
