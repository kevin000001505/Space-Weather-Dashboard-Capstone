import csv
from asyncpg import Connection
from prefect import task
from prefect.cache_policies import NO_CACHE
from pydantic import ValidationError

from database.queries import (
    TRANSMISSION_LINES_STAGING_DDL,
    TRANSMISSION_LINES_STAGING_COLUMNS,
    TRANSMISSION_LINES_TRANSFORM_SQL,
)
from shared.logger import get_logger
from tasks.models import TransmissionLineRecord

# Each batch creates/drops its own ON COMMIT DROP temp table so the
# 10 k-row dataset never exceeds PostgreSQL's default 8 MB temp_buffers.
_BATCH_SIZE = 1000


@task(cache_policy=NO_CACHE)
async def ingest_transmission_lines_csv(conn: Connection, csv_path: str) -> None:
    logger = get_logger(__name__)
    logger.info(f"Reading transmission lines CSV from {csv_path}")

    records = []
    skipped = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                record = TransmissionLineRecord(**row)
                records.append(record.to_tuple())
            except ValidationError as e:
                skipped += 1
                logger.warning(f"Skipped row objectid={row.get('OBJECTID')}: {e}")

    logger.info(f"Parsed {len(records)} records, skipped {skipped}.")

    total_batches = (len(records) + _BATCH_SIZE - 1) // _BATCH_SIZE
    for i, offset in enumerate(range(0, len(records), _BATCH_SIZE), start=1):
        chunk = records[offset : offset + _BATCH_SIZE]
        async with conn.transaction():
            await conn.execute(TRANSMISSION_LINES_STAGING_DDL)
            await conn.copy_records_to_table(
                "etl_staging",
                records=chunk,
                columns=TRANSMISSION_LINES_STAGING_COLUMNS,
            )
            await conn.execute(TRANSMISSION_LINES_TRANSFORM_SQL)
        logger.info(f"Batch {i}/{total_batches} committed ({len(chunk)} rows).")

    logger.info(f"Inserted/updated {len(records)} transmission line records.")
