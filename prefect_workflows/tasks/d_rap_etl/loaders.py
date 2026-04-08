from datetime import datetime, timezone
from pandas import DataFrame
from database.queries import DRAP_STAGING_DDL, DRAP_STAGING_COLUMNS, DRAP_TRANSFORM_SQL
from asyncpg import Connection
from tasks.models import DrapRecord
from shared.logger import get_logger


async def insert_drap_data(df_long: DataFrame, conn: Connection):
    """Load DRAP data into PostgreSQL."""
    logger = get_logger(__name__)
    observed_at = datetime.now(timezone.utc)
    records = []
    for _, row in df_long.iterrows():
        try:
            absorption = float(row["Absorption"])
            record = DrapRecord(
                observed_at=observed_at,
                longitude=int(row["Longitude"]),
                latitude=int(row["Latitude"]),
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
