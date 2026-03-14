"""SQL queries for creating tables, indexes, and performing upserts for the space weather data pipeline."""

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
    id SERIAL PRIMARY KEY,
    ident VARCHAR(10) NOT NULL UNIQUE,
    type VARCHAR(50),
    name VARCHAR(255),
    latitude_deg DOUBLE PRECISION,
    longitude_deg DOUBLE PRECISION,
    elevation_ft REAL,
    continent VARCHAR(2),
    country_name VARCHAR(100),
    iso_country VARCHAR(2),
    region_name VARCHAR(100),
    iso_region VARCHAR(10),
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
    score INTEGER,
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
     geom, path_geom)
SELECT
    s.time, s.icao24, s.callsign, s.origin_country, s.time_pos,
    s.lat, s.lon, s.geo_altitude, s.baro_altitude, s.velocity,
    s.heading, s.vert_rate, s.on_ground, s.squawk, s.spi, s.source, s.sensors,
    ST_SetSRID(ST_MakePoint(s.geom_lon, s.geom_lat), 4326),
    ST_Multi(ST_SetSRID(ST_MakePoint(s.geom_lon, s.geom_lat), 4326)::geometry)
FROM activate_flight_staging s
ON CONFLICT (icao24)
DO UPDATE SET
    path_geom = CASE
        -- State A: Landing (was airborne, now ground) -> reset
        WHEN EXCLUDED.on_ground = TRUE THEN
            ST_Multi(EXCLUDED.geom)

        -- State B: Takeoff (was ground, now airborne) -> reset
        WHEN EXCLUDED.on_ground = FALSE AND activate_flight.on_ground = TRUE THEN
            ST_Multi(EXCLUDED.geom)

        -- State C: Null position (signal loss) -> preserve path
        WHEN EXCLUDED.lat IS NULL OR EXCLUDED.lon IS NULL THEN
            activate_flight.path_geom

        -- State D: >30 min gap + within 2000000m -> likely landed & back, reset
        WHEN EXCLUDED.on_ground = FALSE
            AND EXCLUDED.time_pos IS NOT NULL
            AND (EXCLUDED.time_pos - activate_flight.time_pos) > INTERVAL '30 minutes'
            AND ST_Distance(activate_flight.geom::geography, EXCLUDED.geom::geography) <= 2000000 THEN
            ST_Multi(EXCLUDED.geom)

        -- State E: Normal flying / taxiing -> append point
        ELSE
            ST_Multi(ST_CollectionExtract(
                ST_Collect(activate_flight.path_geom, EXCLUDED.geom), 1
            ))
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
INSERT INTO drap_region (observed_at, location, absorption)
SELECT
    observed_at,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    absorption
FROM drap_region_staging
ON CONFLICT (observed_at, location) DO NOTHING
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
    score               INTEGER,
    last_updated        TIMESTAMPTZ
) ON COMMIT DROP
"""

AIRPORTS_STAGING_COLUMNS = [
    "ident", "type", "name", "latitude_deg", "longitude_deg",
    "elevation_ft", "continent", "country_name", "iso_country",
    "region_name", "iso_region", "local_region", "municipality",
    "scheduled_service", "gps_code", "icao_code", "iata_code",
    "local_code", "home_link", "wikipedia_link", "keywords",
    "score", "last_updated",
]

AIRPORTS_TRANSFORM_SQL = """
INSERT INTO airports
    (ident, type, name, latitude_deg, longitude_deg, elevation_ft,
     continent, country_name, iso_country, region_name, iso_region,
     local_region, municipality, scheduled_service, gps_code,
     icao_code, iata_code, local_code, home_link, wikipedia_link,
     keywords, score, last_updated)
SELECT
    ident, type, name, latitude_deg, longitude_deg, elevation_ft,
    continent, country_name, iso_country, region_name, iso_region,
    local_region, municipality, scheduled_service, gps_code,
    icao_code, iata_code, local_code, home_link, wikipedia_link,
    keywords, score, last_updated
FROM airports_staging
ON CONFLICT (ident) DO UPDATE SET
    type               = EXCLUDED.type,
    name               = EXCLUDED.name,
    latitude_deg       = EXCLUDED.latitude_deg,
    longitude_deg      = EXCLUDED.longitude_deg,
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
    score              = EXCLUDED.score,
    last_updated       = EXCLUDED.last_updated,
    updated_at         = CURRENT_TIMESTAMP
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
