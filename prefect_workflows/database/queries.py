"""SQL queries for creating tables, indexes, performing upserts, and latest queries to insert into redis for the space weather data pipeline."""

PARTITION_TABLE_LISTS = [
    "drap_region",
    "goes_xray_6hour",
    "goes_proton_flux",
    "kp_index",
    "aurora_forecast",
    "geoelectric_field",
]

CLEANUP_OLD_FLIGHT_DATA_QUERY = """
DELETE FROM flight_states WHERE time < $1
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
    geom_lat        DOUBLE PRECISION,
    geom            GEOMETRY(Point, 4326)
) ON COMMIT DROP
"""

FLIGHT_STATES_STAGING_COLUMNS = [
    "time",
    "icao24",
    "callsign",
    "origin_country",
    "time_pos",
    "lat",
    "lon",
    "geo_altitude",
    "baro_altitude",
    "velocity",
    "heading",
    "vert_rate",
    "on_ground",
    "squawk",
    "spi",
    "source",
    "sensors",
    "geom_lon",
    "geom_lat",
]

FLIGHT_STATES_STAGING_GEOM_SQL = """
UPDATE flight_states_staging
SET
    geom           = ST_SetSRID(ST_MakePoint(geom_lon, geom_lat), 4326)
WHERE geom_lon IS NOT NULL AND geom_lat IS NOT NULL
"""

FLIGHT_STATES_TRANSFORM_SQL = """
INSERT INTO flight_states
    (time, icao24, callsign, origin_country, time_pos,
     lat, lon, geo_altitude, baro_altitude, velocity,
     heading, vert_rate, on_ground, squawk, spi, source, sensors, geom)
SELECT
    time, icao24, callsign, origin_country, time_pos,
    lat, lon, geo_altitude, baro_altitude, velocity,
    heading, vert_rate, on_ground, squawk, spi, source, sensors,
    geom
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
    geom_lat        DOUBLE PRECISION,
    geom            GEOMETRY(Point, 4326),
    epoch_time_pos  DOUBLE PRECISION
) ON COMMIT DROP
"""

ACTIVATE_FLIGHT_STAGING_COLUMNS = [
    "time",
    "icao24",
    "callsign",
    "origin_country",
    "time_pos",
    "lat",
    "lon",
    "geo_altitude",
    "baro_altitude",
    "velocity",
    "heading",
    "vert_rate",
    "on_ground",
    "squawk",
    "spi",
    "source",
    "sensors",
    "geom_lon",
    "geom_lat",
]

ACTIVATE_FLIGHT_STAGING_GEOM_SQL = """
UPDATE activate_flight_staging
SET
    geom           = ST_SetSRID(ST_MakePoint(geom_lon, geom_lat), 4326),
    epoch_time_pos = EXTRACT(EPOCH FROM time_pos)
WHERE geom_lon IS NOT NULL AND geom_lat IS NOT NULL
"""

ACTIVATE_FLIGHT_TRANSFORM_SQL = """
INSERT INTO activate_flight
    (time, icao24, callsign, origin_country, time_pos,
     lat, lon, geo_altitude, baro_altitude, velocity,
     heading, vert_rate, on_ground, squawk, spi, source, sensors,
     geom, epoch_time_pos, path_points)
SELECT
    s.time, s.icao24, s.callsign, s.origin_country, s.time_pos,
    s.lat, s.lon, s.geo_altitude, s.baro_altitude, s.velocity,
    s.heading, s.vert_rate, s.on_ground, s.squawk, s.spi, s.source, s.sensors,
    s.geom,
    s.epoch_time_pos,
    CASE
        WHEN s.geom_lat IS NOT NULL AND s.geom_lon IS NOT NULL
        THEN ARRAY[ARRAY[s.geom_lon, s.geom_lat, s.epoch_time_pos]]
        ELSE ARRAY[]::DOUBLE PRECISION[][]
    END
FROM activate_flight_staging s
ON CONFLICT (icao24)
DO UPDATE SET
    path_points = CASE
        -- State A: Landing -> reset
        WHEN EXCLUDED.on_ground = TRUE THEN
            ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXCLUDED.epoch_time_pos]]

        -- State B: Takeoff -> reset
        WHEN EXCLUDED.on_ground = FALSE AND activate_flight.on_ground = TRUE THEN
            ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXCLUDED.epoch_time_pos]]

        -- State C: Null position -> preserve
        WHEN EXCLUDED.lat IS NULL OR EXCLUDED.lon IS NULL THEN
            activate_flight.path_points

        -- State D: >30 min gap -> reset
        WHEN EXCLUDED.on_ground = FALSE
            AND EXCLUDED.time_pos IS NOT NULL
            AND (EXCLUDED.time_pos - activate_flight.time_pos) > INTERVAL '30 minutes'
            AND ST_Distance(activate_flight.geom::geography, EXCLUDED.geom::geography) <= 2000000 THEN
            ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXCLUDED.epoch_time_pos]]

        -- State E: Normal -> append
        ELSE
            activate_flight.path_points || ARRAY[ARRAY[EXCLUDED.lon, EXCLUDED.lat, EXCLUDED.epoch_time_pos]]
    END,

    on_ground       = EXCLUDED.on_ground,
    time            = EXCLUDED.time,
    time_pos        = COALESCE(EXCLUDED.time_pos, activate_flight.time_pos),
    epoch_time_pos  = COALESCE(EXCLUDED.epoch_time_pos, activate_flight.epoch_time_pos),
    callsign        = EXCLUDED.callsign,
    origin_country  = EXCLUDED.origin_country,
    lat             = COALESCE(EXCLUDED.lat, activate_flight.lat),
    lon             = COALESCE(EXCLUDED.lon, activate_flight.lon),
    geom            = COALESCE(EXCLUDED.geom, activate_flight.geom),
    geo_altitude    = COALESCE(EXCLUDED.geo_altitude, activate_flight.geo_altitude),
    baro_altitude   = COALESCE(EXCLUDED.baro_altitude, activate_flight.baro_altitude),
    velocity        = EXCLUDED.velocity,
    heading         = EXCLUDED.heading,
    squawk          = EXCLUDED.squawk,
    spi             = EXCLUDED.spi,
    source          = EXCLUDED.source,
    sensors         = EXCLUDED.sensors,
    vert_rate       = EXCLUDED.vert_rate
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
    "ident",
    "type",
    "name",
    "latitude_deg",
    "longitude_deg",
    "elevation_ft",
    "continent",
    "country_name",
    "iso_country",
    "region_name",
    "iso_region",
    "local_region",
    "municipality",
    "scheduled_service",
    "gps_code",
    "icao_code",
    "iata_code",
    "local_code",
    "home_link",
    "wikipedia_link",
    "keywords",
    "last_updated",
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
    "id",
    "code",
    "name",
    "continent",
    "wikipedia_link",
    "keywords",
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
    "id",
    "code",
    "local_code",
    "name",
    "continent",
    "iso_country",
    "wikipedia_link",
    "keywords",
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
    "id",
    "airport_ident",
    "type",
    "description",
    "frequency_mhz",
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

COMMENTS_STAGING_COLUMNS = ["id", "airport_ident", "subject", "body", "author", "date"]

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
    "id",
    "airport_ident",
    "length_ft",
    "width_ft",
    "surface",
    "lighted",
    "closed",
    "le_ident",
    "le_latitude_deg",
    "le_longitude_deg",
    "le_elevation_ft",
    "le_heading_degt",
    "le_displaced_threshold_ft",
    "he_ident",
    "he_latitude_deg",
    "he_longitude_deg",
    "he_elevation_ft",
    "he_heading_degt",
    "he_displaced_threshold_ft",
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
    "id",
    "filename",
    "ident",
    "name",
    "type",
    "frequency_khz",
    "latitude_deg",
    "longitude_deg",
    "elevation_ft",
    "iso_country",
    "dme_frequency_khz",
    "dme_channel",
    "dme_latitude_deg",
    "dme_longitude_deg",
    "dme_elevation_ft",
    "slaved_variation_deg",
    "magnetic_variation_deg",
    "usagetype",
    "power",
    "associated_airport",
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
    "observation_time",
    "forecast_time",
    "longitude",
    "latitude",
    "aurora",
]

AURORA_TRANSFORM_SQL = """
INSERT INTO aurora_forecast (observation_time, forecast_time, lat, long, location, aurora)
SELECT
    observation_time,
    forecast_time,
    latitude,
    longitude,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    aurora
FROM aurora_forecast_staging
ON CONFLICT (observation_time, lat, long) DO NOTHING
"""

# --- goes_xray_6hour ---


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
    "time_tag",
    "satellite",
    "flux",
    "observed_flux",
    "electron_correction",
    "electron_contamination",
    "energy",
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
    "time_tag",
    "satellite",
    "flux_10_mev",
    "flux_50_mev",
    "flux_100_mev",
    "flux_500_mev",
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
    "observed_at",
    "longitude",
    "latitude",
    "ex",
    "ey",
    "e_magnitude",
    "quality_flag",
    "distance_nearest_station",
]

GEOELECTRIC_TRANSFORM_SQL = """
INSERT INTO geoelectric_field
    (observed_at, lat, long, location, ex, ey, e_magnitude, quality_flag, distance_nearest_station)
SELECT
    observed_at,
    latitude,
    longitude,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    ex,
    ey,
    e_magnitude,
    quality_flag,
    distance_nearest_station
FROM geoelectric_field_staging
ON CONFLICT (observed_at, lat, long) DO NOTHING
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
