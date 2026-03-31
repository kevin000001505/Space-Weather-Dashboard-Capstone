# tests/test_transforms/test_kp_index.py
import pytest
from tasks.kp_index import store_kp_index


class TestFetchKpIndex:
    def test_returns_list(self, kp_records):
        assert isinstance(kp_records, list)
        assert len(kp_records) > 0


class TestStoreKpIndex:
    @pytest.mark.asyncio
    async def test_inserts_records(self, conn, kp_records):
        await store_kp_index.fn(kp_records, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM kp_index")
        assert count > 0

    @pytest.mark.asyncio
    async def test_empty_list_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM kp_index")

        await store_kp_index.fn([], conn)  # should not raise

        # Count should not change
        after = await conn.fetchval("SELECT COUNT(*) FROM kp_index")
        assert after == before
