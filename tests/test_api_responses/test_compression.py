"""Tests for delta-bitpack compression: roundtrip, edge cases, and V2 endpoint."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))

from compression import delta_bitpack_compress, delta_bitpack_decompress


# ---------------------------------------------------------------------------
# Unit tests – compression round-trip
# ---------------------------------------------------------------------------


def test_roundtrip_integers():
    original = [0, 0, 0, 1, 2, 3, 3, 3, 0, 0]
    compressed = delta_bitpack_compress(original)
    restored = delta_bitpack_decompress(compressed)
    assert restored == original


def test_roundtrip_floats():
    original = [1.5, 1.6, 1.7, 1.7, 1.8, 2.0]
    compressed = delta_bitpack_compress(original)
    restored = delta_bitpack_decompress(compressed)
    assert restored == original


def test_roundtrip_single_value():
    original = [42.0]
    compressed = delta_bitpack_compress(original)
    restored = delta_bitpack_decompress(compressed)
    assert restored == original


def test_roundtrip_all_same():
    original = [5.0] * 100
    compressed = delta_bitpack_compress(original)
    restored = delta_bitpack_decompress(compressed)
    assert restored == original


def test_roundtrip_empty():
    compressed = delta_bitpack_compress([])
    restored = delta_bitpack_decompress(compressed)
    assert restored == []


def test_roundtrip_large_range():
    original = [0.0, 10.0, 0.0, 10.0, 5.0, 5.0]
    compressed = delta_bitpack_compress(original)
    restored = delta_bitpack_decompress(compressed)
    assert restored == original


def test_compression_reduces_size():
    """A long run of repeated values should compress significantly."""
    original = [0.0] * 1000 + [1.0] * 500 + [0.0] * 500
    compressed = delta_bitpack_compress(original)
    original_json_size = len(json.dumps(original))
    compressed_json_size = len(json.dumps(compressed))
    assert compressed_json_size < original_json_size


def test_payload_structure():
    compressed = delta_bitpack_compress([1.0, 2.0, 3.0])
    assert "values" in compressed
    assert "bits" in compressed
    assert "count" in compressed
    assert "data" in compressed
    assert compressed["count"] == 3
    assert isinstance(compressed["data"], str)
    assert isinstance(compressed["values"], list)
    assert isinstance(compressed["bits"], int)


# ---------------------------------------------------------------------------
# V2 endpoint integration – compressed response
# ---------------------------------------------------------------------------


_V2_PAYLOAD = json.dumps(
    {
        "timestamp": "2026-01-01T12:00:00+00:00",
        "points": [0.0, 1.0, 2.0, 3.0, 0.0, 0.0],
    }
)


async def test_v2_compressed_200(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/drap/latest?encoding=delta-bitpack")
    assert r.status_code == 200


async def test_v2_compressed_has_encoding_field(client, mock_conn):
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/drap/latest?encoding=delta-bitpack")
    data = r.json()
    assert data["encoding"] == "delta-bitpack"


async def test_v2_compressed_roundtrip(client, mock_conn):
    original_points = [0.0, 1.0, 2.0, 3.0, 0.0, 0.0]
    mock_conn.fetchrow.return_value = {
        "values": json.dumps(
            {
                "timestamp": "2026-01-01T12:00:00+00:00",
                "points": original_points,
            }
        )
    }
    r = await client.get("/api/v2/drap/latest?encoding=delta-bitpack")
    data = r.json()
    restored = delta_bitpack_decompress(data["points"])
    assert restored == original_points


async def test_v2_uncompressed_fallback(client, mock_conn):
    """Without encoding param, V2 returns plain JSON."""
    mock_conn.fetchrow.return_value = {"values": _V2_PAYLOAD}
    r = await client.get("/api/v2/drap/latest")
    data = r.json()
    assert "encoding" not in data
    assert isinstance(data["points"], list)
    assert isinstance(data["points"][0], float)


async def test_v2_compressed_aurora(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "values": json.dumps(
            {
                "timestamp": "2026-01-01T12:00:00+00:00",
                "points": [0.0, 0.0, 5.0, 10.0, 0.0],
            }
        )
    }
    r = await client.get("/api/v2/aurora/latest?encoding=delta-bitpack")
    data = r.json()
    assert data["encoding"] == "delta-bitpack"
    restored = delta_bitpack_decompress(data["points"])
    assert restored == [0.0, 0.0, 5.0, 10.0, 0.0]


async def test_v2_compressed_geoelectric(client, mock_conn):
    mock_conn.fetchrow.return_value = {
        "values": json.dumps(
            {
                "timestamp": "2026-01-01T12:00:00+00:00",
                "points": [0.62, 0.61, 1.06, 0.88],
            }
        )
    }
    r = await client.get("/api/v2/geoelectric/latest?encoding=delta-bitpack")
    data = r.json()
    assert data["encoding"] == "delta-bitpack"
    restored = delta_bitpack_decompress(data["points"])
    assert restored == [0.62, 0.61, 1.06, 0.88]


async def test_v2_404_when_no_data(client, mock_conn):
    mock_conn.fetchrow.return_value = None
    r = await client.get("/api/v2/drap/latest?encoding=delta-bitpack")
    assert r.status_code == 404
