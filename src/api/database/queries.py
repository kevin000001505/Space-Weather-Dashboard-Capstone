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
        COALESCE(on_ground, FALSE) AS on_ground
    FROM activate_flight
    WHERE on_ground = FALSE AND time_pos >= NOW() - INTERVAL '20 minutes';
"""


LATEST_DRAP_QUERY = """
    WITH latest_time AS (
        SELECT MAX(observed_at) AS max_ts
        FROM drap_region
    )
    SELECT JSON_BUILD_OBJECT(
        'timestamp', lt.max_ts,
        'points', JSON_AGG(JSON_BUILD_ARRAY(
            lat, 
            long, 
            COALESCE(d.absorption, 0)
        ))
    )::text AS payload
    FROM drap_region d
    JOIN latest_time lt ON d.observed_at = lt.max_ts
    GROUP BY lt.max_ts;
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
WITH latest_aurora AS (
	-- Your existing logic to grab the latest data goes here
	SELECT observation_time, lat, long, aurora 
	FROM aurora_forecast
	WHERE observation_time = (SELECT MAX(observation_time) FROM aurora_forecast)
)
SELECT 
	MAX(observation_time) AS timestamp,
	JSON_AGG(JSON_BUILD_ARRAY(lat, long, aurora)) AS points
FROM latest_aurora;
"""


ALERT_QUERY = """
SELECT
    issue_datetime AS time,
    alert_messages AS message
FROM alerts
WHERE issue_datetime >= date_trunc('day', NOW()) - (($1 - 1) * INTERVAL '1 day')
ORDER BY issue_datetime DESC
"""

LATEST_GEOELECTRIC_QUERY = """
    WITH latest_grid AS (
        -- Your existing logic to grab the latest data goes here
        SELECT observed_at, lat, long, e_magnitude, quality_flag 
        FROM geoelectric_field
        WHERE observed_at = (SELECT MAX(observed_at) FROM geoelectric_field)
    )
    SELECT 
        MAX(observed_at) AS timestamp,
        JSON_AGG(JSON_BUILD_ARRAY(lat, long, ROUND(e_magnitude::numeric, 2), quality_flag)) AS points
    FROM latest_grid;
"""


AIRPORTS_LATEST_QUERY = """
    SELECT 
        ident, 
        name, 
        iata_code, 
        gps_code, 
        type, 
        municipality, 
        iso_country AS country, 
        elevation_ft, 
        ROUND(ST_Y(geom)::numeric, 3):: float8 AS lat, 
        ROUND(ST_X(geom)::numeric, 3):: float8 AS lon
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
    COALESCE(n.navaids, '[]'::jsonb) AS navaids
FROM airports a
LEFT JOIN countries c ON a.iso_country = c.code
LEFT JOIN regions r ON a.iso_region = r.code
LEFT JOIN airport_runways rw ON a.ident = rw.airport_ident
LEFT JOIN airport_freqs f ON a.ident = f.airport_ident
LEFT JOIN airport_navs n ON a.ident = n.associated_airport
WHERE a.ident = $1
"""

# -----------------------------
# Range Query

DRAP_RANGE_QUERY = """
WITH time_ticks AS (
	SELECT generate_series(
		$1::timestamptz,
		$2::timestamptz,
		make_interval(mins => $3::int)
	) AS requested_time
),
events AS (
	SELECT DISTINCT ON (t.requested_time)
		t.requested_time,
		d.observed_at
	FROM time_ticks t
	LEFT JOIN LATERAL (
		SELECT observed_at
		FROM drap_region
		WHERE observed_at >= t.requested_time - INTERVAL '15 minutes'
		  AND observed_at <= t.requested_time + INTERVAL '5 minute'
        ORDER BY observed_at DESC
		LIMIT 1
	) d ON true
	ORDER BY t.requested_time
)
SELECT
	e.requested_time,
	e.observed_at,
	JSON_AGG(
		JSON_BUILD_ARRAY(
			d.lat,
			d.long,
			COALESCE(d.absorption, 0)
		)
	) AS points
FROM events e
LEFT JOIN drap_region d 
ON d.observed_at = e.observed_at
GROUP BY e.requested_time, e.observed_at
ORDER BY e.requested_time;
"""

AURORA_RANGE_QUERY = """
WITH time_ticks AS (
	SELECT generate_series(
		$1::timestamptz,
		$2::timestamptz,
		make_interval(mins => $3::int)
	) AS requested_time
),
events AS (
    SELECT DISTINCT ON (t.requested_time)
        t.requested_time,
        d.observation_time AS observed_at
    FROM time_ticks t
    LEFT JOIN LATERAL (
        SELECT observation_time
        FROM aurora_forecast
        WHERE observation_time >= t.requested_time - INTERVAL '15 minutes'
          AND observation_time <= t.requested_time + INTERVAL '5 minutes'
        ORDER BY observation_time DESC
        LIMIT 1
    ) d ON true
    ORDER BY t.requested_time
),
event_points AS (
    SELECT
        e.requested_time,
        e.observed_at,
        f.lat,
        f.long,
        COALESCE(f.aurora, 0) AS aurora
    FROM events e
    LEFT JOIN aurora_forecast f ON f.observation_time = e.observed_at
)
SELECT
    requested_time,
    observed_at,
    JSON_AGG(
        JSON_BUILD_ARRAY(lat, long, aurora)
    ) AS points
FROM event_points
GROUP BY requested_time, observed_at
ORDER BY requested_time;
"""

GEOELECTRIC_RANGE_QUERY = """
WITH time_ticks AS (
	SELECT generate_series(
		$1::timestamptz,
		$2::timestamptz,
		make_interval(mins => $3::int)
	) AS requested_time
),
events AS (
	SELECT DISTINCT ON (t.requested_time)
		t.requested_time,
		d.observed_at
	FROM time_ticks t
	LEFT JOIN LATERAL (
		SELECT observed_at
		FROM geoelectric_field
		WHERE observed_at >= t.requested_time - INTERVAL '15 minutes'
		  AND observed_at <= t.requested_time + INTERVAL '5 minute'
		ORDER BY observed_at DESC
		LIMIT 1
	) d ON true
	ORDER BY t.requested_time
)
SELECT
	e.requested_time,
	e.observed_at,
	JSON_AGG(
		JSON_BUILD_ARRAY(
			d.lat,
			d.long,
			ROUND(COALESCE(d.e_magnitude, 0)::numeric, 2),
            quality_flag
		)
	) AS points
FROM events e
LEFT JOIN geoelectric_field d 
ON d.observed_at = e.observed_at
GROUP BY e.requested_time, e.observed_at
ORDER BY e.requested_time;
"""

FLIGHTS_RANGE_QUERY = """"""

PAST_RANGE_DATA = """
WITH time_ticks AS (
    SELECT generate_series(
        $1::timestamptz,
		$2::timestamptz,
		make_interval(mins => $3::int)
    ) AS requested_time
),
events AS (
    SELECT DISTINCT ON (t.requested_time)
        t.requested_time,
        d.observed_at
    FROM time_ticks t
    LEFT JOIN LATERAL (
        SELECT observed_at
        FROM drap_region
        WHERE observed_at >= t.requested_time - INTERVAL '15 minutes'
          AND observed_at <= t.requested_time + INTERVAL '1 minute'
        ORDER BY observed_at DESC
        LIMIT 1
    ) d ON true
    ORDER BY t.requested_time
)
SELECT
    e.requested_time,
    e.observed_at,
    JSON_AGG(
        JSON_BUILD_ARRAY(
            d.lat,
            d.long,
            ROUND(COALESCE(d.absorption, 0)::numeric, 2)
        )
    ) AS points
FROM events e
LEFT JOIN drap_region d
    ON d.observed_at = e.observed_at
GROUP BY e.requested_time, e.observed_at
ORDER BY e.requested_time;
"""
