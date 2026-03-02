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
    observed_at TIMESTAMPTZ NOT NULL,
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

LATEST_X_RAY_CREATE_TABLE_SQL = """
-- 1) Create table (names match BaseModel exactly)
CREATE TABLE IF NOT EXISTS goes_xray_events (
  time_tag         timestamptz NOT NULL,          -- Observation timestamp
  satellite        integer     NOT NULL,           -- GOES satellite number

  current_class    text        NULL,               -- Current X-ray class
  current_ratio    double precision NULL CHECK (current_ratio >= 0),
  current_int_xrlong double precision NULL CHECK (current_int_xrlong >= 0),

  begin_time       timestamptz NULL,               -- Event begin time
  begin_class      text        NULL,

  max_time         timestamptz NULL,               -- Maximum time
  max_class        text        NULL,
  max_xrlong       double precision NULL CHECK (max_xrlong >= 0),

  end_time         timestamptz NULL,               -- Event end time
  end_class        text        NULL,

  max_ratio_time   timestamptz NULL,               -- Maximum ratio time
  max_ratio        double precision NULL CHECK (max_ratio >= 0),

  -- Choose a PK/unique key that fits your data behavior:
  -- If you ingest one record per (time_tag, satellite), this is fine.
  CONSTRAINT goes_xray_events_pkey PRIMARY KEY (time_tag, satellite)
);

-- Helpful indexes for time-range queries
CREATE INDEX IF NOT EXISTS ix_goes_xray_events_time_tag ON goes_xray_events (time_tag);
CREATE INDEX IF NOT EXISTS ix_goes_xray_events_satellite ON goes_xray_events (satellite);
"""

LATEST_X_RAY_INSERT_SQL = """
INSERT INTO goes_xray_events (
    time_tag, satellite, current_class, current_ratio,
    current_int_xrlong, begin_time, begin_class, max_time,
    max_class, max_xrlong, end_time, end_class,
    max_ratio_time, max_ratio
)
VALUES (
    $1, $2, $3, $4,
    $5, $6, $7, $8,
    $9, $10, $11, $12,
    $13, $14
)
ON CONFLICT (time_tag, satellite) DO NOTHING;
"""

PROTON_FLUX_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS goes_proton_flux (
  time_tag         timestamptz      NOT NULL,          -- Observation timestamp
  satellite        integer          NOT NULL,           -- GOES satellite number

  flux_10_mev      double precision CHECK (flux_10_mev >= 0),   -- Proton flux >10 MeV
  flux_50_mev      double precision CHECK (flux_50_mev >= 0),   -- Proton flux >50 MeV
  flux_100_mev     double precision CHECK (flux_100_mev >= 0),  -- Proton flux >100 MeV
  flux_500_mev     double precision CHECK (flux_500_mev >= 0),  -- Proton flux >500 MeV

  CONSTRAINT goes_proton_flux_pkey PRIMARY KEY (time_tag, satellite)
);

CREATE INDEX IF NOT EXISTS ix_goes_proton_flux_time_tag ON goes_proton_flux (time_tag);
CREATE INDEX IF NOT EXISTS ix_goes_proton_flux_satellite ON goes_proton_flux (satellite);
"""

PROTON_FLUX_INSERT_SQL = """
INSERT INTO goes_proton_flux (
    time_tag, satellite,
    flux_10_mev, flux_50_mev, flux_100_mev, flux_500_mev
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (time_tag, satellite) DO NOTHING;
"""

KP_INDEX_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS kp_index (
  time_tag         timestamptz       NOT NULL,                     -- Observation timestamp (UTC)
  kp               double precision  CHECK (kp >= 0 AND kp <= 9),  -- Kp index value (0-9)
  a_running        integer           CHECK (a_running >= 0),       -- Running A index
  station_count    integer           CHECK (station_count >= 0),   -- Number of stations reporting

  CONSTRAINT kp_index_pkey PRIMARY KEY (time_tag)
);

CREATE INDEX IF NOT EXISTS ix_kp_index_time_tag ON kp_index (time_tag);
"""

KP_INDEX_INSERT_SQL = """
INSERT INTO kp_index (
    time_tag, kp, a_running, station_count
)
VALUES ($1, $2, $3, $4)
ON CONFLICT (time_tag) DO NOTHING;
"""
