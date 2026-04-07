"""Tests for flight endpoints."""

import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))

from config import FlightPathResponse, FlightStatesResponse
from helpers import make_flight_state_row


# ---------------------------------------------------------------------------
# GET /api/v1/flight-path/{icao24}
# ---------------------------------------------------------------------------


async def test_flight_path_200(client, mock_conn):
    mock_conn.fetch.return_value = [
        {
            "icao24": "a1b2c3",
            "callsign": "AAL123",
            "path_points": [[38.85, -77.04], [38.90, -77.10]],
        }
    ]
    r = await client.get("/api/v1/flight-path/a1b2c3")
    assert r.status_code == 200


async def test_flight_path_schema(client, mock_conn):
    mock_conn.fetch.return_value = [
        {
            "icao24": "a1b2c3",
            "callsign": "AAL123",
            "path_points": [[38.85, -77.04], [38.90, -77.10]],
        }
    ]
    r = await client.get("/api/v1/flight-path/a1b2c3")
    data = r.json()
    FlightPathResponse(**data)  # raises if invalid


async def test_flight_path_point_count(client, mock_conn):
    path = [[38.85, -77.04], [38.90, -77.10], [39.00, -77.20]]
    mock_conn.fetch.return_value = [
        {"icao24": "a1b2c3", "callsign": "AAL123", "path_points": path}
    ]
    r = await client.get("/api/v1/flight-path/a1b2c3")
    data = r.json()
    assert data["number_of_points"] == 3
    assert len(data["path_points"]) == 3


async def test_flight_path_404(client, mock_conn):
    mock_conn.fetch.return_value = []
    r = await client.get("/api/v1/flight-path/unknown")
    assert r.status_code == 404


async def test_flight_path_debug(client, mock_conn):
    mock_conn.fetch.return_value = [
        {"icao24": "a1b2c3", "callsign": "AAL123", "path_points": [[38.85, -77.04]]}
    ]
    r = await client.get("/api/v1/flight-path/a1b2c3?debug=true")
    assert r.status_code == 200
    assert "total_time_ms" in r.json()


# ---------------------------------------------------------------------------
# GET /api/v1/active-flight-states/latest
# ---------------------------------------------------------------------------


async def test_active_flights_200(client, mock_conn):
    mock_conn.fetch.return_value = [make_flight_state_row()]
    r = await client.get("/api/v1/active-flight-states/latest")
    assert r.status_code == 200


async def test_active_flights_schema(client, mock_conn):
    mock_conn.fetch.return_value = [make_flight_state_row()]
    r = await client.get("/api/v1/active-flight-states/latest")
    data = r.json()
    FlightStatesResponse(**data)  # raises if invalid


async def test_active_flights_required_fields(client, mock_conn):
    mock_conn.fetch.return_value = [make_flight_state_row()]
    r = await client.get("/api/v1/active-flight-states/latest")
    data = r.json()
    assert "timestamp" in data
    assert "count" in data
    assert isinstance(data["flights"], list)


async def test_active_flights_count_matches(client, mock_conn):
    mock_conn.fetch.return_value = [
        make_flight_state_row(),
        make_flight_state_row(icao24="x1y2z3"),
    ]
    r = await client.get("/api/v1/active-flight-states/latest")
    data = r.json()
    assert data["count"] == 2


async def test_active_flights_limit(client, mock_conn):
    mock_conn.fetch.return_value = [
        make_flight_state_row(icao24=f"a{i}b{i}c{i}") for i in range(5)
    ]
    r = await client.get("/api/v1/active-flight-states/latest?limit=2")
    data = r.json()
    assert data["count"] == 2
    assert len(data["flights"]) == 2


async def test_active_flights_404(client, mock_conn):
    mock_conn.fetch.return_value = []
    r = await client.get("/api/v1/active-flight-states/latest")
    assert r.status_code == 404


async def test_active_flights_debug(client, mock_conn):
    mock_conn.fetch.return_value = [make_flight_state_row()]
    r = await client.get("/api/v1/active-flight-states/latest?debug=true")
    assert r.status_code == 200
    assert "total_time_ms" in r.json()
