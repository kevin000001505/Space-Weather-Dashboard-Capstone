AIRPORTS_LATEST_QUERY = """
    SELECT 
        name, iata_code, gps_code, municipality, iso_country, elevation_ft, latitude_deg, longitude_deg
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
"""


LATEST_FLIGHT_STATES_QUERY = """
    WITH latest_time AS (
        SELECT MAX(time) as max_time FROM flight_states
    )
    SELECT 
        fs.icao24,
        fs.callsign,
        fs.time,
        fs.time_pos,
        ROUND(fs.lat::numeric, 4) AS lat,
        ROUND(fs.lon::numeric, 4) AS lon,
        ROUND(fs.baro_altitude::numeric, 2) AS baro_altitude,
        ROUND(fs.geo_altitude::numeric, 2) AS geo_altitude,
        ROUND(fs.velocity::numeric, 2) AS velocity,
        ROUND(fs.heading::numeric, 2) AS heading,
        ROUND(fs.vert_rate::numeric, 2) AS vert_rate,
        fs.on_ground
    FROM flight_states fs
    CROSS JOIN latest_time lt
    WHERE fs.time = lt.max_time
    ORDER BY fs.callsign NULLS LAST, fs.icao24
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
