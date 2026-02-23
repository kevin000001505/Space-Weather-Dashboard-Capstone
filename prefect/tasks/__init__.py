"""Prefect tasks package."""

from tasks.flights import (
    fetch_flights,
    insert_batch,
    insert_activate_flight,
    cleanup_db,
    clean_records,
)

__all__ = [
    "fetch_flights",
    "insert_batch",
    "insert_activate_flight",
    "cleanup_db",
    "clean_records",
]
