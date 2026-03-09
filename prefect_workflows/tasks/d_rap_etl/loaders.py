from datetime import datetime, timezone
from tasks.queries import DRAP_DATA_INSERT_SQL
from asyncpg.pool import PoolConnectionProxy
from tasks.models import DrapRecord
from prefect_workflows import get_run_logger


async def insert_drap_data(df_long, conn: PoolConnectionProxy):
    """Load DRAP data into PostgreSQL."""
    logger = get_run_logger()
    observed_at = datetime.now(timezone.utc)
    records = []
    for _, row in df_long.iterrows():
        try:
            absorption = float(row["Absorption"])
            if absorption > 0:
                record = DrapRecord(
                    observed_at=observed_at,
                    longitude=float(row["Longitude"]),
                    latitude=float(row["Latitude"]),
                    absorption=absorption,
                )
                records.append(record.to_tuple())
        except (ValueError, KeyError) as e:
            logger.warning(f"Skipping row due to error: {e}")
            continue

    logger.info(f"Prepared {len(records)} DRAP records for insertion.")
    await conn.executemany(DRAP_DATA_INSERT_SQL, records)
