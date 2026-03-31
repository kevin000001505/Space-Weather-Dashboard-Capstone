"""Redis configuration and connection utilities."""

import redis.asyncio as aioredis

# Connection Parameters
REDIS_HOST = "redis"
REDIS_PORT = 6379
REDIS_DB = 0

# Pub/Sub Channels
HEARTBEAT_CHANNEL = "heartbeat_channel"
FLIGHTS_CHANNEL = "flight_updates_channel"
AURORA_CHANNEL = "aurora_updates_channel"
DRAP_CHANNEL = "drap_updates_channel"
XRAY_CHANNEL = "xray_updates_channel"
PROTONFLUX_CHANNEL = "protonflux_updates_channel"
KPINDEX_CHANNEL = "kpindex_updates_channel"
ALERTS_CHANNEL = "alerts_channel"
GEOELECTRIC_CHANNEL = "geoelectric_updates_channel"

# Memory Cache Keys
AIRPORTS_CACHE_KEY = "latest_airports"
FLIGHTS_CACHE_KEY = "latest_flights"
AURORA_CACHE_KEY = "latest_aurora"
DRAP_CACHE_KEY = "latest_drap"
XRAY_CACHE_KEY = "latest_xray"
PROTONFLUX_CACHE_KEY = "latest_protonflux"
KPINDEX_CACHE_KEY = "latest_kpindex"
ALERTS_CACHE_KEY = "latest_alerts"
GEOELECTRIC_CACHE_KEY = "latest_geoelectric"

# Time-To-Live (TTL) Settings (in seconds)
DEFAULT_TTL = 300  # 5 minutes
MEDIUM_TTL = 21600  # 6 hours
LONG_TTL = 43200  # 12 hours
VERY_LONG_TTL = 86400  # 24 hours


def get_redis_client() -> aioredis.Redis:
    """Returns an async Redis client configured for the stack."""
    return aioredis.Redis(
        host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True
    )
