"""Tests for D-RAP endpoints: /api/v1/drap/latest and /api/v1/kermit (v1)."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))

from config import DRAPResponse, SnapshotResponse

_PAST_START = "2026-01-01T00:00:00Z"
_PAST_END = "2026-01-01T06:00:00Z"
_FUTURE = "2099-01-01T00:00:00Z"

_DRAP_PAYLOAD = json.dumps(
    {
        "timestamp": "2026-01-01T12:00:00+00:00",
        "points": [[38.5, -77.0, 2.5], [39.0, -78.0, 3.0]],
    }
)


# ---------------------------------------------------------------------------
# GET /api/v1/drap/latest
# ---------------------------------------------------------------------------


async def test_drap_latest_200(client, mock_conn, mock_redis):
    mock_conn.fetchrow.return_value = {"payload": _DRAP_PAYLOAD}
    r = await client.get("/api/v1/drap/latest")
    assert r.status_code == 200


async def test_drap_latest_schema(client, mock_conn, mock_redis):
    mock_conn.fetchrow.return_value = {"payload": _DRAP_PAYLOAD}
    r = await client.get("/api/v1/drap/latest")
    DRAPResponse(**r.json())


async def test_drap_latest_points_structure(client, mock_conn, mock_redis):
    mock_conn.fetchrow.return_value = {"payload": _DRAP_PAYLOAD}
    r = await client.get("/api/v1/drap/latest")
    data = r.json()
    assert "timestamp" in data
    assert isinstance(data["points"], list)
    assert isinstance(data["points"][0], list)


async def test_drap_latest_404(client, mock_conn, mock_redis):
    mock_conn.fetchrow.return_value = None
    r = await client.get("/api/v1/drap/latest")
    assert r.status_code == 404


async def test_drap_latest_debug(client, mock_conn, mock_redis):
    mock_conn.fetchrow.return_value = {"payload": _DRAP_PAYLOAD}
    r = await client.get("/api/v1/drap/latest?debug=true")
    assert r.status_code == 200
    data = r.json()
    assert "total_time_ms" in data
    assert "query_time_ms" in data


async def test_drap_latest_from_cache(client, mock_conn, mock_redis):
    """When Redis has cached data, DB should not be queried."""
    mock_redis.get.return_value = _DRAP_PAYLOAD
    r = await client.get("/api/v1/drap/latest")
    assert r.status_code == 200
    mock_conn.fetchrow.assert_not_called()


# ---------------------------------------------------------------------------
# GET /api/v1/kermit  (v1 range)
# ---------------------------------------------------------------------------


def _make_snapshot_row(ts=None):
    if ts is None:
        ts = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "requested_time": ts,
        "observed_at": ts,
        "points": json.dumps([[38.5, -77.0, 2.5], [39.0, -78.0, 3.0]]),
    }


async def test_kermit_v1_200(client, mock_conn):
    mock_conn.fetch.return_value = [_make_snapshot_row()]
    r = await client.get(f"/api/v1/kermit?start={_PAST_START}&end={_PAST_END}")
    assert r.status_code == 200


async def test_kermit_v1_schema(client, mock_conn):
    mock_conn.fetch.return_value = [_make_snapshot_row()]
    r = await client.get(f"/api/v1/kermit?start={_PAST_START}&end={_PAST_END}")
    data = r.json()
    assert isinstance(data, list)
    SnapshotResponse(**data[0])


async def test_kermit_v1_points_are_lists(client, mock_conn):
    mock_conn.fetch.return_value = [_make_snapshot_row()]
    r = await client.get(f"/api/v1/kermit?start={_PAST_START}&end={_PAST_END}")
    data = r.json()
    assert isinstance(data[0]["points"], list)
    assert isinstance(data[0]["points"][0], list)


async def test_kermit_v1_404(client, mock_conn):
    mock_conn.fetch.return_value = []
    r = await client.get(f"/api/v1/kermit?start={_PAST_START}&end={_PAST_END}")
    assert r.status_code == 404


async def test_kermit_v1_future_start_400(client):
    r = await client.get(f"/api/v1/kermit?start={_FUTURE}")
    assert r.status_code == 400


async def test_kermit_v1_end_before_start_422(client):
    r = await client.get(f"/api/v1/kermit?start={_PAST_END}&end={_PAST_START}")
    assert r.status_code == 422


async def test_kermit_v1_event_aurora(client, mock_conn):
    mock_conn.fetch.return_value = [_make_snapshot_row()]
    r = await client.get(
        f"/api/v1/kermit?start={_PAST_START}&end={_PAST_END}&event=aurora"
    )
    assert r.status_code == 200


async def test_kermit_v1_event_geoelectric(client, mock_conn):
    mock_conn.fetch.return_value = [_make_snapshot_row()]
    r = await client.get(
        f"/api/v1/kermit?start={_PAST_START}&end={_PAST_END}&event=geoelectric"
    )
    assert r.status_code == 200


async def test_kermit_v1_timing_header(client, mock_conn):
    mock_conn.fetch.return_value = [_make_snapshot_row()]
    r = await client.get(f"/api/v1/kermit?start={_PAST_START}&end={_PAST_END}")
    assert "X-Process-Time" in r.headers
