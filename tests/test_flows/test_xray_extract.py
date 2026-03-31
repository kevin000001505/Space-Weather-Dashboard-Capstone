# tests/test_transforms/test_xray_latest.py
import pytest
from tasks.xray_latest import load_xray_6hour_data


class TestFetchXray6Hours:
    def test_returns_list(self, parse_xray_6hours):
        assert isinstance(parse_xray_6hours, list)
        assert len(parse_xray_6hours) > 0


class TestStoreXray6Hours:
    @pytest.mark.asyncio
    async def test_inserts_records(self, conn, parse_xray_6hours):
        await load_xray_6hour_data.fn(parse_xray_6hours, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM goes_xray_6hour")
        assert count > 0

    @pytest.mark.asyncio
    async def test_empty_list_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM goes_xray_6hour")

        await load_xray_6hour_data.fn([], conn)

        # Count should not change
        after = await conn.fetchval("SELECT COUNT(*) FROM goes_xray_6hour")
        assert after == before
