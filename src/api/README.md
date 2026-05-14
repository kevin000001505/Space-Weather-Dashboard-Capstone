# Space Weather API Documentation

FastAPI service exposing space weather observations, flight data, and a live SSE stream.

Base URLs:

- `/api/v1` — stable v1 endpoints
- `/api/v2` — newer endpoints supporting compressed payloads and ranged queries

**Cross-cutting behavior**

- CORS: all origins, methods, and headers allowed.
- Gzip compression for responses ≥ 1000 bytes.
- Every response includes an `X-Process-Time` header (seconds, full middleware-to-middleware). Endpoints that instrument their handlers additionally set `X-Query-Time` (SQL only) and `X-Handler-Time` (handler total).
- Most data endpoints accept `?debug=true`, which short-circuits the normal response body and returns `{ "total_time_ms", "query_time_ms" }` for profiling.
- All timestamps are UTC ISO 8601.

---

## System Endpoints

### `GET /`

Health check / root.

```json
{ "message": "D-RAP Data API", "status": "running" }
```

### `GET /health`

Liveness probe.

```json
{ "status": "healthy" }
```

### `GET /api/kermit`

Returns a GIF (`image/gif`). For your viewing pleasure.

---

## Live Stream

### `GET /api/v1/stream/live`

Server-Sent Events (SSE) stream backed by Redis pub/sub. The server pulses a `: heartbeat` comment every ~15 seconds via the heartbeat channel.

**No parameters.** Returns `503` if Redis is unreachable.

**Event types**

| Event                | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `planes`             | Latest active flight states                                |
| `aurora`             | Latest aurora forecast                                     |
| `drap`               | Latest D-RAP grid                                          |
| `xray`               | Latest X-ray flux readings                                 |
| `protonflux`         | Latest proton flux readings                                |
| `kpindex`            | Latest Kp index readings                                   |
| `alerts`             | Latest space weather alerts                                |
| `geoelectric`        | Latest geoelectric field snapshot                          |
| `flight_drap_alerts` | Flights currently exceeding the D-RAP absorption threshold |

**Example stream**

```
event: planes
data: {"timestamp": "...", "count": 5000, "flights": [...]}

event: flight_drap_alerts
data: {"timestamp": "...", "threshold": 0.6, "count": 3, "alerts": [...]}

: heartbeat
```

---

## Flight–D-RAP Alert Threshold

### `GET /api/v1/flight-drap-alerts/threshold`

Returns the current absorption threshold used to flag flights crossing high-D-RAP regions.

```json
{ "threshold": 0.6 }
```

Returns `503` if Redis is unreachable.

### `PUT /api/v1/flight-drap-alerts/threshold`

Updates the threshold.

**Query Parameters**
| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `threshold` | float | Yes | `0 < threshold ≤ 100` |

```json
{ "threshold": 0.75 }
```

---

## Airports

### `GET /api/v1/airports`

All airports. Cached in Redis; reads from cache when warm, otherwise falls back to Postgres and populates the cache.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| `limit` | int | No | all | 1–200,000 |
| `debug` | bool | No | false | — |

**Response** — `List[Airport]`

```json
[
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
```

### `GET /api/v1/airport/{ident}`

Single-airport detail including runways, frequencies, and navaids. `ident` is case-insensitive.

**Response** — `AirportDetailResponse` (excerpt)

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
  "geom": { "type": "Point", "coordinates": [-118.408, 33.943] },
  "country_name": "United States",
  "region_name": "California",
  "runways": [
    {
      "id": 1,
      "length_ft": 12091,
      "surface": "ASP",
      "le_ident": "06L",
      "he_ident": "24R"
    }
  ],
  "frequencies": [{ "id": 1, "type": "APP", "frequency_mhz": 124.5 }],
  "navaids": [
    { "id": 1, "ident": "LAX", "type": "VORTAC", "frequency_khz": 113700 }
  ]
}
```

Returns `404` if the ident is not found.

---

## Transmission Lines

### `GET /api/v1/transmission-lines`

All electrical transmission lines, with GeoJSON geometry.

**Response** — `List[TransmissionLineResponse]`

```json
[
  {
    "objectid": 1,
    "line_id": 12345,
    "type": "AC",
    "status": "IN SERVICE",
    "owner": "...",
    "voltage": 345.0,
    "volt_class": "345",
    "inferred": false,
    "sub_1": "...",
    "sub_2": "...",
    "sourcedate": "2024-01-15",
    "val_date": "2024-06-01",
    "shape_len": 12345.6,
    "global_id": "...",
    "geom": { "type": "LineString", "coordinates": [[...]] },
    "length": 12345.6
  }
]
```

---

## Flights

### `GET /api/v1/active-flight-states/latest`

Currently active airborne flights from the most recent snapshot.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| `limit` | int | No | all | 1–20,000 |
| `debug` | bool | No | false | — |

**Response** — `FlightStatesResponse`

```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "count": 42,
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

Timing is reported via `X-Query-Time` / `X-Handler-Time` headers.

### `GET /api/v1/flight-path/{icao24}`

Recorded flight path for a single aircraft.

**Response** — `FlightPathResponse`

```json
{
  "icao24": "a1b2c3",
  "callsign": "UAL123",
  "number_of_points": 2,
  "path_points": [
    [-118.408, 33.943],
    [-117.5, 34.1]
  ]
}
```

`path_points` are `[longitude, latitude]` pairs in order.

### `GET /api/v2/kermit/flight-path`

Ranged flight paths sampled at a configurable interval. At least one of `icao24` or `callsign` is required.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start` | datetime (ISO 8601) | No | 2 hours before `end` | Start of range |
| `end` | datetime (ISO 8601) | No | now | End of range |
| `interval` | int | No | 5 | Sampling gap (minutes) |
| `icao24` | string | No¹ | — | Filter by ICAO 24-bit address |
| `callsign` | string | No¹ | — | Filter by callsign |

¹ At least one of `icao24` / `callsign` must be provided, otherwise `400`.

**Response** — `FlightPathRangeResponse`

```json
{
  "requested_time": ["2026-03-08T11:00:00Z", "2026-03-08T11:05:00Z"],
  "time": ["2026-03-08T11:00:13Z", null],
  "points": [
    {
      "time_pos": "2026-03-08T11:00:13Z",
      "icao24": "a1b2c3",
      "callsign": "UAL123",
      "lat": 37.621,
      "lon": -122.379,
      "geo_altitude": 10500.0,
      "heading": 270.0,
      "on_ground": false
    },
    null
  ]
}
```

Indices in `requested_time`, `time`, and `points` are aligned. A `null` `time`/`points` entry means no sample was available for that requested slot.

---

## Space Weather Time Series

All three endpoints below share the same time-window semantics:

- Neither `start` nor `end` → last `default_hours` up to now (default `3 hours`).
- Only `end` → `default_hours` before `end`, up to `end`.
- Only `start` → `start` up to now.
- Both → exact range; `end` must be greater than `start` (`422` otherwise).
- A `start` or `end` in the future returns `400`.

### `GET /api/v1/kp-index`

**Response** — `List[KpIndexResponse]`

```json
[
  {
    "time_tag": "2026-03-07T21:00:00Z",
    "kp": 4.0,
    "a_running": 27,
    "station_count": 8
  }
]
```

### `GET /api/v1/xray`

**Response** — `List[XRayResponse]`

```json
[
  {
    "time_tag": "2026-03-08T10:00:00Z",
    "satellite": 16,
    "flux": 1.23e-6,
    "observed_flux": 1.2e-6,
    "electron_correction": 0.03e-6,
    "electron_contamination": false,
    "energy": "0.1-0.8nm"
  }
]
```

### `GET /api/v1/proton-flux`

**Response** — `List[ProtonFluxResponse]`

```json
[
  {
    "time_tag": "2026-03-08T10:00:00Z",
    "satellite": 16,
    "flux_10_mev": 1.25,
    "flux_50_mev": 0.43,
    "flux_100_mev": 0.12,
    "flux_500_mev": 0.01
  }
]
```

---

## Alerts

### `GET /api/v1/alert`

Space weather alerts.

**Query Parameters**
| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| `days` | int | No | 1 | 1–30 |

**Response** — `List[AlertResponse]`

```json
[
  {
    "time": "2026-03-13T18:00:00Z",
    "message": "ALERT: Geomagnetic K-index of 5...",
    "parsed_message": {
      "type": "ALERT",
      "subject": "Geomagnetic K-index of 5",
      "fields": { "...": "..." },
      "potential_impacts": "..."
    }
  }
]
```

`parsed_message` is built from stored parsed columns when present and falls back to on-the-fly parsing for legacy rows.

---

## V2 Spatial Events (D-RAP / Aurora / Geoelectric)

These endpoints replace the older per-event v1 latest/range endpoints. The event type is part of the URL.

### `GET /api/v2/{events}/latest`

Most recent snapshot for the chosen event.

**Path Parameters**
| Parameter | Type | Values |
|-----------|------|--------|
| `events` | string | `drap`, `geoelectric`, `aurora` |

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `encoding` | string | No | — | If `delta-bitpack`, return the points field compressed; otherwise raw JSON |
| `debug` | bool | No | false | Return timing JSON instead of payload |

**Response (raw)** — `EventsResponseV2`

```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "points": [0.75, 0.50, 0.42, ...]
}
```

**Response (delta-bitpack)**

```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "encoding": "delta-bitpack",
  "points": {
    "values": [...],
    "bits": 8,
    "count": 18840,
    "data": "<base64-ish payload>"
  }
}
```

Point ordering is implicit (positional) and must be paired with the coordinate list from `GET /api/v2/location`.

### `GET /api/v2/kermit`

Ranged snapshots for one event type.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `event` | string | No | `drap` | One of `drap`, `geoelectric`, `aurora` |
| `start` | datetime (ISO 8601) | No | 2 hours before `end` | Start of range |
| `end` | datetime (ISO 8601) | No | now | End of range |
| `interval` | int | No | 5 | Sampling gap (minutes) |

`start`/`end` are floored to the minute before querying.

**Response** — `List[SnapshotResponseV2]`

```json
[
  {
    "requested_time": "2026-03-08T11:00:00Z",
    "observed_at": "2026-03-08T11:00:13Z",
    "points": [0.75, 0.50, ...]
  },
  {
    "requested_time": "2026-03-08T11:05:00Z",
    "observed_at": null,
    "points": null
  }
]
```

Entries with `observed_at: null` indicate no data was available for that requested time.

### `GET /api/v2/location`

Coordinate lists that pair positionally with the `points` arrays returned by the v2 spatial endpoints above.

**Response** — `LocationData`

```json
{
  "drap":        [[lat, lon], ...],
  "aurora":      [[lat, lon], ...],
  "geoelectric": [[lat, lon], ...]
}
```

---

## Error Responses

All errors follow:

```json
{ "detail": "Description of the error" }
```

| Status | Meaning                                                                            |
| ------ | ---------------------------------------------------------------------------------- |
| `400`  | Bad request — e.g. future `start`/`end`, missing required filter (icao24/callsign) |
| `404`  | No data found for the given parameters                                             |
| `422`  | Validation failure — bad time format, `end ≤ start`, parameter out of range        |
| `500`  | Internal database or server error                                                  |
| `503`  | Dependent service (Redis cache / SSE) unavailable                                  |

Rohit and Tarun did nothing.
