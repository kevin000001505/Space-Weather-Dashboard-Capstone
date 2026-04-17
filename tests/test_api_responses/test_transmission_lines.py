"""Tests for GET /api/v1/transmission-lines endpoint."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))

from config import TransmissionLineResponse


def make_transmission_line_row(**overrides):
    base = {
        "objectid": 17,
        "line_id": 140825,
        "type": "AC; OVERHEAD",
        "status": "IN SERVICE",
        "owner": "NOT AVAILABLE",
        "voltage": 345.0,
        "volt_class": "345",
        "inferred": True,
        "sub_1": "ST FRANCIS ENERGY FACILITY",
        "sub_2": "TAP154742",
        "sourcedate": "2017-06-01",
        "val_date": "2018-05-03",
        "shape_len": 9189.72,
        "global_id": "e620957a-b892-4d1b-a204-19c95f5bdccd",
        "geom": json.dumps(
            {
                "type": "LineString",
                "coordinates": [[-90.179, 36.586], [-90.180, 36.587]],
            }
        ),
        "length": 7.37,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# GET /api/v1/transmission-lines
# ---------------------------------------------------------------------------


async def test_transmission_lines_200(client, mock_conn):
    mock_conn.fetch.return_value = [make_transmission_line_row()]
    r = await client.get("/api/v1/transmission-lines")
    assert r.status_code == 200


async def test_transmission_lines_returns_list(client, mock_conn):
    mock_conn.fetch.return_value = [make_transmission_line_row()]
    r = await client.get("/api/v1/transmission-lines")
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 1


async def test_transmission_lines_schema(client, mock_conn):
    mock_conn.fetch.return_value = [make_transmission_line_row()]
    r = await client.get("/api/v1/transmission-lines")
    item = r.json()[0]
    TransmissionLineResponse(**item)  # raises if schema is invalid


async def test_transmission_lines_required_fields(client, mock_conn):
    mock_conn.fetch.return_value = [make_transmission_line_row()]
    r = await client.get("/api/v1/transmission-lines")
    item = r.json()[0]
    for field in ("objectid", "line_id", "geom"):
        assert field in item


async def test_transmission_lines_geom_is_dict(client, mock_conn):
    mock_conn.fetch.return_value = [make_transmission_line_row()]
    r = await client.get("/api/v1/transmission-lines")
    item = r.json()[0]
    assert isinstance(item["geom"], dict)
    assert item["geom"]["type"] == "LineString"


async def test_transmission_lines_empty_db(client, mock_conn):
    mock_conn.fetch.return_value = []
    r = await client.get("/api/v1/transmission-lines")
    assert r.status_code == 200
    assert r.json() == []


async def test_transmission_lines_multiple_rows(client, mock_conn):
    mock_conn.fetch.return_value = [
        make_transmission_line_row(objectid=i, line_id=i * 100)
        for i in range(1, 4)
    ]
    r = await client.get("/api/v1/transmission-lines")
    assert r.status_code == 200
    assert len(r.json()) == 3


async def test_transmission_lines_nullable_fields(client, mock_conn):
    mock_conn.fetch.return_value = [
        make_transmission_line_row(owner=None, voltage=None, inferred=None)
    ]
    r = await client.get("/api/v1/transmission-lines")
    assert r.status_code == 200
    item = r.json()[0]
    assert item["owner"] is None
    assert item["voltage"] is None
