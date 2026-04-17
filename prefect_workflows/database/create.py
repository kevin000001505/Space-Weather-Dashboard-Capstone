FLIGHT_STATES_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS flight_states (
    time            TIMESTAMPTZ NOT NULL,
    icao24          CHAR(6) NOT NULL,
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
    on_ground       BOOLEAN DEFAULT FALSE,

    squawk          VARCHAR(8),
    spi             BOOLEAN DEFAULT FALSE,
    source          SMALLINT,
    sensors         INTEGER[],

    geom            GEOMETRY(POINT, 4326),

    PRIMARY KEY (time, icao24)
);

CREATE INDEX IF NOT EXISTS idx_flight_icao ON flight_states (icao24);

SELECT create_hypertable(
    'flight_states', 
    'time', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
    );

ALTER TABLE flight_states SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC',
    timescaledb.compress_segmentby = 'icao24'   
);

SELECT add_compression_policy('flight_states', INTERVAL '7 days', if_not_exists => true);
"""


TRANSMISSION_LINES_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS electric_transmission_lines (
    objectid    INTEGER PRIMARY KEY,
    line_id     INTEGER NOT NULL,
    type        VARCHAR(100),
    status      VARCHAR(50),
    naics_code  INTEGER,
    naics_desc  VARCHAR(255),
    source      VARCHAR(255),
    sourcedate  DATE,
    val_method  VARCHAR(100),
    val_date    DATE,
    owner       VARCHAR(255),
    voltage     DOUBLE PRECISION,
    volt_class  VARCHAR(50),
    inferred    BOOLEAN,
    sub_1       VARCHAR(255),
    sub_2       VARCHAR(255),
    shape_len   DOUBLE PRECISION,
    global_id   VARCHAR(36),
    geom        GEOMETRY(LINESTRING, 4326),
    length      DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_etl_geom       ON electric_transmission_lines USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_etl_volt_class ON electric_transmission_lines(volt_class);
CREATE INDEX IF NOT EXISTS idx_etl_status     ON electric_transmission_lines(status);
"""


READONLY_GRANTS_SQL = """
GRANT USAGE  ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;
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
    epoch_time_pos DOUBLE PRECISION,

    -- Combination of time and icao24 as PRIMARY KEY for uniqueness
    PRIMARY KEY (icao24)
);
"""

DRAP_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS drap_region (
    observed_at TIMESTAMPTZ NOT NULL,
    lat INTEGER NOT NULL,
    long INTEGER NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    absorption double precision NOT NULL,
    PRIMARY KEY (observed_at, lat, long)
);

SELECT create_hypertable(
    'drap_region', 
    'observed_at', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
    );

ALTER TABLE drap_region SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'observed_at DESC',
    timescaledb.compress_segmentby = ''   -- no segment column
);

SELECT set_chunk_time_interval('drap_region', INTERVAL '7 day');

CREATE INDEX IF NOT EXISTS idx_drap_region_location ON drap_region USING GIST(location);
"""


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

SELECT create_hypertable(
    'goes_xray_6hour', 
    'time_tag', 
    chunk_time_interval => INTERVAL '7 day',
    if_not_exists => TRUE
    );
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
SELECT create_hypertable(
    'goes_proton_flux', 
    'time_tag', 
    chunk_time_interval => INTERVAL '7 day',
    if_not_exists => TRUE
    );
"""


KP_INDEX_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS kp_index (
  time_tag         timestamptz       NOT NULL,                     -- Observation timestamp (UTC)
  kp               double precision  CHECK (kp >= 0 AND kp <= 9),  -- Kp index value (0-9)
  a_running        integer           CHECK (a_running >= 0),       -- Running A index
  station_count    integer           CHECK (station_count >= 0),   -- Number of stations reporting

  CONSTRAINT kp_index_pkey PRIMARY KEY (time_tag)
);

SELECT create_hypertable(
    'kp_index', 
    'time_tag', 
    chunk_time_interval => INTERVAL '7 day',
    if_not_exists => TRUE
    );
"""


ALERT_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(50) PRIMARY KEY,
    issue_datetime TIMESTAMPTZ NOT NULL,
    alert_messages TEXT NOT NULL
);
"""

AURORA_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS aurora_forecast (
    observed_at TIMESTAMPTZ      NOT NULL,
    forecast_time    TIMESTAMPTZ      NOT NULL,
    lat              INTEGER NOT NULL,
    long             INTEGER NOT NULL,
    location         GEOGRAPHY(Point, 4326) NOT NULL,
    aurora           integer          NOT NULL CHECK (aurora >= 0 AND aurora <= 100),
    PRIMARY KEY (observed_at, lat, long)
);

SELECT create_hypertable(
    'aurora_forecast', 
    'observed_at', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE);


ALTER TABLE aurora_forecast SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'observed_at DESC',
    timescaledb.compress_segmentby = ''   -- no segment column
);

SELECT set_chunk_time_interval('aurora_forecast', INTERVAL '7 day');
    
"""

GEOELECTRIC_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS geoelectric_field (
    observed_at              TIMESTAMPTZ            NOT NULL,
    lat                      DOUBLE PRECISION NOT NULL,
    long                     DOUBLE PRECISION NOT NULL,
    location                 GEOGRAPHY(Point, 4326) NOT NULL,
    ex                       DOUBLE PRECISION       NOT NULL,  -- North-South electric field (mV/m)
    ey                       DOUBLE PRECISION       NOT NULL,  -- East-West electric field (mV/m)
    e_magnitude              DOUBLE PRECISION       NOT NULL,  -- Magnitude of electric field (mV/m)
    quality_flag             SMALLINT               NOT NULL,
    distance_nearest_station DOUBLE PRECISION       NOT NULL,  -- Distance to nearest magnetometer station (km)
    PRIMARY KEY (observed_at, lat, long)
);


SELECT create_hypertable(
    'geoelectric_field', 
    'observed_at', 
    chunk_time_interval => INTERVAL '1 day', 
    if_not_exists => TRUE
    );

ALTER TABLE geoelectric_field SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'observed_at DESC',
    timescaledb.compress_segmentby = ''   -- no segment column
);

SELECT set_chunk_time_interval('geoelectric_field', INTERVAL '7 day');
"""


EVENTS_LOCATION_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS events_location (
	events 		VARCHAR(30),
	locations   FLOAT8[][],
    PRIMARY KEY(events)
);
"""

# Might have bug (Kermit)
EVENTS_LOCATION_INGEST = """
    INSERT INTO events_location (events, locations)
    SELECT 
        '{table_name}',
        ARRAY(
            SELECT ARRAY[lat, long]
            FROM {table_name}
            WHERE observed_at = (SELECT MAX(observed_at) FROM {table_name})
            ORDER BY lat DESC, long ASC
        )
    ON CONFLICT (events) DO UPDATE
        SET locations = EXCLUDED.locations
"""

CREATE_FLIGHT_DRAP_EVENTS = """
CREATE TABLE IF NOT EXISTS flight_drap_events (
    time             TIMESTAMPTZ      NOT NULL,
    icao24           CHAR(6)          NOT NULL,
    callsign         VARCHAR(8),
    time_pos         TIMESTAMPTZ,
    lat              DOUBLE PRECISION,
    lon              DOUBLE PRECISION,
    geo_altitude     REAL,
    velocity         REAL,
    heading          REAL,
    vert_rate        REAL,
    on_ground        BOOLEAN,
    drap_observed_at TIMESTAMPTZ,
    drap_lat         DOUBLE PRECISION,
    drap_long        DOUBLE PRECISION,
    absorption       REAL
);

DO $$ BEGIN
    ALTER TABLE flight_drap_events ADD COLUMN callsign VARCHAR(8);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

SELECT create_hypertable(
    'flight_drap_events', 'time',
    if_not_exists => TRUE
);

ALTER TABLE flight_drap_events SET (
    timescaledb.compress,
    timescaledb.compress_orderby   = 'time DESC',
    timescaledb.compress_segmentby = 'icao24'
);

SELECT add_compression_policy(
    'flight_drap_events',
    INTERVAL '1 hour',
    if_not_exists => TRUE
);
"""

# ------------------------------------------------------------------------------------------
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
