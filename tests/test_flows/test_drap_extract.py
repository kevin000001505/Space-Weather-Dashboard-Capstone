# tests/test_flows/test_drap.py
import pytest
import pandas as pd
from tasks.drap import load_data


class TestExtractDrap:
    def test_returns_tuple_of_three(self, transformed_drap):
        assert isinstance(transformed_drap, tuple)
        assert len(transformed_drap) == 3

    def test_df_long_not_empty(self, transformed_drap):
        _, _, df_long = transformed_drap
        assert len(df_long) > 0


class TestLoadDrap:
    @pytest.mark.asyncio
    async def test_inserts_records(self, conn):
        df = pd.DataFrame(
            [
                {"Latitude": 45.0, "Longitude": -90.0, "Absorption": 2.5},
                {"Latitude": 46.0, "Longitude": -91.0, "Absorption": 0.0},
            ]
        )
        await load_data.fn(df, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM drap_region")
        assert count == 1

    @pytest.mark.asyncio
    async def test_empty_df_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM drap_region")

        df_empty = pd.DataFrame(columns=["Latitude", "Longitude", "Absorption"])
        await load_data.fn(df_empty, conn)

        after = await conn.fetchval("SELECT COUNT(*) FROM drap_region")
        assert after == before
