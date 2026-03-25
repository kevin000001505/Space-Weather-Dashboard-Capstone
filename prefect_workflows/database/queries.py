"""SQL queries for creating tables, indexes, performing upserts, and latest queries to insert into redis for the space weather data pipeline."""

CLEANUP_OLD_FLIGHT_DATA_QUERY = """
DELETE FROM flight_states WHERE time < $1
"""


CREATE_PARTITION_IF_MISSING_QUERY = """
SELECT create_partition_if_missing($1)
"""


CREATE_TABLE_PARTITION_IF_MISSING = """
SELECT create_monthly_partition_if_missing($1, $2)
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
    
    -- Ordered list of [lat, lon] pairs representing the flight path
    path_points DOUBLE PRECISION[][],

    -- Combination of time and icao24 as PRIMARY KEY for uniqueness
    PRIMARY KEY (icao24)
);
"""

# --- Aiport data ---
AIRPORT_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS airports (
    id SERIAL PRIMARY KEY,
    ident VARCHAR(10) NOT NULL UNIQUE,
    type VARCHAR(50),
    name VARCHAR(255),
    elevation_ft REAL,
    continent VARCHAR(2),
    country_name VARCHAR(100),
    iso_country VARCHAR(2) REFERENCES countries(code) ON DELETE SET NULL,
    region_name VARCHAR(100),
    iso_region VARCHAR(10) REFERENCES regions(code) ON DELETE SET NULL,
    local_region VARCHAR(100),
    municipality VARCHAR(100),
    scheduled_service BOOLEAN,
    gps_code VARCHAR(10),
    icao_code VARCHAR(4),
    iata_code VARCHAR(3),
    local_code VARCHAR(10),
    home_link VARCHAR(255),
    wikipedia_link VARCHAR(255),
    keywords VARCHAR(500),
    last_updated TIMESTAMPTZ,
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_airports_ident ON airports(ident);
CREATE INDEX idx_airports_iata ON airports(iata_code);
CREATE INDEX idx_airports_icao ON airports(icao_code);
CREATE INDEX idx_airports_geom ON airports USING GIST(geom);
"""


COUNTRIES_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS countries (
    id INTEGER PRIMARY KEY,
    code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(255),
    continent VARCHAR(2),
    wikipedia_link VARCHAR(255),
    keywords VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_countries_code ON countries(code);
"""


REGIONS_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    local_code VARCHAR(10),
    name VARCHAR(255),
    continent VARCHAR(2),
    iso_country VARCHAR(2) REFERENCES countries(code) ON DELETE CASCADE,
    wikipedia_link VARCHAR(255),
    keywords VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regions_code ON regions(code);
CREATE INDEX idx_regions_iso_country ON regions(iso_country);
"""


FREQUENCIES_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS airport_frequencies (
    id INTEGER PRIMARY KEY,
    airport_ref INTEGER REFERENCES airports(id) ON DELETE CASCADE,
    airport_ident VARCHAR(10) REFERENCES airports(ident) ON DELETE CASCADE,
    type VARCHAR(50),
    description VARCHAR(255),
    frequency_mhz DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_frequencies_airport_ref ON airport_frequencies(airport_ref);
CREATE INDEX idx_frequencies_airport_ident ON airport_frequencies(airport_ident);
CREATE INDEX idx_frequencies_type ON airport_frequencies(type);
"""


AIRPORT_COMMENTS_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS airport_comments (
    id INTEGER PRIMARY KEY,
    airport_ref INTEGER REFERENCES airports(id) ON DELETE CASCADE,
    airport_ident VARCHAR(10) REFERENCES airports(ident) ON DELETE CASCADE,
    subject VARCHAR(255),
    body TEXT,
    author VARCHAR(255),
    date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_airport_ref ON airport_comments(airport_ref);
CREATE INDEX idx_comments_airport_ident ON airport_comments(airport_ident);
"""

NAVAIDS_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS navaids (
    id INTEGER PRIMARY KEY,
    filename VARCHAR(255),
    ident VARCHAR(10),
    name VARCHAR(255),
    type VARCHAR(50),
    frequency_khz INTEGER,
    elevation_ft INTEGER,
    iso_country VARCHAR(2),
    dme_frequency_khz INTEGER,
    dme_channel VARCHAR(10),
    dme_geom GEOMETRY(POINT, 4326),
    dme_elevation_ft INTEGER,
    slaved_variation_deg DOUBLE PRECISION,
    magnetic_variation_deg DOUBLE PRECISION,
    usagetype VARCHAR(50),
    power VARCHAR(50),
    associated_airport VARCHAR(10) REFERENCES airports(ident) ON DELETE SET NULL,
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_navaids_ident ON navaids(ident);
CREATE INDEX idx_navaids_associated_airport ON navaids(associated_airport);
CREATE INDEX idx_navaids_type ON navaids(type);
CREATE INDEX idx_navaids_geom ON navaids USING GIST(geom);
"""


RUNWAYS_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS runways (
    id INTEGER PRIMARY KEY,
    airport_ref INTEGER REFERENCES airports(id) ON DELETE CASCADE,
    airport_ident VARCHAR(10) REFERENCES airports(ident) ON DELETE CASCADE,
    length_ft INTEGER,
    width_ft INTEGER,
    surface VARCHAR(255),
    lighted BOOLEAN,
    closed BOOLEAN,
    
    -- Low End (le_) Data
    le_ident VARCHAR(10),
    le_elevation_ft INTEGER,
    le_heading_degt DOUBLE PRECISION,
    le_displaced_threshold_ft INTEGER,
    le_geom GEOMETRY(POINT, 4326), -- Replaces le_latitude_deg & le_longitude_deg
    
    -- High End (he_) Data
    he_ident VARCHAR(10),
    he_elevation_ft INTEGER,
    he_heading_degt DOUBLE PRECISION,
    he_displaced_threshold_ft INTEGER,
    he_geom GEOMETRY(POINT, 4326), -- Replaces he_latitude_deg & he_longitude_deg
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_runways_airport_ref ON runways(airport_ref);
CREATE INDEX idx_runways_airport_ident ON runways(airport_ident);
CREATE INDEX idx_runways_le_geom ON runways USING GIST(le_geom);
CREATE INDEX idx_runways_he_geom ON runways USING GIST(he_geom);
"""


DRAP_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS drap_region (
    observed_at TIMESTAMPTZ NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    long DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    absorption double precision NOT NULL,
    PRIMARY KEY (observed_at, lat, long)
)PARTITION BY RANGE (observed_at);

CREATE INDEX IF NOT EXISTS absorption_grid_time_idx
ON drap_region (observed_at);
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

  CONSTRAINT goes_xray_events_pkey PRIMARY KEY (time_tag, satellite)
);

-- Helpful indexes for time-range queries
CREATE INDEX IF NOT EXISTS ix_goes_xray_events_time_tag ON goes_xray_events (time_tag);
CREATE INDEX IF NOT EXISTS ix_goes_xray_events_satellite ON goes_xray_events (satellite);
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


ALERT_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(50) PRIMARY KEY,
    issue_datetime TIMESTAMPTZ NOT NULL,
    alert_messages TEXT NOT NULL
);
"""

# ---------------------------------------------------------------------------
# COPY-based ingestion: staging DDLs, column lists, and transform queries
# ---------------------------------------------------------------------------

# --- flight_states ---
FLIGHT_STATES_STAGING_DDL = """
CREATE TEMP TABLE flight_states_staging (
    time            TIMESTAMPTZ,
    icao24          CHAR(6),
    callsign        VARCHAR(8),
    origin_country  VARCHAR(100),
    time_pos        TIMESTAMPTZ,
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    geo_altitude    REAL,
    baro_altitude   REAL,
    velocity        REAL,
    heading         REAL,
    vert_rate       REAL,
    on_ground       BOOLEAN,
    squawk          VARCHAR(8),
    spi             BOOLEAN,
    source          SMALLINT,
    sensors         INTEGER[],
    geom_lon        DOUBLE PRECISION,
    geom_lat        DOUBLE PRECISION
) ON COMMIT DROP
"""

FLIGHT_STATES_STAGING_COLUMNS = [
    "time", "icao24", "callsign", "origin_country", "time_pos",
    "lat", "lon", "geo_altitude", "baro_altitude", "velocity",
    "heading", "vert_rate", "on_ground", "squawk", "spi",
    "source", "sensors", "geom_lon", "geom_lat",
]

FLIGHT_STATES_TRANSFORM_SQL = """
INSERT INTO flight_states
    (time, icao24, callsign, origin_country, time_pos,
     lat, lon, geo_altitude, baro_altitude, velocity,
     heading, vert_rate, on_ground, squawk, spi, source, sensors, geom)
SELECT
    time, icao24, callsign, origin_country, time_pos,
    lat, lon, geo_altitude, baro_altitude, velocity,
    heading, vert_rate, on_ground, squawk, spi, source, sensors,
    ST_SetSRID(ST_MakePoint(geom_lon, geom_lat), 4326)
FROM flight_states_staging
ON CONFLICT DO NOTHING
"""

# --- activate_flight ---
ACTIVATE_FLIGHT_STAGING_DDL = """
CREATE TEMP TABLE activate_flight_staging (
    time            TIMESTAMPTZ,
    icao24          CHAR(6),
    callsign        VARCHAR(8),
    origin_country  VARCHAR(100),
    time_pos        TIMESTAMPTZ,
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    geo_altitude    REAL,
    baro_altitude   REAL,
    velocity        REAL,
    heading         REAL,
    vert_rate       REAL,
    on_ground       BOOLEAN,
    squawk          VARCHAR(8),
    spi             BOOLEAN,
    source          SMALLINT,
    sensors         INTEGER[],
    geom_lon        DOUBLE PRECISION,
    geom_lat        DOUBLE PRECISION
) ON COMMIT DROP
"""

ACTIVATE_FLIGHT_STAGING_COLUMNS = [
    "time", "icao24", "callsign", "origin_country", "time_pos",
    "lat", "lon", "geo_altitude", "baro_altitude", "velocity",
    "heading", "vert_rate", "on_ground", "squawk", "spi",
    "source", "sensors", "geom_lon", "geom_lat",
]

ACTIVATE_FLIGHT_TRANSFORM_SQL = """
INSERT INTO activate_flight
    (time, icao24, callsign, origin_country, time_pos,
     lat, lon, geo_altitude, baro_altitude, velocity,
     heading, vert_rate, on_ground, squawk, spi, source, sensors,
     geom, path_points)
SELECT
    s.time, s.icao24, s.callsign, s.origin_country, s.time_pos,
    s.lat, s.lon, s.geo_altitude, s.baro_altitude, s.velocity,
    s.heading, s.vert_rate, s.on_ground, s.squawk, s.spi, s.source, s.sensors,
    ST_SetSRID(ST_MakePoint(s.geom_lon, s.geom_lat), 4326),
    CASE
        WHEN s.geom_lat IS NOT NULL AND s.geom_lon IS NOT NULL
        THEN ARRAY[ARRAY[s.geom_lon, s.geom_lat, EXTRACT(EPOCH FROM s.time_pos)]]
        ELSE ARRAY[]::DOUBLE PRECISION[][]
    END
FROM activate_flight_staging s
ON CONFLICT (icao24)
DO UPDATE SET
    path_points = CASE
        -- State A: Landing (was airborne, now ground) -> reset
        WHEN EXCLUDED.on_ground = TRUE THEN
            ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXTRACT(EPOCH FROM EXCLUDED.time_pos)]]

        -- State B: Takeoff (was ground, now airborne) -> reset
        WHEN EXCLUDED.on_ground = FALSE AND activate_flight.on_ground = TRUE THEN
            ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXTRACT(EPOCH FROM EXCLUDED.time_pos)]]

        -- State C: Null position (signal loss) -> preserve path
        WHEN EXCLUDED.lat IS NULL OR EXCLUDED.lon IS NULL THEN
            activate_flight.path_points

        -- State D: >30 min gap -> likely landed & back, reset
        WHEN EXCLUDED.on_ground = FALSE
            AND EXCLUDED.time_pos IS NOT NULL
            AND (EXCLUDED.time_pos - activate_flight.time_pos) > INTERVAL '30 minutes'
            AND ST_Distance(activate_flight.geom::geography, EXCLUDED.geom::geography) <= 2000000 THEN
            ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXTRACT(EPOCH FROM EXCLUDED.time_pos)]]

        -- State E: Normal flying / taxiing -> append point
        ELSE
            activate_flight.path_points || ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXTRACT(EPOCH FROM EXCLUDED.time_pos)]]
    END,

    on_ground      = EXCLUDED.on_ground,
    time           = EXCLUDED.time,
    time_pos       = COALESCE(EXCLUDED.time_pos, activate_flight.time_pos),
    callsign       = EXCLUDED.callsign,
    origin_country = EXCLUDED.origin_country,
    lat            = COALESCE(EXCLUDED.lat, activate_flight.lat),
    lon            = COALESCE(EXCLUDED.lon, activate_flight.lon),
    geom           = COALESCE(EXCLUDED.geom, activate_flight.geom),
    geo_altitude   = COALESCE(EXCLUDED.geo_altitude, activate_flight.geo_altitude),
    baro_altitude  = COALESCE(EXCLUDED.baro_altitude, activate_flight.baro_altitude),
    velocity       = EXCLUDED.velocity,
    heading        = EXCLUDED.heading,
    squawk         = EXCLUDED.squawk,
    spi            = EXCLUDED.spi,
    source         = EXCLUDED.source,
    sensors        = EXCLUDED.sensors,
    vert_rate      = EXCLUDED.vert_rate
"""

# --- drap_region ---
DRAP_STAGING_DDL = """
CREATE TEMP TABLE drap_region_staging (
    observed_at TIMESTAMPTZ      NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    absorption  DOUBLE PRECISION NOT NULL
) ON COMMIT DROP
"""

DRAP_STAGING_COLUMNS = ["observed_at", "latitude", "longitude", "absorption"]

DRAP_TRANSFORM_SQL = """
INSERT INTO drap_region (observed_at, lat, long, location, absorption)
SELECT
    observed_at,
    latitude, 
    longitude,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    absorption
FROM drap_region_staging
ON CONFLICT (observed_at, lat, long) DO NOTHING
"""

# --- airports ---
AIRPORTS_STAGING_DDL = """
CREATE TEMP TABLE airports_staging (
    ident               VARCHAR(10)      NOT NULL,
    type                VARCHAR(50),
    name                VARCHAR(255),
    latitude_deg        DOUBLE PRECISION,
    longitude_deg       DOUBLE PRECISION,
    elevation_ft        REAL,
    continent           VARCHAR(2),
    country_name        VARCHAR(100),
    iso_country         VARCHAR(2),
    region_name         VARCHAR(100),
    iso_region          VARCHAR(10),
    local_region        VARCHAR(100),
    municipality        VARCHAR(100),
    scheduled_service   BOOLEAN,
    gps_code            VARCHAR(10),
    icao_code           VARCHAR(4),
    iata_code           VARCHAR(3),
    local_code          VARCHAR(10),
    home_link           VARCHAR(255),
    wikipedia_link      VARCHAR(255),
    keywords            VARCHAR(500),
    last_updated        TIMESTAMPTZ
) ON COMMIT DROP
"""

AIRPORTS_STAGING_COLUMNS = [
    "ident", "type", "name", "latitude_deg", "longitude_deg",
    "elevation_ft", "continent", "country_name", "iso_country",
    "region_name", "iso_region", "local_region", "municipality",
    "scheduled_service", "gps_code", "icao_code", "iata_code",
    "local_code", "home_link", "wikipedia_link", "keywords", "last_updated",
]

AIRPORTS_TRANSFORM_SQL = """
INSERT INTO airports
    (ident, type, name, elevation_ft,
     continent, country_name, iso_country, region_name, iso_region,
     local_region, municipality, scheduled_service, gps_code,
     icao_code, iata_code, local_code, home_link, wikipedia_link,
     keywords, last_updated, geom)
SELECT
    ident, type, name, elevation_ft,
    continent, country_name, iso_country, region_name, iso_region,
    local_region, municipality, scheduled_service, gps_code,
    icao_code, iata_code, local_code, home_link, wikipedia_link,
    keywords, last_updated,
    ST_SetSRID(ST_MakePoint(longitude_deg, latitude_deg), 4326) AS geom
FROM airports_staging
ON CONFLICT (ident) DO UPDATE SET
    type               = EXCLUDED.type,
    name               = EXCLUDED.name,
    elevation_ft       = EXCLUDED.elevation_ft,
    continent          = EXCLUDED.continent,
    country_name       = EXCLUDED.country_name,
    iso_country        = EXCLUDED.iso_country,
    region_name        = EXCLUDED.region_name,
    iso_region         = EXCLUDED.iso_region,
    local_region       = EXCLUDED.local_region,
    municipality       = EXCLUDED.municipality,
    scheduled_service  = EXCLUDED.scheduled_service,
    gps_code           = EXCLUDED.gps_code,
    icao_code          = EXCLUDED.icao_code,
    iata_code          = EXCLUDED.iata_code,
    local_code         = EXCLUDED.local_code,
    home_link          = EXCLUDED.home_link,
    wikipedia_link     = EXCLUDED.wikipedia_link,
    keywords           = EXCLUDED.keywords,
    last_updated       = EXCLUDED.last_updated,
    geom               = EXCLUDED.geom,
    updated_at         = CURRENT_TIMESTAMP
"""

COUNTRIES_STAGING_DDL = """
CREATE TEMP TABLE countries_staging (
    id INTEGER,
    code VARCHAR(2),
    name VARCHAR(255),
    continent VARCHAR(2),
    wikipedia_link VARCHAR(255),
    keywords VARCHAR(500)
) ON COMMIT DROP
"""

COUNTRIES_STAGING_COLUMNS = [
    "id", "code", "name", "continent", "wikipedia_link", "keywords"
]

COUNTRIES_TRANSFORM_SQL = """
INSERT INTO countries (id, code, name, continent, wikipedia_link, keywords)
SELECT id, code, name, continent, wikipedia_link, keywords
FROM countries_staging
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    continent = EXCLUDED.continent,
    wikipedia_link = EXCLUDED.wikipedia_link,
    keywords = EXCLUDED.keywords,
    updated_at = CURRENT_TIMESTAMP
"""

REGIONS_STAGING_DDL = """
CREATE TEMP TABLE regions_staging (
    id INTEGER,
    code VARCHAR(10),
    local_code VARCHAR(10),
    name VARCHAR(255),
    continent VARCHAR(2),
    iso_country VARCHAR(2),
    wikipedia_link VARCHAR(255),
    keywords VARCHAR(500)
) ON COMMIT DROP
"""

REGIONS_STAGING_COLUMNS = [
    "id", "code", "local_code", "name", "continent", "iso_country", 
    "wikipedia_link", "keywords"
]

REGIONS_TRANSFORM_SQL = """
INSERT INTO regions (id, code, local_code, name, continent, iso_country, wikipedia_link, keywords)
SELECT id, code, local_code, name, continent, iso_country, wikipedia_link, keywords
FROM regions_staging
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    local_code = EXCLUDED.local_code,
    name = EXCLUDED.name,
    continent = EXCLUDED.continent,
    iso_country = EXCLUDED.iso_country,
    wikipedia_link = EXCLUDED.wikipedia_link,
    keywords = EXCLUDED.keywords,
    updated_at = CURRENT_TIMESTAMP
"""

FREQUENCIES_STAGING_DDL = """
CREATE TEMP TABLE frequencies_staging (
    id INTEGER,
    airport_ident VARCHAR(10),
    type VARCHAR(50),
    description VARCHAR(255),
    frequency_mhz DOUBLE PRECISION
) ON COMMIT DROP
"""

FREQUENCIES_STAGING_COLUMNS = [
    "id", "airport_ident", "type", "description", "frequency_mhz"
]

FREQUENCIES_TRANSFORM_SQL = """
INSERT INTO airport_frequencies (id, airport_ident, type, description, frequency_mhz)
SELECT id, airport_ident, type, description, frequency_mhz
FROM frequencies_staging
ON CONFLICT (id) DO UPDATE SET
    airport_ident = EXCLUDED.airport_ident,
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    frequency_mhz = EXCLUDED.frequency_mhz,
    updated_at = CURRENT_TIMESTAMP
"""

COMMENTS_STAGING_DDL = """
CREATE TEMP TABLE comments_staging (
    id INTEGER,
    airport_ident VARCHAR(10),
    subject VARCHAR(255),
    body TEXT,
    author VARCHAR(255),
    date TIMESTAMPTZ
) ON COMMIT DROP
"""

COMMENTS_STAGING_COLUMNS = [
    "id", "airport_ident", "subject", "body", "author", "date"
]

COMMENTS_TRANSFORM_SQL = """
INSERT INTO airport_comments (id, airport_ident, subject, body, author, date)
SELECT id, airport_ident, subject, body, author, date
FROM comments_staging
ON CONFLICT (id) DO UPDATE SET
    airport_ident = EXCLUDED.airport_ident,
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    author = EXCLUDED.author,
    date = EXCLUDED.date,
    updated_at = CURRENT_TIMESTAMP
"""

RUNWAYS_STAGING_DDL = """
CREATE TEMP TABLE runways_staging (
    id INTEGER,
    airport_ident VARCHAR(10),
    length_ft INTEGER,
    width_ft INTEGER,
    surface VARCHAR(255),
    lighted BOOLEAN,
    closed BOOLEAN,
    le_ident VARCHAR(10),
    le_latitude_deg DOUBLE PRECISION,
    le_longitude_deg DOUBLE PRECISION,
    le_elevation_ft INTEGER,
    le_heading_degt DOUBLE PRECISION,
    le_displaced_threshold_ft INTEGER,
    he_ident VARCHAR(10),
    he_latitude_deg DOUBLE PRECISION,
    he_longitude_deg DOUBLE PRECISION,
    he_elevation_ft INTEGER,
    he_heading_degt DOUBLE PRECISION,
    he_displaced_threshold_ft INTEGER
) ON COMMIT DROP
"""

RUNWAYS_STAGING_COLUMNS = [
    "id", "airport_ident", "length_ft", "width_ft", "surface", "lighted", 
    "closed", "le_ident", "le_latitude_deg", "le_longitude_deg", "le_elevation_ft", 
    "le_heading_degt", "le_displaced_threshold_ft", "he_ident", "he_latitude_deg", 
    "he_longitude_deg", "he_elevation_ft", "he_heading_degt", "he_displaced_threshold_ft"
]

RUNWAYS_TRANSFORM_SQL = """
INSERT INTO runways (
    id, airport_ident, length_ft, width_ft, surface, lighted, closed,
    le_ident, le_elevation_ft, le_heading_degt, le_displaced_threshold_ft, le_geom,
    he_ident, he_elevation_ft, he_heading_degt, he_displaced_threshold_ft, he_geom
)
SELECT
    id, airport_ident, length_ft, width_ft, surface, lighted, closed,
    le_ident, le_elevation_ft, le_heading_degt, le_displaced_threshold_ft,
    CASE 
        WHEN le_longitude_deg IS NOT NULL AND le_latitude_deg IS NOT NULL 
        THEN ST_SetSRID(ST_MakePoint(le_longitude_deg, le_latitude_deg), 4326) 
        ELSE NULL 
    END AS le_geom,
    he_ident, he_elevation_ft, he_heading_degt, he_displaced_threshold_ft,
    CASE 
        WHEN he_longitude_deg IS NOT NULL AND he_latitude_deg IS NOT NULL 
        THEN ST_SetSRID(ST_MakePoint(he_longitude_deg, he_latitude_deg), 4326) 
        ELSE NULL 
    END AS he_geom
FROM runways_staging
ON CONFLICT (id) DO UPDATE SET
    airport_ident = EXCLUDED.airport_ident,
    length_ft = EXCLUDED.length_ft,
    width_ft = EXCLUDED.width_ft,
    surface = EXCLUDED.surface,
    lighted = EXCLUDED.lighted,
    closed = EXCLUDED.closed,
    le_ident = EXCLUDED.le_ident,
    le_elevation_ft = EXCLUDED.le_elevation_ft,
    le_heading_degt = EXCLUDED.le_heading_degt,
    le_displaced_threshold_ft = EXCLUDED.le_displaced_threshold_ft,
    le_geom = EXCLUDED.le_geom,
    he_ident = EXCLUDED.he_ident,
    he_elevation_ft = EXCLUDED.he_elevation_ft,
    he_heading_degt = EXCLUDED.he_heading_degt,
    he_displaced_threshold_ft = EXCLUDED.he_displaced_threshold_ft,
    he_geom = EXCLUDED.he_geom,
    updated_at = CURRENT_TIMESTAMP
"""

NAVAIDS_STAGING_DDL = """
CREATE TEMP TABLE navaids_staging (
    id INTEGER,
    filename VARCHAR(255),
    ident VARCHAR(10),
    name VARCHAR(255),
    type VARCHAR(50),
    frequency_khz INTEGER,
    latitude_deg DOUBLE PRECISION,
    longitude_deg DOUBLE PRECISION,
    elevation_ft INTEGER,
    iso_country VARCHAR(2),
    dme_frequency_khz INTEGER,
    dme_channel VARCHAR(10),
    dme_latitude_deg DOUBLE PRECISION,
    dme_longitude_deg DOUBLE PRECISION,
    dme_elevation_ft INTEGER,
    slaved_variation_deg DOUBLE PRECISION,
    magnetic_variation_deg DOUBLE PRECISION,
    usagetype VARCHAR(50),
    power VARCHAR(50),
    associated_airport VARCHAR(10)
) ON COMMIT DROP
"""

NAVAIDS_STAGING_COLUMNS = [
    "id", "filename", "ident", "name", "type", "frequency_khz", 
    "latitude_deg", "longitude_deg", "elevation_ft", "iso_country", 
    "dme_frequency_khz", "dme_channel", "dme_latitude_deg", "dme_longitude_deg", 
    "dme_elevation_ft", "slaved_variation_deg", "magnetic_variation_deg", 
    "usagetype", "power", "associated_airport"
]

NAVAIDS_TRANSFORM_SQL = """
INSERT INTO navaids (
    id, filename, ident, name, type, frequency_khz, elevation_ft, iso_country,
    dme_frequency_khz, dme_channel, dme_elevation_ft,
    slaved_variation_deg, magnetic_variation_deg, usagetype, power, associated_airport,
    geom, dme_geom
)
SELECT
    id, filename, ident, name, type, frequency_khz, elevation_ft, iso_country,
    dme_frequency_khz, dme_channel, dme_elevation_ft,
    slaved_variation_deg, magnetic_variation_deg, usagetype, power, associated_airport,
    CASE 
        WHEN longitude_deg IS NOT NULL AND latitude_deg IS NOT NULL 
        THEN ST_SetSRID(ST_MakePoint(longitude_deg, latitude_deg), 4326) 
        ELSE NULL 
    END AS geom,
    CASE 
        WHEN dme_longitude_deg IS NOT NULL AND dme_latitude_deg IS NOT NULL 
        THEN ST_SetSRID(ST_MakePoint(dme_longitude_deg, dme_latitude_deg), 4326) 
        ELSE NULL 
    END AS dme_geom
FROM navaids_staging
ON CONFLICT (id) DO UPDATE SET
    filename = EXCLUDED.filename,
    ident = EXCLUDED.ident,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    frequency_khz = EXCLUDED.frequency_khz,
    elevation_ft = EXCLUDED.elevation_ft,
    iso_country = EXCLUDED.iso_country,
    dme_frequency_khz = EXCLUDED.dme_frequency_khz,
    dme_channel = EXCLUDED.dme_channel,
    dme_elevation_ft = EXCLUDED.dme_elevation_ft,
    slaved_variation_deg = EXCLUDED.slaved_variation_deg,
    magnetic_variation_deg = EXCLUDED.magnetic_variation_deg,
    usagetype = EXCLUDED.usagetype,
    power = EXCLUDED.power,
    associated_airport = EXCLUDED.associated_airport,
    geom = EXCLUDED.geom,
    dme_geom = EXCLUDED.dme_geom,
    updated_at = CURRENT_TIMESTAMP
"""

# --- aurora_forecast ---
AURORA_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS aurora_forecast (
    observation_time TIMESTAMPTZ      NOT NULL,
    forecast_time    TIMESTAMPTZ      NOT NULL,
    location         GEOGRAPHY(Point, 4326) NOT NULL,
    aurora           integer          NOT NULL CHECK (aurora >= 0 AND aurora <= 100),
    PRIMARY KEY (observation_time, location)
);

CREATE INDEX IF NOT EXISTS ix_aurora_forecast_obs_time ON aurora_forecast (observation_time);
CREATE INDEX IF NOT EXISTS ix_aurora_forecast_location ON aurora_forecast USING GIST (location);
"""

AURORA_STAGING_DDL = """
CREATE TEMP TABLE aurora_forecast_staging (
    observation_time TIMESTAMPTZ      NOT NULL,
    forecast_time    TIMESTAMPTZ      NOT NULL,
    longitude        DOUBLE PRECISION NOT NULL,
    latitude         DOUBLE PRECISION NOT NULL,
    aurora           INTEGER          NOT NULL
) ON COMMIT DROP
"""

AURORA_STAGING_COLUMNS = [
    "observation_time", "forecast_time", "longitude", "latitude", "aurora",
]

AURORA_TRANSFORM_SQL = """
INSERT INTO aurora_forecast (observation_time, forecast_time, location, aurora)
SELECT
    observation_time,
    forecast_time,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    aurora
FROM aurora_forecast_staging
ON CONFLICT (observation_time, location) DO NOTHING
"""

# --- goes_xray_6hour ---
XRAY_6HOUR_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS goes_xray_6hour (
  time_tag               timestamptz      NOT NULL,
  satellite              integer          NOT NULL,
  flux                   double precision NOT NULL,
  observed_flux          double precision NOT NULL,
  electron_correction    double precision NOT NULL,
  electron_contamination boolean          NOT NULL,
  energy                 text             NOT NULL,

  CONSTRAINT goes_xray_6hour_pkey PRIMARY KEY (time_tag, satellite, energy)
);

CREATE INDEX IF NOT EXISTS ix_goes_xray_6hour_time_tag ON goes_xray_6hour (time_tag);
CREATE INDEX IF NOT EXISTS ix_goes_xray_6hour_satellite ON goes_xray_6hour (satellite);
"""

XRAY_6HOUR_STAGING_DDL = """
CREATE TEMP TABLE goes_xray_6hour_staging (
    time_tag               TIMESTAMPTZ,
    satellite              INTEGER,
    flux                   DOUBLE PRECISION,
    observed_flux          DOUBLE PRECISION,
    electron_correction    DOUBLE PRECISION,
    electron_contamination BOOLEAN,
    energy                 TEXT
) ON COMMIT DROP
"""

XRAY_6HOUR_STAGING_COLUMNS = [
    "time_tag", "satellite", "flux", "observed_flux",
    "electron_correction", "electron_contamination", "energy",
]

XRAY_6HOUR_TRANSFORM_SQL = """
INSERT INTO goes_xray_6hour
    (time_tag, satellite, flux, observed_flux,
     electron_correction, electron_contamination, energy)
SELECT
    time_tag, satellite, flux, observed_flux,
    electron_correction, electron_contamination, energy
FROM goes_xray_6hour_staging
ON CONFLICT (time_tag, satellite, energy) DO NOTHING
"""

# --- goes_proton_flux ---
PROTON_FLUX_STAGING_DDL = """
CREATE TEMP TABLE goes_proton_flux_staging (
    time_tag        TIMESTAMPTZ,
    satellite       INTEGER,
    flux_10_mev     DOUBLE PRECISION,
    flux_50_mev     DOUBLE PRECISION,
    flux_100_mev    DOUBLE PRECISION,
    flux_500_mev    DOUBLE PRECISION
) ON COMMIT DROP
"""

PROTON_FLUX_STAGING_COLUMNS = [
    "time_tag", "satellite",
    "flux_10_mev", "flux_50_mev", "flux_100_mev", "flux_500_mev",
]

PROTON_FLUX_TRANSFORM_SQL = """
INSERT INTO goes_proton_flux
    (time_tag, satellite, flux_10_mev, flux_50_mev, flux_100_mev, flux_500_mev)
SELECT
    time_tag, satellite, flux_10_mev, flux_50_mev, flux_100_mev, flux_500_mev
FROM goes_proton_flux_staging
ON CONFLICT (time_tag, satellite) DO NOTHING
"""

# --- kp_index ---
KP_STAGING_DDL = """
CREATE TEMP TABLE kp_index_staging (
    time_tag        TIMESTAMPTZ,
    kp              DOUBLE PRECISION,
    a_running       INTEGER,
    station_count   INTEGER
) ON COMMIT DROP
"""

KP_STAGING_COLUMNS = ["time_tag", "kp", "a_running", "station_count"]

KP_TRANSFORM_SQL = """
INSERT INTO kp_index (time_tag, kp, a_running, station_count)
SELECT time_tag, kp, a_running, station_count
FROM kp_index_staging
ON CONFLICT (time_tag) DO NOTHING
"""

# --- alerts ---
ALERTS_STAGING_DDL = """
CREATE TEMP TABLE alerts_staging (
    alert_id        VARCHAR(50) NOT NULL,
    issue_datetime  TIMESTAMPTZ NOT NULL,
    alert_messages  TEXT        NOT NULL
) ON COMMIT DROP
"""

ALERTS_STAGING_COLUMNS = ["alert_id", "issue_datetime", "alert_messages"]

ALERTS_TRANSFORM_SQL = """
INSERT INTO alerts (alert_id, issue_datetime, alert_messages)
SELECT alert_id, issue_datetime, alert_messages
FROM alerts_staging
ON CONFLICT (alert_id) DO NOTHING
"""


# --- geoelectric_field ---
GEOELECTRIC_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS geoelectric_field (
    observed_at              TIMESTAMPTZ            NOT NULL,
    location                 GEOGRAPHY(Point, 4326) NOT NULL,
    ex                       DOUBLE PRECISION       NOT NULL,  -- North-South electric field (mV/m)
    ey                       DOUBLE PRECISION       NOT NULL,  -- East-West electric field (mV/m)
    e_magnitude              DOUBLE PRECISION       NOT NULL,  -- Magnitude of electric field (mV/m)
    quality_flag             SMALLINT               NOT NULL,
    distance_nearest_station DOUBLE PRECISION       NOT NULL,  -- Distance to nearest magnetometer station (km)
    PRIMARY KEY (observed_at, location)
);

CREATE INDEX IF NOT EXISTS ix_geoelectric_field_observed_at ON geoelectric_field (observed_at);
CREATE INDEX IF NOT EXISTS ix_geoelectric_field_location ON geoelectric_field USING GIST (location);
"""

GEOELECTRIC_STAGING_DDL = """
CREATE TEMP TABLE geoelectric_field_staging (
    observed_at              TIMESTAMPTZ      NOT NULL,
    longitude                DOUBLE PRECISION NOT NULL,
    latitude                 DOUBLE PRECISION NOT NULL,
    ex                       DOUBLE PRECISION NOT NULL,
    ey                       DOUBLE PRECISION NOT NULL,
    e_magnitude              DOUBLE PRECISION NOT NULL,
    quality_flag             SMALLINT         NOT NULL,
    distance_nearest_station DOUBLE PRECISION NOT NULL
) ON COMMIT DROP
"""

GEOELECTRIC_STAGING_COLUMNS = [
    "observed_at", "longitude", "latitude",
    "ex", "ey", "e_magnitude", "quality_flag", "distance_nearest_station",
]

GEOELECTRIC_TRANSFORM_SQL = """
INSERT INTO geoelectric_field
    (observed_at, location, ex, ey, e_magnitude, quality_flag, distance_nearest_station)
SELECT
    observed_at,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    ex,
    ey,
    e_magnitude,
    quality_flag,
    distance_nearest_station
FROM geoelectric_field_staging
ON CONFLICT (observed_at, location) DO NOTHING
"""


ACTIVATE_FLIGHT_STATES_QUERY = """
    SELECT 
        icao24,
        callsign,
        ROUND(lat::numeric, 4)::REAL AS lat,
        ROUND(lon::numeric, 4)::REAL AS lon,
        ROUND(geo_altitude::numeric, 4)::REAL AS geo_altitude,
        ROUND(velocity::numeric, 4)::REAL AS velocity,
        ROUND(heading::numeric, 4)::REAL AS heading,
        on_ground
    FROM activate_flight
    WHERE on_ground = FALSE AND time_pos >= NOW() - INTERVAL '20 minutes';
"""