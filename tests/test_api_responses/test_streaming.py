"""Tests for GET /api/v1/stream/live (Server-Sent Events)."""

import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "api"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import shared.redis as redis_config


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_pubsub(messages=()):
    """Return a mock Redis pubsub that yields `messages` then stops."""
    pubsub = AsyncMock()
    pubsub.subscribe = AsyncMock()
    pubsub.unsubscribe = AsyncMock()
    pubsub.close = AsyncMock()

    _messages = list(messages)

    async def _listen():
        for msg in _messages:
            yield msg

    pubsub.listen = _listen
    return pubsub


def _channel_message(channel: str) -> dict:
    """Simulate a Redis pub/sub message on the given channel."""
    return {"type": "message", "channel": channel, "data": "1"}


def _subscribe_confirmation(channel: str) -> dict:
    """Simulate the subscribe-confirmation message Redis sends on subscribe."""
    return {"type": "subscribe", "channel": channel, "data": 1}


# ---------------------------------------------------------------------------
# Header / connection tests  (empty pubsub — stream ends immediately)
# ---------------------------------------------------------------------------


async def test_stream_live_200(client, mock_redis):
    mock_redis.pubsub = MagicMock(return_value=_make_mock_pubsub())
    async with client.stream("GET", "/api/v1/stream/live") as r:
        assert r.status_code == 200


async def test_stream_live_content_type(client, mock_redis):
    mock_redis.pubsub = MagicMock(return_value=_make_mock_pubsub())
    async with client.stream("GET", "/api/v1/stream/live") as r:
        assert "text/event-stream" in r.headers["content-type"]


async def test_stream_live_cache_control_header(client, mock_redis):
    mock_redis.pubsub = MagicMock(return_value=_make_mock_pubsub())
    async with client.stream("GET", "/api/v1/stream/live") as r:
        assert r.headers.get("cache-control") == "no-cache"


async def test_stream_live_connection_header(client, mock_redis):
    mock_redis.pubsub = MagicMock(return_value=_make_mock_pubsub())
    async with client.stream("GET", "/api/v1/stream/live") as r:
        assert r.headers.get("connection") == "keep-alive"


# ---------------------------------------------------------------------------
# Event-forwarding tests  (pubsub yields one message then stops)
# ---------------------------------------------------------------------------


async def test_stream_live_yields_planes_event(client, mock_redis):
    """A FLIGHTS_CHANNEL message causes an 'event: planes' SSE frame."""
    flight_payload = json.dumps({"timestamp": "2026-01-01T12:00:00Z", "count": 1})
    mock_redis.get = AsyncMock(return_value=flight_payload)
    mock_redis.pubsub = MagicMock(
        return_value=_make_mock_pubsub([_channel_message(redis_config.FLIGHTS_CHANNEL)])
    )

    async with client.stream("GET", "/api/v1/stream/live") as r:
        body = await r.aread()

    assert b"event: planes" in body
    assert flight_payload.encode() in body


async def test_stream_live_yields_heartbeat(client, mock_redis):
    """A HEARTBEAT_CHANNEL message causes a ': heartbeat' SSE comment."""
    mock_redis.pubsub = MagicMock(
        return_value=_make_mock_pubsub(
            [_channel_message(redis_config.HEARTBEAT_CHANNEL)]
        )
    )

    async with client.stream("GET", "/api/v1/stream/live") as r:
        body = await r.aread()

    assert b": heartbeat" in body


async def test_stream_live_skips_empty_cache(client, mock_redis):
    """If the Redis cache for a channel is empty (None), nothing is yielded."""
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.pubsub = MagicMock(
        return_value=_make_mock_pubsub([_channel_message(redis_config.FLIGHTS_CHANNEL)])
    )

    async with client.stream("GET", "/api/v1/stream/live") as r:
        body = await r.aread()

    assert b"event: planes" not in body


async def test_stream_live_skips_subscribe_confirmation(client, mock_redis):
    """The initial 'subscribe' confirmation message must not produce SSE output."""
    mock_redis.pubsub = MagicMock(
        return_value=_make_mock_pubsub(
            [_subscribe_confirmation(redis_config.FLIGHTS_CHANNEL)]
        )
    )

    async with client.stream("GET", "/api/v1/stream/live") as r:
        body = await r.aread()

    # Only subscribe confirmations in pubsub — expect no data frames
    assert b"event:" not in body
