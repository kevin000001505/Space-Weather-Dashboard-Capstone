"""SQL queries for flight data tasks."""

FLIGHT_STATES_INSERT_QUERY = """
INSERT INTO flight_states 
(time, icao24, callsign, origin_country, time_pos, lat, lon, 
 geo_altitude, baro_altitude, velocity, heading, vert_rate, 
 on_ground, squawk, spi, source, sensors, geom)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
        ST_SetSRID(ST_MakePoint($18, $19), 4326))
ON CONFLICT DO NOTHING
"""

ACTIVATE_FLIGHT_UPSERT_QUERY = """
INSERT INTO activate_flight 
    (time, icao24, callsign, origin_country, time_pos, lat, lon,
    geo_altitude, baro_altitude, velocity, heading, vert_rate,
    on_ground, squawk, spi, source, sensors, geom, path_geom)
VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
    ST_SetSRID(ST_MakePoint($18, $19), 4326), 
    ST_Multi(ST_SetSRID(ST_MakePoint($18, $19), 4326)))
ON CONFLICT (icao24) 
DO UPDATE SET
    path_geom = CASE
        -- State A: New Flight / Takeoff
        WHEN EXCLUDED.on_ground = FALSE AND activate_flight.on_ground = TRUE THEN
            ST_Multi(EXCLUDED.geom)

        -- State B: Lost Position Null Update (e.g. due to signal loss)
        WHEN EXCLUDED.on_ground = FALSE AND (EXCLUDED.lat IS NULL OR EXCLUDED.lon IS NULL) THEN
            activate_flight.path_geom
        
        -- State C: Flight gap > 30 mins and positions within 500m - refresh path_geom
        WHEN EXCLUDED.on_ground = FALSE 
            AND EXCLUDED.time_pos IS NOT NULL
            AND (EXCLUDED.time_pos - activate_flight.time_pos) > INTERVAL '30 minutes'
            AND ST_Distance(activate_flight.geom::geography, EXCLUDED.geom::geography) <= 500 THEN
            ST_Multi(EXCLUDED.geom)

        -- State D: Normal flying
        ELSE
            ST_Multi(ST_CollectionExtract(
                ST_Collect(activate_flight.path_geom, EXCLUDED.geom), 1
            ))
    END,

    time = EXCLUDED.time,
    time_pos = COALESCE(EXCLUDED.time_pos, activate_flight.time_pos),
    callsign = EXCLUDED.callsign,
    origin_country = EXCLUDED.origin_country,
    lat = COALESCE(EXCLUDED.lat, activate_flight.lat),
    lon = COALESCE(EXCLUDED.lon, activate_flight.lon),
    geom = COALESCE(EXCLUDED.geom, activate_flight.geom),
    geo_altitude = COALESCE(EXCLUDED.geo_altitude, activate_flight.geo_altitude),
    baro_altitude = COALESCE(EXCLUDED.baro_altitude, activate_flight.baro_altitude),
    velocity = EXCLUDED.velocity,
    heading = EXCLUDED.heading,
    squawk = EXCLUDED.squawk,
    spi = EXCLUDED.spi,
    source = EXCLUDED.source,
    sensors = EXCLUDED.sensors,
    vert_rate = EXCLUDED.vert_rate;
"""

CLEANUP_OLD_FLIGHT_DATA_QUERY = """
DELETE FROM flight_states WHERE time < $1
"""

CREATE_PARTITION_IF_MISSING_QUERY = """
SELECT create_partition_if_missing($1)
"""

DRAP_CREATE_TABLE_SQL = """
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


ACTIVATE_FLIGHT_CREATE_TABLE_SQL = """
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


AIRPORT_CREATE_TABLE_SQL = """
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


# AIRPORTS_INSERT_SQL = """
# INSERT INTO airports
# (id, ident, type, name, latitude_deg, longitude_deg, elevation_ft,
#  continent, iso_country, iso_region, municipality, scheduled_service,
#  icao_code, iata_code, gps_code, local_code)
# VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
# ON CONFLICT (ident) DO NOTHING
# """

AIRPORTS_UPSERT_SQL = """
INSERT INTO airports 
(id, ident, type, name, latitude_deg, longitude_deg, elevation_ft, 
 continent, iso_country, iso_region, municipality, scheduled_service,
 icao_code, iata_code, gps_code, local_code)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
ON CONFLICT (ident) DO UPDATE SET
    id = EXCLUDED.id,
    type = EXCLUDED.type,
    name = EXCLUDED.name,
    latitude_deg = EXCLUDED.latitude_deg,
    longitude_deg = EXCLUDED.longitude_deg,
    elevation_ft = EXCLUDED.elevation_ft,
    continent = EXCLUDED.continent,
    iso_country = EXCLUDED.iso_country,
    iso_region = EXCLUDED.iso_region,
    municipality = EXCLUDED.municipality,
    scheduled_service = EXCLUDED.scheduled_service,
    icao_code = EXCLUDED.icao_code,
    iata_code = EXCLUDED.iata_code,
    gps_code = EXCLUDED.gps_code,
    local_code = EXCLUDED.local_code,
    updated_at = CURRENT_TIMESTAMP
"""

DRAP_CREATE_TABLE_SQL = """
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

DRAP_DATA_INSERT_SQL = """
INSERT INTO drap_region (observed_at, location, absorption)
VALUES (
    $1,
    ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
    $4
)
ON CONFLICT (observed_at, location)
DO UPDATE SET absorption = EXCLUDED.absorption
"""
