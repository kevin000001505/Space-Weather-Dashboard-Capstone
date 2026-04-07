"""Tests for v2 endpoints: /api/v2/{events}/latest and /api/v2/kermit."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))

from config import EventsResponseV2, SnapshotResponseV2

_PAST_START = "2026-01-01T00:00:00Z"
_PAST_END = "2026-01-01T06:00:00Z"
_FUTURE = "2099-01-01T00:00:00Z"

_V2_PAYLOAD = json.dumps(
    {
        "timestamp": "2026-01-01T12:00:00+00:00",
        "points": [2.5, 3.0, 1.8],
    }
)


# ---------------------------------------------------------------------------
# GET /api/v2/{events}/latest
# ---------------------------------------------------------------------------


async def test_v2_drap_latest_200(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/drap/latest")
    assert r.status_code == 200


async def test_v2_aurora_latest_200(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/aurora/latest")
    assert r.status_code == 200


async def test_v2_geoelectric_latest_200(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/geoelectric/latest")
    assert r.status_code == 200


async def test_v2_latest_schema(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/drap/latest")
    EventsResponseV2(**r.json())


async def test_v2_latest_points_are_flat_list(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/drap/latest")
    data = r.json()
    assert isinstance(data["points"], list)
    assert all(isinstance(v, (int, float)) for v in data["points"])


async def test_v2_latest_404(client, mock_conn):
    mock_conn.fetchrow.return_value = None
    r = await client.get("/api/v2/drap/latest")
    assert r.status_code == 404


async def test_v2_latest_invalid_event_422(client):
    r = await client.get("/api/v2/invalid_event/latest")
    assert r.status_code == 422


async def test_v2_latest_debug(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/drap/latest?debug=true")
    assert "total_time_ms" in r.json()


# ---------------------------------------------------------------------------
# GET /api/v2/kermit
# ---------------------------------------------------------------------------


def _make_v2_snapshot_row(ts=None):
    if ts is None:
        ts = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "requested_time": ts,
        "observed_at": ts,
        "points": json.dumps([2.5, 3.0, 1.8]),
    }


async def test_kermit_v2_200(client, mock_conn):
    mock_conn.fetch.return_value = [_make_v2_snapshot_row()]
    r = await client.get(f"/api/v2/kermit?start={_PAST_START}&end={_PAST_END}")
    assert r.status_code == 200


async def test_kermit_v2_schema(client, mock_conn):
    mock_conn.fetch.return_value = [_make_v2_snapshot_row()]
    r = await client.get(f"/api/v2/kermit?start={_PAST_START}&end={_PAST_END}")
    data = r.json()
    assert isinstance(data, list)
    SnapshotResponseV2(**data[0])


async def test_kermit_v2_points_are_flat(client, mock_conn):
    mock_conn.fetch.return_value = [_make_v2_snapshot_row()]
    r = await client.get(f"/api/v2/kermit?start={_PAST_START}&end={_PAST_END}")
    data = r.json()
    points = data[0]["points"]
    assert isinstance(points, list)
    assert all(isinstance(v, (int, float)) for v in points)


async def test_kermit_v2_404(client, mock_conn):
    mock_conn.fetch.return_value = []
    r = await client.get(f"/api/v2/kermit?start={_PAST_START}&end={_PAST_END}")
    assert r.status_code == 404


async def test_kermit_v2_future_start_400(client):
    r = await client.get(f"/api/v2/kermit?start={_FUTURE}")
    assert r.status_code == 400


async def test_kermit_v2_end_before_start_422(client):
    r = await client.get(f"/api/v2/kermit?start={_PAST_END}&end={_PAST_START}")
    assert r.status_code == 422


async def test_kermit_v2_event_aurora(client, mock_conn):
    mock_conn.fetch.return_value = [_make_v2_snapshot_row()]
    r = await client.get(f"/api/v2/kermit?start={_PAST_START}&end={_PAST_END}&event=aurora")
    assert r.status_code == 200


async def test_kermit_v2_event_geoelectric(client, mock_conn):
    mock_conn.fetch.return_value = [_make_v2_snapshot_row()]
    r = await client.get(f"/api/v2/kermit?start={_PAST_START}&end={_PAST_END}&event=geoelectric")
    assert r.status_code == 200


async def test_kermit_v2_timing_header(client, mock_conn):
    mock_conn.fetch.return_value = [_make_v2_snapshot_row()]
    r = await client.get(f"/api/v2/kermit?start={_PAST_START}&end={_PAST_END}")
    assert "X-Process-Time" in r.headers
