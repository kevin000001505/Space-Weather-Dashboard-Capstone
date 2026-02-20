from db_tools import ensure_table_exists, get_connection, cleanup_old_data
from prefect import flow, task, get_run_logger
from prefect.cache_policies import NO_CACHE
import asyncpg
import requests
import csv
from io import StringIO


@flow(log_prints=True)
async def db_maintenance_flow():
    """Flow to perform database maintenance tasks."""
    print("Starting database maintenance flow...")
    try:
        async with get_connection() as conn:
            print("Cleaning up old DRAP data...")
            await cleanup_old_data(conn, "drap_region", older_than_days=1)
            print("Old data cleanup completed successfully!")

    except Exception as e:
        print(f"Database maintenance failed: {e}")


# Initial DB
@task(cache_policy=NO_CACHE)
async def initial_drap_db(conn: asyncpg.Connection):
    """Task to initialize the DRAP region table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring DRAP region table exists...")
        await ensure_table_exists(conn, "drap_region", create_sql=drap_create_table_sql)
        logger.info("DRAP region table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize DRAP region table: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_activate_flight_db(conn: asyncpg.Connection):
    """Task to initialize the activate_flight table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring activate_flight table exists...")
        await ensure_table_exists(
            conn, "activate_flight", create_sql=activate_flight_create_table_sql
        )
        logger.info("Downloading airports CSV data...")

        # Download CSV
        response = requests.get(
            "https://davidmegginson.github.io/ourairports-data/airports.csv"
        )
        response.raise_for_status()

        logger.info("Parsing CSV data...")

        # Parse CSV
        reader = csv.DictReader(StringIO(response.text))

        # Insert data in batches
        batch_size = 500
        batch = []

        for row in reader:
            # Convert scheduled_service to boolean
            scheduled = row.get("scheduled_service", "no").lower() == "yes"

            batch.append(
                (
                    int(row["id"]),
                    row["ident"],
                    row["type"],
                    row["name"],
                    float(row["latitude_deg"]),
                    float(row["longitude_deg"]),
                    int(row["elevation_ft"]) if row.get("elevation_ft") else None,
                    row.get("continent"),
                    row.get("iso_country"),
                    row.get("iso_region"),
                    row.get("municipality"),
                    scheduled,
                    row.get("icao_code") or None,
                    row.get("iata_code") or None,
                    row.get("gps_code") or None,
                    row.get("local_code") or None,
                )
            )

            if len(batch) >= batch_size:
                await conn.executemany(
                    """INSERT INTO airports 
                    (id, ident, type, name, latitude_deg, longitude_deg, elevation_ft, 
                     continent, iso_country, iso_region, municipality, scheduled_service,
                     icao_code, iata_code, gps_code, local_code)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                    ON CONFLICT (ident) DO NOTHING""",
                    batch,
                )
                logger.info(f"Inserted batch of {len(batch)} airports...")
                batch = []

        # Insert remaining records
        if batch:
            await conn.executemany(
                """INSERT INTO airports 
                (id, ident, type, name, latitude_deg, longitude_deg, elevation_ft, 
                 continent, iso_country, iso_region, municipality, scheduled_service,
                 icao_code, iata_code, gps_code, local_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                ON CONFLICT (ident) DO NOTHING""",
                batch,
            )
            logger.info(f"Inserted final batch of {len(batch)} airports...")

        logger.info("Airports data loaded successfully!")

    except Exception as e:
        logger.error(f"Failed to load airports data: {e}")
        raise


@task(cache_policy=NO_CACHE)
async def initial_airport_db(conn: asyncpg.Connection):
    """Task to initialize the airports table."""
    logger = get_run_logger()
    try:
        logger.info("Ensuring airports table exists...")
        await ensure_table_exists(conn, "airports", create_sql=airport_create_table_sql)
        logger.info("airports table is ready!")

    except Exception as e:
        logger.error(f"Failed to initialize airports table: {e}")
        raise


@flow(log_prints=True)
async def initialize_db_flow():
    """Flow to initialize the database schema."""
    print("Starting database initialization flow...")
    try:
        async with get_connection() as conn:
            await initial_drap_db(conn)
            await initial_airport_db(conn)
            await initial_activate_flight_db(conn)
            print("Database initialization completed successfully!")

    except Exception as e:
        print(f"Database initialization failed: {e}")


drap_create_table_sql = """
CREATE TABLE IF NOT EXISTS drap_region (
    observed_at timestamptz NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    absorption double precision NOT NULL,
    PRIMARY KEY (observed_at, location)
);

CREATE INDEX IF NOT EXISTS absorption_grid_loc_gix
ON drap_region
USING GIST (location);

CREATE INDEX IF NOT EXISTS absorption_grid_time_idx
ON drap_region (observed_at);
"""

activate_flight_create_table_sql = """
CREATE TABLE IF NOT EXISTS activate_flight (
    time        TIMESTAMPTZ NOT NULL, -- Maps to 'timestamp' (last_contact)
    icao24      CHAR(6) NOT NULL,     -- Fixed 6-char Hex
    callsign    VARCHAR(8),           -- Max 8 chars
    origin_country VARCHAR(100),      -- Country of origin
    
    -- Position Data
    time_pos    TIMESTAMPTZ,          -- Maps to 'last_position'
    lat         DOUBLE PRECISION,     -- Latitude and Longitude as DOUBLE PRECISION for better accuracy
    lon         DOUBLE PRECISION,
    geo_altitude REAL,                -- Geometric altitude (meters)
    baro_altitude REAL,               -- Barometric altitude (meters)
    
    -- Movement Data
    velocity    REAL,                 -- Groundspeed (m/s)
    heading     REAL,                 -- Track (degrees)
    vert_rate   REAL,                 -- Vertical rate (m/s)
    on_ground   BOOLEAN DEFAULT FALSE,-- True if the aircraft is on the ground

    -- Metadata
    squawk      VARCHAR(8),           -- Transponder code
    spi         BOOLEAN DEFAULT FALSE,-- Special Purpose Indicator
    source      SMALLINT,             -- 0=ADS-B, 1=ASTERIX, 2=MLAT, 3=FLARM
    sensors     INTEGER[],            -- Array of sensor IDs
    
    -- Spatial Index Column
    geom        GEOMETRY(POINT, 4326),-- PostGIS geometry column for spatial queries using WGS 84 coordinate system (SRID 4326)
    
    -- The column collect multiple points for the flight path --
    path_geom GEOMETRY(MultiPoint, 4326),

    -- Combination of time and icao24 as PRIMARY KEY for uniqueness
    PRIMARY KEY (icao24)
);
"""

airport_create_table_sql = """
CREATE TABLE IF NOT EXISTS airports (
    id INTEGER PRIMARY KEY,
    ident VARCHAR(10) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude_deg DOUBLE PRECISION NOT NULL,
    longitude_deg DOUBLE PRECISION NOT NULL,
    elevation_ft INTEGER,
    continent VARCHAR(2),
    iso_country VARCHAR(2),
    iso_region VARCHAR(10),
    municipality VARCHAR(255),
    scheduled_service BOOLEAN DEFAULT FALSE,
    icao_code VARCHAR(4),
    iata_code VARCHAR(3),
    gps_code VARCHAR(4),
    local_code VARCHAR(10),
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS airports_geom_gix ON airports USING GIST (geom);
"""
