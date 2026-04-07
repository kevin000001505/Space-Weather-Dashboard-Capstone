"""Tests for root and health endpoints."""



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
