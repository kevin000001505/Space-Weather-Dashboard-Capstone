# tests/test_flows/test_geomatic.py
import pytest
from tasks.geomatic import load_geoelectric_data


class TestExtractGeoelectric:
    def test_filename_is_string(self, geomatic_filename):
        assert isinstance(geomatic_filename, str)
        assert geomatic_filename.endswith(".json")

    def test_features_is_list(self, raw_geoelectric):
        assert isinstance(raw_geoelectric, list)
        assert len(raw_geoelectric) > 0


class TestTransformGeoelectric:
    def test_returns_list_of_tuples(self, transformed_geoelectric):
        assert isinstance(transformed_geoelectric, list)
        assert len(transformed_geoelectric) > 0


class TestLoadGeoelectric:
    @pytest.mark.asyncio
    async def test_inserts_records(self, conn, transformed_geoelectric):
        await load_geoelectric_data.fn(transformed_geoelectric, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM geoelectric_field")
        assert count > 0

    @pytest.mark.asyncio
    async def test_empty_list_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM geoelectric_field")

        await load_geoelectric_data.fn([], conn)  # should not raise

        after = await conn.fetchval("SELECT COUNT(*) FROM geoelectric_field")
        assert after == before
