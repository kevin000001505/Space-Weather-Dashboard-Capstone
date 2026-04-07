"""Tests for airport endpoints."""

import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))

from config import Airport, AirportDetailResponse
from helpers import make_airport_detail_row, make_airport_row


# ---------------------------------------------------------------------------
# GET /api/v1/airports
# ---------------------------------------------------------------------------


async def test_airports_list_200(client, mock_conn, mock_redis):
    mock_conn.fetch.return_value = [make_airport_row()]
    r = await client.get("/api/v1/airports")
    assert r.status_code == 200


async def test_airports_list_schema(client, mock_conn, mock_redis):
    mock_conn.fetch.return_value = [make_airport_row()]
    r = await client.get("/api/v1/airports")
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 1
    Airport(**data[0])  # raises if schema invalid


async def test_airports_list_required_fields(client, mock_conn, mock_redis):
    mock_conn.fetch.return_value = [make_airport_row()]
    r = await client.get("/api/v1/airports")
    item = r.json()[0]
    for field in ("ident", "name", "lat", "lon"):
        assert field in item


async def test_airports_list_limit(client, mock_conn, mock_redis):
    mock_conn.fetch.return_value = [
        make_airport_row(
            ident=f"K{i:03d}", name=f"Airport {i}", lat=float(i), lon=float(-i)
        )
        for i in range(5)
    ]
    r = await client.get("/api/v1/airports?limit=2")
    assert r.status_code == 200
    assert len(r.json()) == 2


async def test_airports_list_404_when_empty(client, mock_conn, mock_redis):
    mock_conn.fetch.return_value = []
    r = await client.get("/api/v1/airports")
    assert r.status_code == 404


async def test_airports_list_debug_response(client, mock_conn, mock_redis):
    mock_conn.fetch.return_value = [make_airport_row()]
    r = await client.get("/api/v1/airports?debug=true")
    assert r.status_code == 200
    data = r.json()
    assert "total_time_ms" in data
    assert "query_time_ms" in data


async def test_airports_from_cache(client, mock_conn, mock_redis):
    """When Redis has cached data, DB should not be queried."""
    cached = [make_airport_row()]
    from validator import airports_adapter

    mock_redis.get.return_value = airports_adapter.dump_json(
        airports_adapter.validate_python(cached)
    )
    r = await client.get("/api/v1/airports")
    assert r.status_code == 200
    mock_conn.fetch.assert_not_called()


# ---------------------------------------------------------------------------
# GET /api/v1/airport/{ident}
# ---------------------------------------------------------------------------


async def test_airport_detail_200(client, mock_conn):
    mock_conn.fetchrow.return_value = make_airport_detail_row()
    r = await client.get("/api/v1/airport/KDCA")
    assert r.status_code == 200


async def test_airport_detail_schema(client, mock_conn):
    mock_conn.fetchrow.return_value = make_airport_detail_row()
    r = await client.get("/api/v1/airport/KDCA")
    AirportDetailResponse(**r.json())  # raises if schema invalid


async def test_airport_detail_nested_arrays(client, mock_conn):
    mock_conn.fetchrow.return_value = make_airport_detail_row()
    r = await client.get("/api/v1/airport/KDCA")
    data = r.json()
    for field in ("runways", "frequencies", "navaids"):
        assert isinstance(data[field], list)


async def test_airport_detail_404(client, mock_conn):
    mock_conn.fetchrow.return_value = None
    r = await client.get("/api/v1/airport/ZZZZ")
    assert r.status_code == 404


async def test_airport_detail_debug(client, mock_conn):
    mock_conn.fetchrow.return_value = make_airport_detail_row()
    r = await client.get("/api/v1/airport/KDCA?debug=true")
    assert r.status_code == 200
    data = r.json()
    assert "total_time_ms" in data
