# tests/test_flows/test_aurora.py
import pytest
from tasks.aurora import load_aurora_data


class TestFetchAurora:

    def test_returns_dict(self, raw_aurora):
        assert isinstance(raw_aurora, dict)

    def test_has_coordinates(self, raw_aurora):
        assert "coordinates" in raw_aurora
        assert len(raw_aurora["coordinates"]) > 0


class TestLoadAurora:

    @pytest.mark.asyncio
    async def test_inserts_records(self, conn, raw_aurora):
        await load_aurora_data.fn(raw_aurora, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM aurora_forecast")
        assert count > 0

    @pytest.mark.asyncio
    async def test_empty_dict_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM aurora_forecast")

        await load_aurora_data.fn({}, conn)  # should not raise

        after = await conn.fetchval("SELECT COUNT(*) FROM aurora_forecast")
        assert after == before
