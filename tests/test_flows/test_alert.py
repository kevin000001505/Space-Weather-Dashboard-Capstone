# tests/test_transforms/test_alert.py
import pytest
from tasks.alert import store_alert

class TestFetchAlert:

    def test_returns_list(self, raw_alerts):
        assert isinstance(raw_alerts, list)
        assert len(raw_alerts) > 0

class TestParseAlerts:

    def test_returns_data(self, parsed_alerts):
        assert len(parsed_alerts) > 0
    
    def test_removes_noaa_scale_url(self, parsed_alerts):
        """Verify cleanup logic ran — URL should not appear in any message"""
        for record in parsed_alerts:
            assert "www.swpc.noaa.gov/noaa-scales-explanation" not in record.message

    def test_removes_noaa_scale_description_text(self, parsed_alerts):
        for record in parsed_alerts:
            assert "NOAA Space Weather Scale descriptions can be found at" not in record.message


class TestStoreAlert:
    @pytest.mark.asyncio
    async def test_inserts_records(self, conn, parsed_alerts):
        await store_alert.fn(parsed_alerts, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM alerts")
        assert count > 0

    @pytest.mark.asyncio
    async def test_empty_list_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM alerts")

        await store_alert.fn([], conn)  # should not raise

        # Count should not change
        after = await conn.fetchval("SELECT COUNT(*) FROM alerts")
        assert after == before