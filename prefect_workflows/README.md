# Prefect Workflows

ETL pipelines that ingest space weather data from NOAA and flight data from OpenSky, persist it to TimescaleDB, and broadcast live updates to Redis for the FastAPI SSE stream.

---

## Directory Structure

```
prefect_workflows/
├── prefect.yaml              # Flow deployments and schedules
├── flows/                    # @flow definitions (orchestration)
│   ├── aurora_extract.py
│   ├── drap_extract.py
│   ├── geomatic_extract.py
│   ├── xray_extract.py
│   ├── proton_flux_plot.py
│   ├── kp_index.py
│   ├── alert.py
│   ├── flights_capture.py
│   ├── airports_extract.py
│   ├── transmission_lines_extract.py
│   └── db_maintain.py
├── tasks/                    # @task definitions (data processing)
│   ├── models.py             # Pydantic models for all data types
│   ├── aurora.py
│   ├── drap.py
│   ├── geomatic.py
│   ├── xray_latest.py
│   ├── proton_flux_plot.py
│   ├── kp_index.py
│   ├── alert.py
│   ├── flights.py
│   ├── airports.py
│   ├── transmission_lines.py
│   ├── db.py
│   └── d_rap_etl/            # Modular DRAP ETL sub-package
│       ├── extractors.py
│       ├── transformers.py
│       └── loaders.py
└── database/                 # Database setup utilities
    ├── create.py             # Table creation DDL
    ├── functions.py          # SQL functions and procedures
    └── queries.py            # Common query templates
```

---

## Scheduled Flows

All flows are deployed via `prefect.yaml`. NOAA data runs on **NOAA-pool**; flight ingestion runs on **flight-pool**.

| Flow Name | File | Schedule | Work Pool | Description |
|---|---|---|---|---|
| `DRAP Extract` | `drap_extract.py` | Every 1 min | NOAA-pool | Fetch D-Region Absorption Prediction grid from NOAA |
| `Aurora Extract` | `aurora_extract.py` | Every 1 min | NOAA-pool | Fetch auroral forecast grid from NOAA |
| `Geoelectric Field Extract` | `geomatic_extract.py` | Every 1 min | NOAA-pool | Fetch surface geoelectric field measurements |
| `Alert Extract` | `alert.py` | Every 1 min | NOAA-pool | Fetch active space weather alerts from NOAA |
| `X-ray Extract` | `xray_extract.py` | Every 1 min | NOAA-pool | Fetch GOES X-ray flux data |
| `opensky-ingester` | `flights_capture.py` | Every 2 min | flight-pool | Fetch live flight states from OpenSky API |
| `Proton Flux Extract` | `proton_flux_plot.py` | Every 5 min | NOAA-pool | Fetch GOES proton flux measurements |
| `Kp Index Extract` | `kp_index.py` | Hourly | NOAA-pool | Fetch planetary Kp geomagnetic index |
| `airport-data-refresh` | `airports_extract.py` | Daily 00:00 UTC | flight-pool | Refresh airport, runway, frequency, navaid data |
| `daily-retention-cleanup` | `db_maintain.py` | Daily 00:00 UTC | NOAA-pool | Enforce per-table data retention policies |

**Manual / one-time flows:**

| Flow Name | File | Description |
|---|---|---|
| `db_initial` | `db_maintain.py` | Initialize all DB tables and hypertable indexes |
| `events_location_init` | `db_maintain.py` | Initialize location snapshot tables |
| `transmission-lines-ingest` | `transmission_lines_extract.py` | One-time load of US power grid geometries |

---

## Data Models (`tasks/models.py`)

Pydantic `BaseModel` classes used for validation before DB insertion. Each model has a `.to_tuple()` method for use with asyncpg's `executemany`.

| Model | Table | Key Fields |
|---|---|---|
| `FlightStateRecord` | `flight_states` | icao24, callsign, lat, lon, altitude, velocity, heading, timestamp |
| `AirportRecord` | `airports` | ident, type, name, lat, lon, country, municipality |
| `CountryRecord`, `RegionRecord` | reference tables | iso codes, names |
| `RunwayRecord`, `FrequencyRecord`, `NavaidRecord` | airport detail tables | airport_ident, dimensions, frequencies |
| `DrapRecord` | `drap_region` | lat, lon, absorption_value, timestamp |
| `AuroraRecord` | `aurora_forecast` | lat, lon, aurora_value, timestamp |
| `GeoelectricRecord` | `geoelectric_field` | lat, lon, field_value, timestamp |
| `XraySixHourRecord` | `xray_flux` | time, satellite, current_class, flux |
| `ProtonFluxPlot` | `proton_flux` | time, satellite, flux_value, energy_band |
| `KPIndexRecord` | `kp_index` | time, kp_value, source |
| `AlertRecord` | `space_weather_alerts` | issue_time, message, product_id |
| `TransmissionLineRecord` | `transmission_lines` | geometry (PostGIS), voltage, name |

---

## ETL Pattern

Each flow follows the same three-stage pattern:

```
Extract  →  Transform/Validate  →  Load + Broadcast
```

1. **Extract** — HTTP request to NOAA endpoint or OpenSky API
2. **Transform** — Parse response, create Pydantic model instances
3. **Load** — Bulk insert into TimescaleDB via asyncpg `executemany`
4. **Broadcast** — Publish JSON payload to Redis pub/sub channel

Example (DRAP):
```python
@flow
async def rap_extract_flow():
    raw = await fetch_drap_data()          # Extract
    records = parse_drap_records(raw)       # Transform
    await insert_drap_records(records)      # Load
    await broadcast_to_redis(records)       # Broadcast
```

Redis channels (defined in `shared/redis.py`): `DRAP`, `AURORA`, `GEOELECTRIC`, `XRAY`, `PROTONFLUX`, `KPINDEX`, `ALERTS`, `FLIGHTS`, `FLIGHT_DRAP_ALERTS`.

---

## Database Utilities (`database/`)

| File | Purpose |
|---|---|
| `create.py` | DDL for all tables, TimescaleDB hypertable creation, PostGIS indexes |
| `functions.py` | SQL stored functions and procedures used by flows |
| `queries.py` | Parameterized query templates for inserts and lookups |

The `db_initial` flow (`db_maintain.py:initialize_db_flow`) runs all DDL from `create.py` on first deploy — it is idempotent and safe to re-run.

---

## Shared Utilities

All flows have access to the `shared/` package (mounted at runtime):

| Module | Used For |
|---|---|
| `shared/db_utils.py` | Singleton asyncpg connection pool (`get_pool()`) |
| `shared/redis.py` | Redis client, channel constants, cache TTL config |
| `shared/logger.py` | `get_logger(name)` — returns Prefect logger inside a flow, standard logger elsewhere |
| `shared/prefect_utils.py` | `variable_upsert(name, value)` — set Prefect variables from within flows |

---

## Environment Variables

Set via Docker Compose from `.env`:

| Variable | Description |
|---|---|
| `PREFECT_API_URL` | Prefect server connection (e.g. `http://prefect-server:4200/api`) |
| `DATABASE_URL` | asyncpg connection string for `app` database |
| `DEVELOPER_PASSWORD` | PostgreSQL `developer` user password |
| `DEVELOPER_DB` | App database name (default: `app`) |
| `DEVELOPER_USER` | App database user (default: `developer`) |
| `RETENTION_DAYS_*` | Per-table retention window for daily cleanup flow |
| `PYOPENSKY_SETTINGS` | Path to pyopensky credentials file (OpenSky API auth) |

---

## Testing

Flow tests live in `tests/test_flows/`. Each flow has a corresponding test file (enforced by `tests/test_coverage_enforcement.py`).

```bash
# Run all flow tests
pytest tests/test_flows/ -v

# Run a single flow test
pytest tests/test_flows/test_drap_extract.py -v
```

Tests mock external HTTP calls (NOAA, OpenSky) and use a real PostGIS instance spun up by the CI workflow. The `conftest.py` in `tests/test_flows/` provides database fixtures and pre-configured mocks.

External API availability is checked separately in `tests/test_api_health/` — these are not run in CI by default.

---

## Hot Reloading

Both `prefect_workflows/` and `shared/` are bind-mounted into the worker containers. Code changes to tasks or flows are picked up **without rebuilding** the Docker image:

```bash
# Changes to flows/ or tasks/ take effect immediately on next run
# To force a restart of the workers:
docker compose restart prefect-worker-noaa prefect-worker-flight
```

To re-deploy flow schedules after editing `prefect.yaml`:

```bash
docker compose up -d --build --force-recreate --no-deps prefect-init
```
