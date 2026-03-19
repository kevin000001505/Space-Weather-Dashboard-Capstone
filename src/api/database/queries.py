AIRPORTS_LATEST_QUERY = """
    SELECT 
        ident, name, iata_code, gps_code, type, municipality, iso_country, elevation_ft, ST_Y(geom) AS latitude_deg, ST_X(geom) AS longitude_deg
    FROM airports
"""


AIRPORT_QUERY = """
WITH airport_runways AS (
    SELECT airport_ident, jsonb_agg(
        jsonb_build_object(
            'id', id,
            'length_ft', length_ft,
            'width_ft', width_ft,
            'surface', surface,
            'lighted', lighted,
            'closed', closed,
            'le_ident', le_ident,
            'le_elevation_ft', le_elevation_ft,
            'le_heading_degt', le_heading_degt,
            'le_displaced_threshold_ft', le_displaced_threshold_ft,
            'le_geom', ST_AsGeoJSON(le_geom)::jsonb,
            'he_ident', he_ident,
            'he_elevation_ft', he_elevation_ft,
            'he_heading_degt', he_heading_degt,
            'he_displaced_threshold_ft', he_displaced_threshold_ft,
            'he_geom', ST_AsGeoJSON(he_geom)::jsonb
        )
    ) AS runways
    FROM runways
    WHERE airport_ident = $1
    GROUP BY airport_ident
),
airport_freqs AS (
    SELECT airport_ident, jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', type,
            'description', description,
            'frequency_mhz', frequency_mhz
        )
    ) AS frequencies
    FROM airport_frequencies
    WHERE airport_ident = $1
    GROUP BY airport_ident
),
airport_navs AS (
    SELECT associated_airport, jsonb_agg(
        jsonb_build_object(
            'id', id,
            'filename', filename,
            'ident', ident,
            'name', name,
            'type', type,
            'frequency_khz', frequency_khz,
            'elevation_ft', elevation_ft,
            'iso_country', iso_country,
            'dme_frequency_khz', dme_frequency_khz,
            'dme_channel', dme_channel,
            'dme_elevation_ft', dme_elevation_ft,
            'slaved_variation_deg', slaved_variation_deg,
            'magnetic_variation_deg', magnetic_variation_deg,
            'usagetype', usagetype,
            'power', power,
            'associated_airport', associated_airport,
            'geom', ST_AsGeoJSON(geom)::jsonb,
            'dme_geom', ST_AsGeoJSON(dme_geom)::jsonb
        )
    ) AS navaids
    FROM navaids
    WHERE associated_airport = $1
    GROUP BY associated_airport
),
airport_comms AS (
    SELECT airport_ident, jsonb_agg(
        jsonb_build_object(
            'id', id,
            'subject', subject,
            'body', body,
            'author', author,
            'date', date
        )
    ) AS comments
    FROM airport_comments
    WHERE airport_ident = $1
    GROUP BY airport_ident
)
SELECT
    a.id,
    a.ident,
    a.type,
    a.name,
    a.elevation_ft,
    a.continent,
    a.iso_country,
    a.iso_region,
    a.municipality,
    a.scheduled_service,
    a.icao_code,
    a.iata_code,
    a.gps_code,
    a.local_code,
    a.home_link,
    a.wikipedia_link,
    a.keywords,
    ST_AsGeoJSON(a.geom)::jsonb AS geom,
    c.name AS country_name,
    r.name AS region_name,
    COALESCE(rw.runways, '[]'::jsonb) AS runways,
    COALESCE(f.frequencies, '[]'::jsonb) AS frequencies,
    COALESCE(n.navaids, '[]'::jsonb) AS navaids,
    COALESCE(ac.comments, '[]'::jsonb) AS comments
FROM airports a
LEFT JOIN countries c ON a.iso_country = c.code
LEFT JOIN regions r ON a.iso_region = r.code
LEFT JOIN airport_runways rw ON a.ident = rw.airport_ident
LEFT JOIN airport_freqs f ON a.ident = f.airport_ident
LEFT JOIN airport_navs n ON a.ident = n.associated_airport
LEFT JOIN airport_comms ac ON a.ident = ac.airport_ident
WHERE a.ident = $1
"""


FLIGHT_PATH_QUERY = """
    SELECT icao24, callsign, path_points
    FROM activate_flight
    WHERE icao24 = $1;
"""


ACTIVATE_FLIGHT_STATES_QUERY = """
    SELECT 
        icao24,
        callsign,
        ROUND(lat::numeric, 3) AS lat,
        ROUND(lon::numeric, 3) AS lon,
        ROUND(geo_altitude::numeric, 2) AS geo_altitude,
        ROUND(velocity::numeric, 2) AS velocity,
        ROUND(heading::numeric, 2) AS heading,
        on_ground
    FROM activate_flight
    WHERE on_ground = FALSE AND time_pos >= NOW() - INTERVAL '20 minutes';
"""


LATEST_DRAP_QUERY = """
    WITH latest_time AS (
      SELECT MAX(observed_at) AS max_ts
      FROM drap_region
    ),
    latest_rows AS (
      SELECT d.observed_at, d.absorption, d.location
      FROM drap_region d
      JOIN latest_time lt ON d.observed_at = lt.max_ts
    ),
    pts AS (
      SELECT jsonb_build_array(
        ST_Y(location::geometry),          -- lat
        ST_X(location::geometry),          -- lon
        COALESCE(absorption, 0)         -- intensity (already normalized)
      ) AS p
      FROM latest_rows
    )
    SELECT jsonb_build_object(
      'timestamp', (SELECT max_ts FROM latest_time),
      'count', (SELECT COUNT(*) FROM latest_rows),
      'points', COALESCE(jsonb_agg(p), '[]'::jsonb)
    ) AS payload
    FROM pts;
"""

KP_INDEX_RANGE_QUERY = """
SELECT time_tag, kp, a_running, station_count
FROM kp_index
WHERE time_tag >= $1 AND time_tag <= $2
ORDER BY time_tag DESC
"""


XRAY_FLUX_RANGE_QUERY = """
SELECT time_tag, satellite, flux, observed_flux, electron_correction, electron_contamination, energy
FROM goes_xray_6hour
WHERE time_tag >= $1 AND time_tag <= $2
ORDER BY time_tag DESC
"""

PROTON_FLUX_RANGE_QUERY = """
SELECT time_tag, satellite, flux_10_mev, flux_50_mev, flux_100_mev, flux_500_mev
FROM goes_proton_flux
WHERE time_tag >= $1 AND time_tag <= $2
ORDER BY time_tag DESC
"""

AURORA_QUERY = """
WITH target_time AS (
    SELECT COALESCE(
        -- 1. If a time is provided, find the closest neighbor using the B-Tree index
        (
            SELECT observation_time
            FROM (
                (SELECT observation_time FROM aurora_forecast 
                 WHERE $1::timestamptz IS NOT NULL AND observation_time >= $1::timestamptz 
                 ORDER BY observation_time ASC LIMIT 1)
                UNION ALL
                (SELECT observation_time FROM aurora_forecast 
                 WHERE $1::timestamptz IS NOT NULL AND observation_time < $1::timestamptz 
                 ORDER BY observation_time DESC LIMIT 1)
            ) nearest
            ORDER BY abs(EXTRACT(epoch FROM (observation_time - $1::timestamptz))) ASC
            LIMIT 1
        ),
        -- 2. If no time is provided ($1 is NULL), fall back to the absolute latest
        (SELECT MAX(observation_time) FROM aurora_forecast)
    ) AS obs_time
),
obs AS (
    -- 3. Now extract the full grid ONLY for that single, closest matching time
    SELECT
        observation_time,
        forecast_time,
        ST_X(location::geometry)::int AS lon,
        ST_Y(location::geometry)::int AS lat,
        aurora
    FROM aurora_forecast
    WHERE observation_time = (SELECT obs_time FROM target_time)
),
pts AS (
    SELECT jsonb_build_array(lon, lat, aurora) AS p
    FROM obs
)
SELECT jsonb_build_object(
    'observation_time', (SELECT MAX(observation_time) FROM obs),
    'forecast_time',    (SELECT MAX(forecast_time)    FROM obs),
    'count',            (SELECT COUNT(*)              FROM obs),
    'coordinates',      COALESCE(jsonb_agg(p), '[]'::jsonb)
) AS payload
FROM pts
"""


ALERT_QUERY = """
SELECT
    issue_datetime,
    alert_messages
FROM alerts
WHERE issue_datetime >= date_trunc('day', NOW()) - (($1 - 1) * INTERVAL '1 day')
ORDER BY issue_datetime DESC
"""
