# Space Weather API Documentation

Base URL: `/api/v1`

---

## System Endpoints

### `GET /`
Health check / root.

**Response**
```json
{ "message": "D-RAP Data API", "status": "running" }
```

### `GET /health`
Simple liveness probe.

**Response**
```json
{ "status": "healthy" }
```

---

## Live Stream

### `GET /api/v1/stream/live`
Server-Sent Events (SSE) stream that pushes real-time updates for all data types. Each event has a named type and a JSON payload. A `: heartbeat` comment is sent every ~15 seconds to keep the connection alive.

**No parameters.**

**Event types**

| Event | Description |
|-------|-------------|
| `planes` | Latest active flight states |
| `aurora` | Latest aurora forecast |
| `drap` | Latest D-RAP grid |
| `xray` | Latest X-ray flux readings |
| `protonflux` | Latest proton flux readings |
| `kpindex` | Latest Kp index readings |
| `alerts` | Latest space weather alerts |
| `geoelectric` | Latest geoelectric field data |

**Example stream**
```
event: planes
data: {"timestamp": "...", "count": 5000, "flights": [...]}

event: aurora
data: {"observation_time": "...", "forecast_time": "...", "count": 18840, "coordinates": [...]}

: heartbeat
```

---

## Airports

### `GET /api/v1/airports`
Returns all airports from the database.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `limit` | int | No | all | 1–200,000 | Maximum number of airports to return |

**Response** — `AirportsResponse`
```json
{
  "airports": [
    {
      "ident": "KLAX",
      "name": "Los Angeles International Airport",
      "iata_code": "LAX",
      "gps_code": "KLAX",
      "type": "large_airport",
      "municipality": "Los Angeles",
      "country": "US",
      "elevation_ft": 125,
      "lat": 33.943,
      "lon": -118.408
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `ident` | string | No | ICAO identifier |
| `name` | string | No | Full airport name |
| `iata_code` | string | Yes | IATA 3-letter code |
| `gps_code` | string | Yes | ICAO GPS code |
| `type` | string | Yes | e.g. `large_airport`, `small_airport` |
| `municipality` | string | Yes | City |
| `country` | string | Yes | ISO 2-letter country code |
| `elevation_ft` | int | Yes | Elevation in feet |
| `lat` | float | No | Latitude (3 decimal places) |
| `lon` | float | No | Longitude (3 decimal places) |

---

### `GET /api/v1/airport/{ident}`
Returns detailed information for a single airport including runways, frequencies, navaids, and comments.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `ident` | string | ICAO identifier (case-insensitive, e.g. `KLAX`) |

**Response** — `AirportDetailResponse`
```json
{
  "id": 26434,
  "ident": "KLAX",
  "type": "large_airport",
  "name": "Los Angeles International Airport",
  "elevation_ft": 125,
  "continent": "NA",
  "iso_country": "US",
  "iso_region": "US-CA",
  "municipality": "Los Angeles",
  "scheduled_service": true,
  "icao_code": "KLAX",
  "iata_code": "LAX",
  "gps_code": "KLAX",
  "local_code": "LAX",
  "home_link": "https://www.flylax.com/",
  "wikipedia_link": "https://en.wikipedia.org/wiki/Los_Angeles_International_Airport",
  "keywords": null,
  "geom": { "type": "Point", "coordinates": [-118.408, 33.943] },
  "country_name": "United States",
  "region_name": "California",
  "runways": [
    {
      "id": 1,
      "length_ft": 12091,
      "width_ft": 200,
      "surface": "ASP",
      "lighted": true,
      "closed": false,
      "le_ident": "06L",
      "le_elevation_ft": 126,
      "le_heading_degt": 69.0,
      "le_displaced_threshold_ft": null,
      "le_geom": null,
      "he_ident": "24R",
      "he_elevation_ft": 119,
      "he_heading_degt": 249.0,
      "he_displaced_threshold_ft": null,
      "he_geom": null
    }
  ],
  "frequencies": [
    {
      "id": 1,
      "type": "APP",
      "description": "LOS ANGELES APPROACH",
      "frequency_mhz": 124.5
    }
  ],
  "navaids": [
    {
      "id": 1,
      "ident": "LAX",
      "name": "LOS ANGELES",
      "type": "VORTAC",
      "frequency_khz": 113700
    }
  ],
  "comments": []
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | int | No | Internal database ID |
| `ident` | string | No | ICAO identifier |
| `type` | string | Yes | Airport type |
| `name` | string | No | Full airport name |
| `elevation_ft` | float | Yes | Elevation in feet |
| `continent` | string | Yes | Continent code |
| `iso_country` | string | Yes | ISO 2-letter country code |
| `iso_region` | string | Yes | ISO region code |
| `municipality` | string | Yes | City |
| `scheduled_service` | bool | Yes | Whether scheduled service operates |
| `icao_code` | string | Yes | ICAO code |
| `iata_code` | string | Yes | IATA 3-letter code |
| `gps_code` | string | Yes | GPS code |
| `local_code` | string | Yes | Local code |
| `home_link` | string | Yes | Airport website URL |
| `wikipedia_link` | string | Yes | Wikipedia URL |
| `keywords` | string | Yes | Search keywords |
| `geom` | GeoJSON Point | Yes | Airport geometry |
| `country_name` | string | Yes | Full country name |
| `region_name` | string | Yes | Full region name |
| `runways` | array | No | List of runway objects (may be empty) |
| `frequencies` | array | No | List of radio frequency objects (may be empty) |
| `navaids` | array | No | List of navaid objects (may be empty) |
| `comments` | array | No | List of comment objects (may be empty) |

---

## Flights

### `GET /api/v1/active-flight-states/latest`
Returns currently active airborne flights from the last 20 minutes.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `limit` | int | No | all | 1–20,000 | Maximum number of flights to return |

**Response** — `FlightStatesResponse`
```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "count": 42,
  "query_time_ms": 12.34,
  "total_time_ms": 15.67,
  "flights": [
    {
      "icao24": "a1b2c3",
      "callsign": "UAL123",
      "lat": 37.621,
      "lon": -122.379,
      "geo_altitude": 10500.0,
      "velocity": 245.5,
      "heading": 270.0,
      "on_ground": false
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO 8601) | No | Response generation time (UTC) |
| `count` | int | No | Number of flights returned |
| `query_time_ms` | float | No | SQL query execution time |
| `total_time_ms` | float | No | Total endpoint execution time |
| `flights[].icao24` | string | No | ICAO 24-bit transponder address |
| `flights[].callsign` | string | Yes | Flight callsign |
| `flights[].lat` | float | Yes | Latitude |
| `flights[].lon` | float | Yes | Longitude |
| `flights[].geo_altitude` | float | Yes | GPS altitude in meters |
| `flights[].velocity` | float | Yes | Ground speed in m/s |
| `flights[].heading` | float | Yes | True heading in degrees |
| `flights[].on_ground` | bool | No | Always `false` for this endpoint |

---

### `GET /api/v1/flight-path/{icao24}`
Returns the recorded flight path for a specific aircraft as an ordered list of coordinate points.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `icao24` | string | ICAO 24-bit transponder address |

**Response** — `FlightPathResponse`
```json
{
  "icao24": "a1b2c3",
  "callsign": "UAL123",
  "number_of_points": 2,
  "path_points": [
    [-118.408, 33.943],
    [-117.500, 34.100]
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `icao24` | string | No | ICAO transponder address |
| `callsign` | string | Yes | Flight callsign |
| `number_of_points` | int | No | Number of coordinate points in the path |
| `path_points` | `[[float, float]]` | No | Ordered list of `[longitude, latitude]` coordinate pairs |

---

## D-RAP (HF Radio Absorption)

### `GET /api/v1/drap/latest`
Returns the most recent D-RAP (D-Region Absorption Prediction) grid snapshot.

**No parameters.**

**Response** — `DRAPResponse`
```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "count": 3240,
  "points": [
    [45.0, -93.0, 0.75],
    [46.0, -93.0, 0.50]
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `timestamp` | datetime | No | Observation time of this D-RAP snapshot |
| `count` | int | No | Number of grid points |
| `points` | `[[lat, lon, intensity]]` | No | Each element is `[latitude, longitude, absorption (0–1)]` |

---

### `GET /api/v1/drap`
Returns D-RAP snapshots over a time range, grouped by observation timestamp.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `start` | datetime (ISO 8601) | No | 1 hour before `end` | — | Start of time range (e.g. `2026-03-13T05:00:00Z`) |
| `end` | datetime (ISO 8601) | No | now | — | End of time range (e.g. `2026-03-13T06:00:00Z`) |

**Time window rules:**
- Neither provided → last 1 hour up to now
- Only `end` → 1 hour before `end` up to `end`
- Only `start` → `start` up to now
- Both provided → exact range

**Examples**
```
GET /api/v1/drap
GET /api/v1/drap?start=2026-03-13T05:00:00Z&end=2026-03-13T06:00:00Z
```

**Response** — `DRAPRangeResponse`
```json
{
  "count": 2,
  "snapshots": [
    {
      "timestamp": "2026-03-13T05:00:00Z",
      "count": 3240,
      "points": [[45.0, -93.0, 0.75]]
    },
    {
      "timestamp": "2026-03-13T05:05:00Z",
      "count": 3240,
      "points": [[45.0, -93.0, 0.80]]
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `count` | int | No | Number of snapshots returned |
| `snapshots[].timestamp` | datetime | No | Observation time of this snapshot |
| `snapshots[].count` | int | No | Number of grid points in this snapshot |
| `snapshots[].points` | `[[lat, lon, intensity]]` | No | Each element is `[latitude, longitude, absorption (0–1)]` |

---

## Space Weather

### `GET /api/v1/kp-index`
Returns Kp geomagnetic index readings over a time window. Updated every 3 hours.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `start` | datetime (ISO 8601) | No | 3 days before `end` | — | Start of time range (e.g. `2026-03-11T00:00:00Z`) |
| `end` | datetime (ISO 8601) | No | now | — | End of time range (e.g. `2026-03-14T00:00:00Z`) |

**Time window rules:**
- Neither provided → last 3 days up to now
- Only `end` → 3 days before `end` up to `end`
- Only `start` → `start` up to now
- Both provided → exact range; minimum span is **3 hours**

**Response** — `KpIndexListResponse`
```json
{
  "indices": [
    {
      "time_tag": "2026-03-07T21:00:00Z",
      "kp": 4.0,
      "a_running": 27,
      "station_count": 8
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `time_tag` | datetime | No | Observation timestamp (UTC) |
| `kp` | float | No | Kp index value (0–9 scale) |
| `a_running` | int | Yes | Running A-index |
| `station_count` | int | Yes | Number of contributing magnetometer stations |

---

### `GET /api/v1/xray`
Returns GOES X-ray solar flux measurements over a time window.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `start` | datetime (ISO 8601) | No | 3 days before `end` | — | Start of time range (e.g. `2026-03-11T00:00:00Z`) |
| `end` | datetime (ISO 8601) | No | now | — | End of time range (e.g. `2026-03-14T00:00:00Z`) |

**Time window rules:**
- Neither provided → last 3 days up to now
- Only `end` → 3 days before `end` up to `end`
- Only `start` → `start` up to now
- Both provided → exact range; minimum span is **1 hour**

**Response** — `XRayListResponse`
```json
{
  "xray_fluxes": [
    {
      "time_tag": "2026-03-08T10:00:00Z",
      "satellite": 16,
      "flux": 1.23e-6,
      "observed_flux": 1.20e-6,
      "electron_correction": 0.03e-6,
      "electron_contamination": false,
      "energy": "0.1-0.8nm"
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `time_tag` | datetime | No | Observation timestamp (UTC) |
| `satellite` | int | No | GOES satellite number (e.g. 16, 18) |
| `flux` | float | No | X-ray flux value (W/m²) |
| `observed_flux` | float | No | Raw observed flux before correction (W/m²) |
| `electron_correction` | float | No | Electron contamination correction applied |
| `electron_contamination` | bool | No | Whether electron contamination was detected |
| `energy` | string | No | Energy channel (e.g. `0.1-0.8nm`) |

---

### `GET /api/v1/proton-flux`
Returns GOES solar proton flux readings across multiple energy channels over a time window.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `start` | datetime (ISO 8601) | No | 3 days before `end` | — | Start of time range (e.g. `2026-03-11T00:00:00Z`) |
| `end` | datetime (ISO 8601) | No | now | — | End of time range (e.g. `2026-03-14T00:00:00Z`) |

**Time window rules:**
- Neither provided → last 3 days up to now
- Only `end` → 3 days before `end` up to `end`
- Only `start` → `start` up to now
- Both provided → exact range; minimum span is **1 hour**

**Response** — `ProtonFluxListResponse`
```json
{
  "data": [
    {
      "time_tag": "2026-03-08T10:00:00Z",
      "satellite": 16,
      "flux_10_mev": 1.25,
      "flux_50_mev": 0.43,
      "flux_100_mev": 0.12,
      "flux_500_mev": 0.01
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `time_tag` | datetime | No | Observation timestamp (UTC) |
| `satellite` | int | No | GOES satellite number |
| `flux_10_mev` | float | Yes | Proton flux >10 MeV (particles/cm²/s/sr) |
| `flux_50_mev` | float | Yes | Proton flux >50 MeV |
| `flux_100_mev` | float | Yes | Proton flux >100 MeV |
| `flux_500_mev` | float | Yes | Proton flux >500 MeV |

---

### `GET /api/v1/aurora`
Returns aurora forecast data. With no parameters, returns the latest available data from cache/database.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `utc_time` | string (ISO 8601) | No | latest | — | Observation time in UTC (e.g. `2026-03-13T06:17:00Z`) |

**Response** — `AuroraResponse`
```json
{
  "observation_time": "2026-03-13T06:00:00Z",
  "forecast_time": "2026-03-13T06:17:00Z",
  "count": 18840,
  "coordinates": [
    [-180, 90, 0],
    [-179, 90, 2]
  ],
  "query_time_ms": 22.1,
  "total_time_ms": 25.4
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `observation_time` | datetime | No | Observation time of the aurora snapshot (UTC) |
| `forecast_time` | datetime | No | Forecast issue time (UTC) |
| `count` | int | No | Number of coordinate points |
| `coordinates` | `[[lon, lat, aurora]]` | No | Each element is `[longitude, latitude, aurora intensity]` |
| `query_time_ms` | float | Yes | SQL query execution time |
| `total_time_ms` | float | Yes | Total endpoint execution time |

---

### `GET /api/v1/alert`
Returns space weather alert records.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `days` | int | No | 1 | 1–30 | Number of past days to include (ending today) |

**Response** — `AlertListResponse`
```json
{
  "data": [
    {
      "time": "2026-03-13T18:00:00Z",
      "message": "ALERT: Geomagnetic K-index of 5..."
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `data[].time` | datetime | No | Alert issue time (UTC) |
| `data[].message` | string | No | Full alert message text |

---

## Geoelectric Field

### `GET /api/v1/geoelectric/latest`
Returns the most recent geoelectric field snapshot.

**No parameters.**

**Response** — `GeoelectricResponse`
```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "count": 1024,
  "points": [
    [45.0, -93.0, 0.42, 1],
    [46.0, -93.0, 0.31, 0]
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `timestamp` | datetime | No | Observation time of this snapshot |
| `count` | int | No | Number of data points |
| `points` | `[[lat, lon, e_magnitude, quality_flag]]` | No | Each element is `[latitude, longitude, electric field magnitude, quality flag]` |

---

### `GET /api/v1/geoelectric`
Returns geoelectric field snapshots over a time range, grouped by observation timestamp.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `start` | datetime (ISO 8601) | No | 1 hour before `end` | — | Start of time range (e.g. `2026-03-13T05:00:00Z`) |
| `end` | datetime (ISO 8601) | No | now | — | End of time range (e.g. `2026-03-13T06:00:00Z`) |

**Time window rules:**
- Neither provided → last 1 hour up to now
- Only `end` → 1 hour before `end` up to `end`
- Only `start` → `start` up to now
- Both provided → exact range

**Examples**
```
GET /api/v1/geoelectric
GET /api/v1/geoelectric?start=2026-03-13T05:00:00Z&end=2026-03-13T06:00:00Z
```

**Response** — `GeoelectricRangeResponse`
```json
{
  "count": 2,
  "snapshots": [
    {
      "timestamp": "2026-03-13T05:00:00Z",
      "count": 1024,
      "points": [[45.0, -93.0, 0.42, 1]]
    },
    {
      "timestamp": "2026-03-13T05:05:00Z",
      "count": 1024,
      "points": [[45.0, -93.0, 0.45, 1]]
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `count` | int | No | Number of snapshots returned |
| `snapshots[].timestamp` | datetime | No | Observation time of this snapshot |
| `snapshots[].count` | int | No | Number of data points in this snapshot |
| `snapshots[].points` | `[[lat, lon, e_magnitude, quality_flag]]` | No | Each element is `[latitude, longitude, electric field magnitude, quality flag]` |

---

## Error Responses

All endpoints return standard error objects on failure:

| Status | Meaning |
|--------|---------|
| `404` | No data found for the given parameters |
| `422` | Invalid or missing parameters (e.g. invalid time format, time range too short, `end` ≤ `start`) |
| `500` | Internal database or server error |

```json
{ "detail": "Description of the error" }
```
### Rohit and Tarun did nothing. 