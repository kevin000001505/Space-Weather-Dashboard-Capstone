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

## Airports

### `GET /api/v1/airports/latest`
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
Returns the recorded flight path for a specific aircraft as a GeoJSON LineString.

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
  "path_geojson": {
    "type": "LineString",
    "coordinates": [
      [-118.408, 33.943],
      [-117.500, 34.100]
    ]
  }
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `icao24` | string | No | ICAO transponder address |
| `callsign` | string | Yes | Flight callsign |
| `number_of_points` | int | No | Number of coordinate points in the path |
| `path_geojson` | object | No | GeoJSON LineString of the flight path |

---

## D-RAP (HF Radio Absorption)

### `GET /api/v1/drap/latest`
Returns the latest D-RAP (D-Region Absorption Prediction) grid as a list of weighted points.

**No parameters.**

**Response** — `DRAPResponse`
```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "count": 3240,
  "query_time_ms": 45.2,
  "total_time_ms": 48.1,
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
| `query_time_ms` | float | Yes | SQL query execution time |
| `total_time_ms` | float | Yes | Total endpoint execution time |
| `points` | `[[lat, lon, intensity]]` | No | Each element is `[latitude, longitude, absorption (0–1)]` |

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
Returns aurora forecast data for a specific observation time.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `utc_time` | string (ISO 8601) | **Yes** | — | — | Observation time in UTC (e.g. `2026-03-13T06:17:00Z`) |

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
| `coordinates` | `[[lon, int, aurora]]` | No | Each element is `[longitude, latitude, aurora intensity]` |
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

## Error Responses

All endpoints return standard error objects on failure:

| Status | Meaning |
|--------|---------|
| `404` | No data found for the given parameters |
| `422` | Invalid or missing parameters (e.g. `utc_time` not provided, time range too short, `end` ≤ `start`) |
| `500` | Internal database or server error |

```json
{ "detail": "Description of the error" }
```
