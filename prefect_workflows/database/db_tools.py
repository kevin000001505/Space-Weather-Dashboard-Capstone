import asyncpg
from typing import AsyncIterator, cast
from contextlib import asynccontextmanager
from asyncio import Lock
import os


# Singleton pool instance
_pool = None
_pool_lock = Lock()

async def get_pool() -> asyncpg.Pool:
    """Get or create the connection pool."""
    global _pool
    if _pool is None: # First check without lock for performance
        async with _pool_lock: # Lock to prevent race conditions
            if _pool is None: # Double-check after acquiring lock
                _pool = await asyncpg.create_pool(
                    host="postgis",
                    port=5432,
                    user=os.getenv("DEVELOPER_USER"),
                    password=os.getenv("DEVELOPER_PASSWORD"),
                    database=os.getenv("DEVELOPER_DB"),
                    min_size=2,
                    max_size=10,
                    command_timeout=60,
                    server_settings={
                        'lock_timeout': '10s',        
                        'statement_timeout': '60s',  
                    }
                )

    return _pool


@asynccontextmanager
async def get_connection() -> AsyncIterator[asyncpg.Connection]:
    """Get a connection from the pool."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield cast(asyncpg.Connection, conn)


async def ensure_table_exists(conn: asyncpg.Connection, table_name: str, create_sql: str) -> bool:
    """Check if table exists, create if it doesn't."""
    exists = await conn.fetchval(
        """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
        );
    """,
        table_name,
    )

    if not exists:
        await conn.execute(create_sql)
        return False
    return True


async def close_pool() -> None:
    """Close the pool (call on shutdown)."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def cleanup_old_data(conn, table_name: str, older_than_days: int) -> None:
    """Delete records older than a certain number of days."""
    # Remember to use parameterized queries to prevent SQL injection,
    # even for table names (though in this case we control the input)
    await conn.execute(
        f"""
        DELETE FROM {table_name}
        WHERE observed_at < NOW() - INTERVAL '{older_than_days} days';
    """
    )
