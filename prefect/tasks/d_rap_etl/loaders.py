import asyncpg
from datetime import datetime, timezone
from tasks.queries import DRAP_DATA_INSERT_SQL


async def insert_drap_data(df_long, conn: asyncpg.Connection):
    """Load DRAP data into PostgreSQL."""
    observed_at = datetime.now(timezone.utc)
    records = [
        (
            observed_at,
            float(row["Longitude"]),
            float(row["Latitude"]),
            float(row["Absorption"]),
        )
        for _, row in df_long.iterrows()
        if float(row["Absorption"]) > 0
    ]

    await conn.executemany(DRAP_DATA_INSERT_SQL, records)
