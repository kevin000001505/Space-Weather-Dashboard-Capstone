FLIGHT_PATH_QUERY = """
    SELECT icao24, callsign, path_points
    FROM activate_flight
    WHERE icao24 = $1;
"""

TRANSMISSION_LINES_QUERY = """
SELECT
    objectid, line_id, type, status, owner, voltage, volt_class,
    inferred, sub_1, sub_2, sourcedate, val_date, shape_len, global_id,
    ST_AsGeoJSON(geom)::jsonb AS geom,
    length
FROM electric_transmission_lines
ORDER BY objectid
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


ALERT_QUERY = """
SELECT
    alert_id,
    issue_datetime AS time,
    alert_messages AS message,
    type,
    subject,
    fields,
    potential_impacts
FROM alerts
WHERE issue_datetime >= date_trunc('day', NOW()) - (($1 - 1) * INTERVAL '1 day')
ORDER BY issue_datetime DESC
"""


LATEST_EVENT_QUERY_V2 = """
WITH latest_grid AS (
    SELECT observed_at, lat, long, {column}
    FROM {table}
    WHERE observed_at = (SELECT MAX(observed_at) FROM {table})
)
SELECT
    JSON_BUILD_OBJECT(
        'timestamp', MAX(observed_at),
        'points', 
            JSON_AGG(
                ROUND({column}::numeric, 2)
                ORDER BY lat DESC, long ASC
                )
    )::text AS values
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


# --- V2 ---
DRAP_RANGE_QUERY_V2 = """
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
	agg.points
FROM events e
LEFT JOIN LATERAL (
	SELECT JSON_AGG(
		COALESCE(absorption, 0)
		ORDER BY lat DESC, long ASC
	) AS points
	FROM drap_region
	WHERE observed_at = e.observed_at
) agg ON true
ORDER BY e.requested_time;
"""

AURORA_RANGE_QUERY_V2 = """
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
		FROM aurora_forecast
		WHERE observed_at >= t.requested_time - INTERVAL '15 minutes'
		  AND observed_at <= t.requested_time + INTERVAL '5 minutes'
		ORDER BY observed_at DESC
		LIMIT 1
	) d ON true
	ORDER BY t.requested_time
)
SELECT
	e.requested_time,
	e.observed_at,
	agg.points
FROM events e
LEFT JOIN LATERAL (
	SELECT JSON_AGG(
		COALESCE(aurora, 0)
		ORDER BY lat DESC, long ASC
	) AS points
	FROM aurora_forecast
	WHERE observed_at = e.observed_at
) agg ON true
ORDER BY e.requested_time;
"""

GEOELECTRIC_RANGE_QUERY_V2 = """
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
	agg.points
FROM events e
LEFT JOIN LATERAL (
	SELECT JSON_AGG(
		ROUND(COALESCE(e_magnitude, 0)::numeric, 2)
		ORDER BY lat DESC, long ASC
	) AS points
	FROM geoelectric_field
	WHERE observed_at = e.observed_at
) agg ON true
ORDER BY e.requested_time;
"""


LOCATION_QUERY = """
SELECT * FROM events_location;
"""

FLIGHTS_RANGE_QUERY = """
SELECT
    time_bucket_gapfill(
        make_interval(mins => $3::int),
        time,
        start => $1::timestamptz,
        finish => $2::timestamptz
    ) AS requested_time,
    locf(last(time,          time), treat_null_as_missing => true)  AS time,
    locf(last(time_pos,      time), treat_null_as_missing => true)  AS time_pos,
    locf(last(icao24,        time), treat_null_as_missing => true)  AS icao24,
    locf(last(callsign,      time), treat_null_as_missing => true)  AS callsign,
    locf(last(lat,           time), treat_null_as_missing => true)  AS lat,
    locf(last(lon,           time), treat_null_as_missing => true)  AS lon,
    locf(last(geo_altitude,  time), treat_null_as_missing => true)  AS geo_altitude,
    locf(last(on_ground,     time), treat_null_as_missing => true)  AS on_ground
FROM flight_states
WHERE icao24 = $4::text AND callsign = $5::text
  AND time >= $1::timestamptz
  AND time <= $2::timestamptz
GROUP BY 1
ORDER BY 1;
"""

FLIGHTS_RANGE_ICAO_QUERY = """
SELECT
    time_bucket_gapfill(
        make_interval(mins => $3::int),
        time,
        start => $1::timestamptz,
        finish => $2::timestamptz
    ) AS requested_time,
    locf(last(time,          time), treat_null_as_missing => true)  AS time,
    locf(last(time_pos,      time), treat_null_as_missing => true)  AS time_pos,
    locf(last(icao24,        time), treat_null_as_missing => true)  AS icao24,
    locf(last(callsign,      time), treat_null_as_missing => true)  AS callsign,
    locf(last(lat,           time), treat_null_as_missing => true)  AS lat,
    locf(last(lon,           time), treat_null_as_missing => true)  AS lon,
    locf(last(geo_altitude,  time), treat_null_as_missing => true)  AS geo_altitude,
    locf(last(on_ground,     time), treat_null_as_missing => true)  AS on_ground
FROM flight_states
WHERE icao24 = $4::text
  AND time >= $1::timestamptz
  AND time <= $2::timestamptz
GROUP BY 1
ORDER BY 1;
"""

FLIGHTS_RANGE_CALLSIGN_QUERY = """
SELECT
    time_bucket_gapfill(
        make_interval(mins => $3::int),
        time,
        start => $1::timestamptz,
        finish => $2::timestamptz
    ) AS requested_time,
    locf(last(time,          time), treat_null_as_missing => true)  AS time,
    locf(last(time_pos,      time), treat_null_as_missing => true)  AS time_pos,
    locf(last(icao24,        time), treat_null_as_missing => true)  AS icao24,
    locf(last(callsign,      time), treat_null_as_missing => true)  AS callsign,
    locf(last(lat,           time), treat_null_as_missing => true)  AS lat,
    locf(last(lon,           time), treat_null_as_missing => true)  AS lon,
    locf(last(geo_altitude,  time), treat_null_as_missing => true)  AS geo_altitude,
    locf(last(on_ground,     time), treat_null_as_missing => true)  AS on_ground
FROM flight_states
WHERE callsign = $4::text
  AND time >= $1::timestamptz
  AND time <= $2::timestamptz
GROUP BY 1
ORDER BY 1;
"""
