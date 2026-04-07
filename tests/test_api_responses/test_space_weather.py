"""Tests for space weather endpoints: kp-index, xray, proton-flux, aurora, alert, geoelectric."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))

from config import (
    AlertResponse,
    AuroraResponse,
    GeoelectricResponse,
    KpIndexResponse,
    ProtonFluxResponse,
    XRayResponse,
)
from helpers import make_alert_row, make_kp_row, make_proton_flux_row, make_xray_row

_PAST_START = "2026-01-01T00:00:00Z"
_PAST_END = "2026-01-01T06:00:00Z"
_FUTURE = "2099-01-01T00:00:00Z"


# ---------------------------------------------------------------------------
# GET /api/v1/kp-index
# ---------------------------------------------------------------------------


async def test_kp_index_200(client, mock_conn):
    mock_conn.fetch.return_value = [make_kp_row()]
    r = await client.get(f"/api/v1/kp-index?start={_PAST_START}&end={_PAST_END}")
    assert r.status_code == 200


async def test_kp_index_schema(client, mock_conn):
    mock_conn.fetch.return_value = [make_kp_row()]
    r = await client.get(f"/api/v1/kp-index?start={_PAST_START}&end={_PAST_END}")
    data = r.json()
    assert isinstance(data, list)
    KpIndexResponse(**data[0])


async def test_kp_index_default_window(client, mock_conn):
    """No start/end → defaults to last 3 hours; should still return 200."""
    mock_conn.fetch.return_value = [make_kp_row()]
    r = await client.get("/api/v1/kp-index")
    assert r.status_code == 200


async def test_kp_index_future_start_400(client):
    r = await client.get(f"/api/v1/kp-index?start={_FUTURE}")
    assert r.status_code == 400


async def test_kp_index_end_before_start_422(client):
    r = await client.get(f"/api/v1/kp-index?start={_PAST_END}&end={_PAST_START}")
    assert r.status_code == 422


async def test_kp_index_debug(client, mock_conn):
    mock_conn.fetch.return_value = [make_kp_row()]
    r = await client.get(
        f"/api/v1/kp-index?start={_PAST_START}&end={_PAST_END}&debug=true"
    )
    assert r.status_code == 200
    assert "total_time_ms" in r.json()


# ---------------------------------------------------------------------------
# GET /api/v1/xray
# ---------------------------------------------------------------------------


async def test_xray_200(client, mock_conn):
    mock_conn.fetch.return_value = [make_xray_row()]
    r = await client.get(f"/api/v1/xray?start={_PAST_START}&end={_PAST_END}")
    assert r.status_code == 200


async def test_xray_schema(client, mock_conn):
    mock_conn.fetch.return_value = [make_xray_row()]
    r = await client.get(f"/api/v1/xray?start={_PAST_START}&end={_PAST_END}")
    data = r.json()
    assert isinstance(data, list)
    XRayResponse(**data[0])


async def test_xray_future_start_400(client):
    r = await client.get(f"/api/v1/xray?start={_FUTURE}")
    assert r.status_code == 400


async def test_xray_end_before_start_422(client):
    r = await client.get(f"/api/v1/xray?start={_PAST_END}&end={_PAST_START}")
    assert r.status_code == 422


async def test_xray_debug(client, mock_conn):
    mock_conn.fetch.return_value = [make_xray_row()]
    r = await client.get(f"/api/v1/xray?start={_PAST_START}&end={_PAST_END}&debug=true")
    assert "total_time_ms" in r.json()


# ---------------------------------------------------------------------------
# GET /api/v1/proton-flux
# ---------------------------------------------------------------------------


async def test_proton_flux_200(client, mock_conn):
    mock_conn.fetch.return_value = [make_proton_flux_row()]
    r = await client.get(f"/api/v1/proton-flux?start={_PAST_START}&end={_PAST_END}")
    assert r.status_code == 200


async def test_proton_flux_schema(client, mock_conn):
    mock_conn.fetch.return_value = [make_proton_flux_row()]
    r = await client.get(f"/api/v1/proton-flux?start={_PAST_START}&end={_PAST_END}")
    data = r.json()
    ProtonFluxResponse(**data[0])


async def test_proton_flux_future_start_400(client):
    r = await client.get(f"/api/v1/proton-flux?start={_FUTURE}")
    assert r.status_code == 400


async def test_proton_flux_end_before_start_422(client):
    r = await client.get(f"/api/v1/proton-flux?start={_PAST_END}&end={_PAST_START}")
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/aurora
# ---------------------------------------------------------------------------


async def test_aurora_200(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "timestamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "points": json.dumps([[38.5, -77.0, 0.5], [39.0, -78.0, 0.8]]),
    }
    r = await client.get("/api/v1/aurora")
    assert r.status_code == 200


async def test_aurora_schema(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "timestamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "points": json.dumps([[38.5, -77.0, 0.5]]),
    }
    r = await client.get("/api/v1/aurora")
    AuroraResponse(**r.json())


async def test_aurora_points_are_lists(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "timestamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "points": json.dumps([[38.5, -77.0, 0.5], [39.0, -78.0, 0.8]]),
    }
    r = await client.get("/api/v1/aurora")
    data = r.json()
    assert isinstance(data["points"], list)
    assert isinstance(data["points"][0], list)


async def test_aurora_404(client, mock_conn):
    mock_conn.fetchrow.return_value = None
    r = await client.get("/api/v1/aurora")
    assert r.status_code == 404


async def test_aurora_debug(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "timestamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "points": json.dumps([[38.5, -77.0, 0.5]]),
    }
    r = await client.get("/api/v1/aurora?debug=true")
    assert "total_time_ms" in r.json()


# ---------------------------------------------------------------------------
# GET /api/v1/alert
# ---------------------------------------------------------------------------


async def test_alert_200(client, mock_conn):
    mock_conn.fetch.return_value = [make_alert_row()]
    r = await client.get("/api/v1/alert")
    assert r.status_code == 200


async def test_alert_schema(client, mock_conn):
    mock_conn.fetch.return_value = [make_alert_row()]
    r = await client.get("/api/v1/alert")
    data = r.json()
    assert isinstance(data, list)
    AlertResponse(**data[0])


async def test_alert_empty_returns_200(client, mock_conn):
    """Empty alert list is valid (not a 404)."""
    mock_conn.fetch.return_value = []
    r = await client.get("/api/v1/alert")
    assert r.status_code == 200
    assert r.json() == []


async def test_alert_days_param(client, mock_conn):
    mock_conn.fetch.return_value = [make_alert_row()]
    r = await client.get("/api/v1/alert?days=7")
    assert r.status_code == 200
    # Verify days was passed to the DB query
    call_args = mock_conn.fetch.call_args
    assert call_args[0][1] == 7


async def test_alert_days_out_of_range(client, mock_conn):
    r = await client.get("/api/v1/alert?days=0")
    assert r.status_code == 422
    r2 = await client.get("/api/v1/alert?days=31")
    assert r2.status_code == 422


async def test_alert_debug(client, mock_conn):
    mock_conn.fetch.return_value = [make_alert_row()]
    r = await client.get("/api/v1/alert?debug=true")
    assert "total_time_ms" in r.json()


# ---------------------------------------------------------------------------
# GET /api/v1/geoelectric/latest
# ---------------------------------------------------------------------------


async def test_geoelectric_200(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "timestamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "points": json.dumps([[38.5, -77.0, 0.3, 1], [39.0, -78.0, 0.5, 1]]),
    }
    r = await client.get("/api/v1/geoelectric/latest")
    assert r.status_code == 200


async def test_geoelectric_schema(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "timestamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "points": json.dumps([[38.5, -77.0, 0.3, 1]]),
    }
    r = await client.get("/api/v1/geoelectric/latest")
    GeoelectricResponse(**r.json())


async def test_geoelectric_404(client, mock_conn):
    mock_conn.fetchrow.return_value = None
    r = await client.get("/api/v1/geoelectric/latest")
    assert r.status_code == 404


async def test_geoelectric_debug(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "timestamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "points": json.dumps([[38.5, -77.0, 0.3, 1]]),
    }
    r = await client.get("/api/v1/geoelectric/latest?debug=true")
    assert "total_time_ms" in r.json()
