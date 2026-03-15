"""Prefect tasks package."""

from tasks.flights import (
    fetch_flights,
    insert_batch,
    cleanup_db,
    clean_records,
    broadcast_active_flights_to_redis,
)

__all__ = [
    "fetch_flights",
    "insert_batch",
    "cleanup_db",
    "clean_records",
    "broadcast_active_flights_to_redis",
]
