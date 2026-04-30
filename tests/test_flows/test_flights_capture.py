"""Tests for the per-table flight ingest tasks used by flights_capture.ingest_flow."""

from datetime import datetime, timezone, timedelta

import pytest

from tasks.flights import (
    stage_flight_records,
    insert_flight_states,
    upsert_activate_flight,
    insert_flight_drap_events,
    drop_flight_staging,
)
from tasks.models import FlightStateRecord


def _make_record(
    icao24: str = "abc123",
    *,
    time: datetime | None = None,
    lat: float = 38.9,
    lon: float = -77.0,
    on_ground: bool = False,
) -> FlightStateRecord:
    """Build a single valid FlightStateRecord for staging tests."""
    t = time or datetime.now(timezone.utc).replace(microsecond=0)
    return FlightStateRecord(
        time=t,
        icao24=icao24,
        callsign="TEST1",
        origin_country="United States",
        time_position=t,
        latitude=lat,
        longitude=lon,
        geo_altitude=10000.0,
        baro_altitude=10000.0,
        velocity=200.0,
        heading=90.0,
        vertical_rate=0.0,
        on_ground=on_ground,
        squawk="1200",
        spi=False,
        position_source=0,
        sensors=None,
        geom_lon=lon,
        geom_lat=lat,
    )


class TestStageFlightRecords:
    @pytest.mark.asyncio
    async def test_populates_unified_staging(self, conn):
        records = [_make_record("abc123"), _make_record("def456", lat=40.0, lon=-75.0)]

        count = await stage_flight_records.fn(records, conn)

        assert count == 2
        staged = await conn.fetchval("SELECT COUNT(*) FROM flight_staging")
        assert staged == 2

        # geom + epoch_time_pos populated by the GEOM update step
        with_geom = await conn.fetchval(
            "SELECT COUNT(*) FROM flight_staging WHERE geom IS NOT NULL"
        )
        assert with_geom == 2

        with_epoch = await conn.fetchval(
            "SELECT COUNT(*) FROM flight_staging WHERE epoch_time_pos IS NOT NULL"
        )
        assert with_epoch == 2

    @pytest.mark.asyncio
    async def test_rerun_resets_staging(self, conn):
        """Re-staging on the same connection should not duplicate rows."""
        await stage_flight_records.fn([_make_record("abc123")], conn)
        await stage_flight_records.fn(
            [_make_record("def456", lat=40.0, lon=-75.0)], conn
        )

        rows = await conn.fetch("SELECT icao24 FROM flight_staging")
        icao_set = {r["icao24"].strip() for r in rows}
        assert icao_set == {"def456"}


class TestInsertFlightStates:
    @pytest.mark.asyncio
    async def test_inserts_from_staging(self, conn):
        rec = _make_record("abc123")
        await stage_flight_records.fn([rec], conn)

        before = await conn.fetchval(
            "SELECT COUNT(*) FROM flight_states WHERE icao24 = $1", "abc123"
        )
        await insert_flight_states.fn(conn)
        after = await conn.fetchval(
            "SELECT COUNT(*) FROM flight_states WHERE icao24 = $1", "abc123"
        )

        assert after == before + 1


class TestUpsertActivateFlight:
    @pytest.mark.asyncio
    async def test_inserts_then_appends_path(self, conn):
        t1 = datetime.now(timezone.utc).replace(microsecond=0)
        t2 = t1 + timedelta(minutes=1)

        # First sighting
        await stage_flight_records.fn([_make_record("abc123", time=t1)], conn)
        await upsert_activate_flight.fn(conn)

        path_after_first = await conn.fetchval(
            "SELECT array_length(path_points, 1) FROM activate_flight WHERE icao24 = $1",
            "abc123",
        )
        assert path_after_first == 1

        # Second sighting — same aircraft, new position, should append
        await stage_flight_records.fn(
            [_make_record("abc123", time=t2, lat=39.5, lon=-76.5)], conn
        )
        await upsert_activate_flight.fn(conn)

        path_after_second = await conn.fetchval(
            "SELECT array_length(path_points, 1) FROM activate_flight WHERE icao24 = $1",
            "abc123",
        )
        assert path_after_second == 2

    @pytest.mark.asyncio
    async def test_landing_resets_path(self, conn):
        t1 = datetime.now(timezone.utc).replace(microsecond=0)
        t2 = t1 + timedelta(minutes=1)

        await stage_flight_records.fn([_make_record("abc123", time=t1)], conn)
        await upsert_activate_flight.fn(conn)

        await stage_flight_records.fn(
            [_make_record("abc123", time=t2, on_ground=True)], conn
        )
        await upsert_activate_flight.fn(conn)

        path_len = await conn.fetchval(
            "SELECT array_length(path_points, 1) FROM activate_flight WHERE icao24 = $1",
            "abc123",
        )
        assert path_len == 1


class TestInsertFlightDrapEvents:
    @pytest.mark.asyncio
    async def test_writes_event_when_drap_overlaps(self, conn):
        now = datetime.now(timezone.utc).replace(microsecond=0)
        lat, lon = 39.0, -77.0  # rounded -> 39, -77

        # Seed a DRAP cell that the staged flight will match on
        # (rounded lat/lon, observed within the 3-hour lookback, absorption > 0)
        await conn.execute(
            """
            INSERT INTO drap_region (observed_at, lat, long, location, absorption)
            VALUES (
                $1, $2::int, $3::int,
                ST_SetSRID(ST_MakePoint($3::float8, $2::float8), 4326)::geography,
                $4
            )
            ON CONFLICT (observed_at, lat, long) DO NOTHING
            """,
            now,
            39,
            -77,
            5.0,
        )

        await stage_flight_records.fn(
            [_make_record("abc123", time=now, lat=lat, lon=lon)], conn
        )
        await insert_flight_drap_events.fn(conn)

        absorption = await conn.fetchval(
            "SELECT absorption FROM flight_drap_events WHERE icao24 = $1 AND time = $2",
            "abc123",
            now,
        )
        assert absorption == 5.0

    @pytest.mark.asyncio
    async def test_no_event_when_no_drap_match(self, conn):
        """Flight with no matching DRAP cell produces no event."""
        now = datetime.now(timezone.utc).replace(microsecond=0)

        await stage_flight_records.fn(
            [_make_record("def456", time=now, lat=12.3, lon=45.6)], conn
        )
        await insert_flight_drap_events.fn(conn)

        count = await conn.fetchval(
            "SELECT COUNT(*) FROM flight_drap_events WHERE icao24 = $1", "def456"
        )
        assert count == 0


class TestDropFlightStaging:
    @pytest.mark.asyncio
    async def test_drops_staging_table(self, conn):
        await stage_flight_records.fn([_make_record("abc123")], conn)

        exists_before = await conn.fetchval(
            "SELECT to_regclass('pg_temp.flight_staging') IS NOT NULL"
        )
        assert exists_before is True

        await drop_flight_staging.fn(conn)

        exists_after = await conn.fetchval(
            "SELECT to_regclass('pg_temp.flight_staging') IS NOT NULL"
        )
        assert exists_after is False
