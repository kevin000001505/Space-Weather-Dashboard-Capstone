# tests/test_flows/test_proton_flux_plot.py
import pytest
from tasks.proton_flux_plot import store_proton_flux_plot


class TestFetchProtonFlux:
    def test_returns_list(self, proton_flux_plots):
        assert isinstance(proton_flux_plots, list)
        assert len(proton_flux_plots) > 0


class TestStoreProtonFlux:
    @pytest.mark.asyncio
    async def test_inserts_records(self, conn, proton_flux_plots):
        await store_proton_flux_plot.fn(proton_flux_plots, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM goes_proton_flux")
        assert count > 0

    @pytest.mark.asyncio
    async def test_empty_list_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM goes_proton_flux")

        await store_proton_flux_plot.fn([], conn)  # should not raise

        after = await conn.fetchval("SELECT COUNT(*) FROM goes_proton_flux")
        assert after == before
