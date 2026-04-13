"""Tests for root and health endpoints."""

from unittest.mock import patch

from starlette.responses import Response as StarletteResponse


def _fake_file_response(*args, **kwargs):
    return StarletteResponse(content=b"GIF89a", media_type="image/gif")


async def test_root_returns_200(client):
    r = await client.get("/")
    assert r.status_code == 200


async def test_root_response_body(client):
    r = await client.get("/")
    data = r.json()
    assert data["message"] == "D-RAP Data API"
    assert data["status"] == "running"


async def test_root_has_process_time_header(client):
    r = await client.get("/")
    assert "X-Process-Time" in r.headers


async def test_health_returns_200(client):
    r = await client.get("/health")
    assert r.status_code == 200


async def test_health_response_body(client):
    r = await client.get("/health")
    assert r.json() == {"status": "healthy"}


# ---------------------------------------------------------------------------
# GET /api/kermit
# ---------------------------------------------------------------------------


async def test_kermit_gif_200(client):
    with patch("main.FileResponse", side_effect=_fake_file_response):
        r = await client.get("/api/kermit")
    assert r.status_code == 200


async def test_kermit_gif_content_type(client):
    with patch("main.FileResponse", side_effect=_fake_file_response):
        r = await client.get("/api/kermit")
    assert "image/gif" in r.headers["content-type"]
