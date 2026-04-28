"""Flight data ingestion and maintenance flows."""

from prefect import flow
from shared.logger import get_logger
from shared.db_utils import get_connection
from tasks.flights import (
    fetch_flights,
    clean_records,
    stage_flight_records,
    insert_flight_states,
    upsert_activate_flight,
    insert_flight_drap_events,
    drop_flight_staging,
    broadcast_active_flights_to_redis,
    broadcast_flight_drap_alerts_to_redis,
)


@flow(name="Ingest Flight Data", log_prints=True)
async def ingest_flow():
    """Main flow for ingesting flight data from OpenSky."""
    logger = get_logger(__name__)
    df = fetch_flights()
    records = clean_records(df)

    async with get_connection() as conn:
        if records:
            await stage_flight_records(records, conn)

            for task_fn in (
                insert_flight_states,
                upsert_activate_flight,
                insert_flight_drap_events,
            ):
                try:
                    await task_fn(conn)
                except Exception as e:
                    logger.error(f"{task_fn.name} failed after retries: {e}")

            await drop_flight_staging(conn)

            await broadcast_active_flights_to_redis(conn)

        await broadcast_flight_drap_alerts_to_redis(conn)
