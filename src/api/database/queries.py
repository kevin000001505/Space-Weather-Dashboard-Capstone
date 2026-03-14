AIRPORTS_LATEST_QUERY = """
    SELECT 
        name, iata_code, gps_code, type, municipality, iso_country, elevation_ft, latitude_deg, longitude_deg
    FROM airports
"""


FLIGHT_PATH_QUERY = """
    SELECT
        icao24,
        callsign,
        ST_AsGeoJSON(
            ST_MakeLine( (dp).geom ORDER BY (dp).path )
        )::jsonb AS path_geojson
    FROM (
    SELECT icao24, callsign, ST_DumpPoints(path_geom) AS dp
    FROM activate_flight
    WHERE icao24 = $1
    ) s
    GROUP BY icao24, callsign;
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
WITH obs AS (
    SELECT
        observation_time,
        forecast_time,
        ST_X(location::geometry)::int AS lon,
        ST_Y(location::geometry)::int AS lat,
        aurora
    FROM aurora_forecast
    WHERE observation_time = $1
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
