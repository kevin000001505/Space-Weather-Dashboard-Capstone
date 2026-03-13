from datetime import datetime, timezone
from tasks.queries import DRAP_STAGING_DDL, DRAP_STAGING_COLUMNS, DRAP_TRANSFORM_SQL
from asyncpg.pool import PoolConnectionProxy
from tasks.models import DrapRecord
from prefect import get_run_logger


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
    async with conn.transaction():
        await conn.execute(DRAP_STAGING_DDL)
        await conn.copy_records_to_table(
            "drap_region_staging",
            records=records,
            columns=DRAP_STAGING_COLUMNS,
        )
        await conn.execute(DRAP_TRANSFORM_SQL)
    logger.info(f"DRAP COPY+transform complete: {len(records)} records processed.")
