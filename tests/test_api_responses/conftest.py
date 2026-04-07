"""
Shared fixtures for API response tests.

Patching strategy:
- app.router.lifespan_context is replaced with a no-op so no real DB/Redis
  connection is attempted during test startup.
- get_db_connection dependency is overridden with a fixture-supplied AsyncMock.
- redis_config.get_redis_client is patched to return an AsyncMock Redis client.
"""

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import ASGITransport

# Make src/api, repo root, and this test package importable
_repo_root = Path(__file__).parent.parent.parent
_this_dir = Path(__file__).parent
sys.path.insert(0, str(_repo_root / "src" / "api"))
sys.path.insert(0, str(_repo_root))
sys.path.insert(0, str(_this_dir))

from main import app, get_db_connection  # noqa: E402


@asynccontextmanager
async def _noop_lifespan(application):
    """Replace the real lifespan so tests never touch DB or Redis on startup."""
    yield


# Swap out the lifespan immediately on import
app.router.lifespan_context = _noop_lifespan


# ---------------------------------------------------------------------------
# Base fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_redis():
    """AsyncMock Redis client – cache miss by default."""
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    redis.aclose = AsyncMock()
    return redis


@pytest.fixture
def mock_conn():
    """AsyncMock asyncpg connection."""
    return AsyncMock()


@pytest.fixture
async def client(mock_conn, mock_redis):
    """Async HTTP client wired to the FastAPI app with mocked DB + Redis."""

    async def _override_db():
        yield mock_conn

    app.dependency_overrides[get_db_connection] = _override_db

    with patch("main.redis_config.get_redis_client", return_value=mock_redis):
        async with httpx.AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac

    app.dependency_overrides.clear()
