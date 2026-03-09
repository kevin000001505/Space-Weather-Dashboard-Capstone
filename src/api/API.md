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
| `flights[].lat` | float | Yes | Latitude (3 decimal places) |
| `flights[].lon` | float | Yes | Longitude (3 decimal places) |
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
| `hours` | int | No | 24 | 1–168 | Look-back window in hours |

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
Returns GOES X-ray solar flare event records over a time window.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `hours` | int | No | 24 | 1–168 | Look-back window in hours |

**Response** — `XRayListResponse`
```json
{
  "xray_fluxes": [
    {
      "time_tag": "2026-03-08T10:00:00Z",
      "satellite": 16,
      "current_class": "C1.2",
      "current_ratio": 1.2,
      "current_int_xrlong": 0.000034,
      "begin_time": "2026-03-08T09:45:00Z",
      "begin_class": "B9.8",
      "max_time": "2026-03-08T09:58:00Z",
      "max_class": "C1.2",
      "max_xrlong": 0.000041,
      "end_time": "2026-03-08T10:05:00Z",
      "end_class": "C1.0",
      "max_ratio_time": "2026-03-08T09:58:00Z",
      "max_ratio": 1.5
    }
  ]
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `time_tag` | datetime | No | Record timestamp |
| `satellite` | int | No | GOES satellite number (e.g. 16, 18) |
| `current_class` | string | Yes | Current X-ray flare class (e.g. `C1.2`, `M5.0`) |
| `current_ratio` | float | Yes | Ratio of current flux to background |
| `current_int_xrlong` | float | Yes | Current integrated long-channel X-ray flux |
| `begin_time` | datetime | Yes | Flare start time |
| `begin_class` | string | Yes | Flare class at start |
| `max_time` | datetime | Yes | Time of peak flux |
| `max_class` | string | Yes | Flare class at peak |
| `max_xrlong` | float | Yes | Peak long-channel X-ray flux |
| `end_time` | datetime | Yes | Flare end time |
| `end_class` | string | Yes | Flare class at end |
| `max_ratio_time` | datetime | Yes | Time of peak flux ratio |
| `max_ratio` | float | Yes | Peak flux ratio |

---

### `GET /api/v1/proton-flux`
Returns GOES solar proton flux readings across multiple energy channels over a time window.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `hours` | int | No | 24 | 1–168 | Look-back window in hours |

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

## Error Responses

All endpoints return standard error objects on failure:

| Status | Meaning |
|--------|---------|
| `404` | No data found for the given parameters |
| `500` | Internal database or server error |

```json
{ "detail": "No {type} data available" }
```
