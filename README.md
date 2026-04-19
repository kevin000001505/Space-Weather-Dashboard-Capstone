# Space Weather Dashboard — GMU DAEN Capstone

A real-time space weather and flight-tracking dashboard that overlays NOAA space weather data (aurora, D-RAP, geoelectric fields, Kp index, X-ray flux, proton flux, alerts) with live OpenSky flight data on an interactive 3D map. Built for the George Mason University DAEN Capstone Program.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (port 80)                          │
│  /          →  frontend   /api/  →  fastapi   /prefect/  →  UI  │
│  /pgadmin/  →  pgadmin    /dozzle/ →  dozzle                    │
└────────────┬────────────────────────────────────────────────────┘
             │
   ┌─────────┴──────────────────────────────────────┐
   │  React/Vite Frontend                           │
   │  deck.gl map  |  Chart.js analytics  |  Redux  │
   └────────────────────────┬───────────────────────┘
                            │ SSE + REST
   ┌────────────────────────▼───────────────────────┐
   │  FastAPI  (/api/v1, /api/v2)                   │
   │  asyncpg pool  |  Redis cache  |  Pydantic     │
   └──────────┬──────────────────┬──────────────────┘
              │                  │
   ┌──────────▼──────┐  ┌────────▼──────────────────┐
   │  TimescaleDB    │  │  Redis (pub/sub + cache)   │
   │  (PostGIS/pg18) │  └────────▲──────────────────┘
   │  2 databases:   │           │ broadcast
   │  prefect + app  │  ┌────────┴──────────────────┐
   └─────────────────┘  │  Prefect Workers           │
                        │  NOAA-pool + flight-pool   │
                        │  → NOAA APIs + OpenSky     │
                        └───────────────────────────┘
```

---

## Directory Structure

```
.
├── frontend/                 # React 19 + Vite application
│   └── src/
│       ├── components/       # UI components (map, charts, help, about)
│       ├── hooks/            # useLiveStream, useLayerZoomDim, etc.
│       ├── store/slices/     # Redux slices per data domain
│       └── api/              # Async thunks + compression support
├── src/
│   └── api/                  # FastAPI backend
│       ├── main.py           # All route definitions
│       ├── config.py         # Pydantic response models
│       ├── validator.py      # TypeAdapter validators
│       └── database/
│           └── queries.py    # Raw SQL strings
├── prefect_workflows/        # Prefect ETL pipelines
│   ├── flows/                # @flow definitions
│   ├── tasks/                # @task definitions + Pydantic models
│   ├── database/             # Table DDL, functions, query templates
│   └── prefect.yaml          # Deployment + schedule config
├── shared/                   # Mounted into FastAPI + Prefect workers
│   ├── db_utils.py           # asyncpg singleton pool
│   ├── redis.py              # Redis client, channel names, TTLs
│   ├── compression.py        # Delta-bitpack encode/decode
│   ├── logger.py             # Structured logger factory
│   └── prefect_utils.py      # Prefect variable helper
├── docker/                   # Dockerfiles + init scripts
│   ├── api/                  # FastAPI image (python:3.12-slim)
│   ├── flows_package/        # Prefect worker image
│   ├── db-init-scripts/      # PostGIS + schema init
│   └── nginx/                # Reverse proxy config
├── tests/                    # Pytest test suites
│   ├── test_api_responses/   # API endpoint integration tests
│   ├── test_flows/           # Prefect flow unit tests
│   └── test_api_health/      # External API availability checks
├── .github/workflows/        # CI/CD GitHub Actions
├── docker-compose.yaml       # All services wired together
└── .env.example              # Required environment variable template
```

---

## Services

| Service | Description | Exposed |
|---|---|---|
| `nginx` | Reverse proxy — routes all traffic | port 80 |
| `frontend` | React/Vite app | via nginx `/` |
| `fastapi` | REST API + SSE stream | via nginx `/api/` |
| `postgis` | TimescaleDB (pg18) — `prefect` + `app` databases | localhost:5432 |
| `redis` | Pub/sub broker + data cache | internal |
| `prefect-server` | Prefect orchestration UI + API | via nginx `/prefect/` |
| `prefect-init` | One-shot container: creates pools, deploys flows, inits DB | — |
| `prefect-worker-noaa` | Runs NOAA-pool scheduled flows | — |
| `prefect-worker-flight` | Runs flight-pool scheduled flows | — |
| `pgadmin` | Database admin UI | via nginx `/pgadmin/` |
| `dozzle` | Container log viewer | via nginx `/dozzle/` |

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git
- OpenSky credentials (for flight ingestion)

### Environment Setup

```bash
cp .env.example .env
```

Required variables in `.env`:

| Variable | Description |
|---|---|
| `DEVELOPER_PASSWORD` | PostgreSQL `developer` user password |
| `READONLY_PASSWORD` | PostgreSQL read-only user password |
| `PYOPENSKY_SETTINGS` | Path to pyopensky settings file (default: `./secrets/pyopensky-settings`) |

The defaults `DEVELOPER_DB=app` and `DEVELOPER_USER=developer` from `.env.example` are correct for local dev.

### Start Everything

```bash
docker compose up -d --build
```

`prefect-init` runs automatically on first start to create work pools, deploy flows, and initialize DB tables.

### Access Points

| Service | URL |
|---|---|
| Dashboard | `http://localhost/` |
| API docs | `http://localhost/api/docs` |
| Prefect UI | `http://localhost/prefect/` |
| pgAdmin | `http://localhost/pgadmin/` |
| Dozzle logs | `http://localhost/dozzle/` |

---

## Frontend

**Stack:** React 19 · Redux Toolkit · React Router 7 · deck.gl 9 · MapLibre GL 5 · Chart.js 4 · Material-UI 7

### Routes

| Path | Component | Description |
|---|---|---|
| `/` | Landing | Cinematic welcome screen with particle animation |
| `/map-dashboard` | PlaneTracker | Interactive map with all overlays + flight info |
| `/analytics` | Charts | Time-series charts for solar indices |
| `/help` | Help | Searchable help documentation |
| `/about` | About | Team and project information |

### Map Overlays (`/map-dashboard`)

- **Flights** — Live aircraft positions from OpenSky, colored by altitude
- **D-RAP** — HF radio absorption grid (polar coverage map)
- **Aurora** — Auroral forecast overlay
- **Geoelectric** — Surface electric field measurements
- **Transmission Lines** — US power grid infrastructure layer

### Real-Time Data Flow

```
Prefect → TimescaleDB → Redis pub/sub → FastAPI SSE → useLiveStream.js → Redux
```

The `useLiveStream` hook connects to `/api/v1/stream/live` and dispatches named events (`planes`, `aurora`, `drap`, `xray`, `protonflux`, `kpindex`, `alerts`, `geoelectric`, `flight_drap_alerts`) to the appropriate Redux slices.

### Redux Slices

| Slice | Data |
|---|---|
| `planesSlice` | Active flight states |
| `drapSlice` | D-RAP absorption grid |
| `auroraSlice` | Aurora forecast grid |
| `geoElectricSlice` | Geoelectric field grid |
| `chartsSlice` | Chart state and settings |
| `flightPathSlice` | Individual aircraft path histories |
| `airportsSlice` | Airport reference data |
| `electricTransmissionLinesSlice` | Power infrastructure geometries |
| `playbackSlice` | Historical playback controls |
| `uiSlice` | UI preferences |

---

## API Reference

Base paths: `/api/v1` and `/api/v2`. Full documentation at `/api/docs`.

### SSE Stream

```
GET /api/v1/stream/live
```

Pushes named events every ~15 seconds: `planes`, `aurora`, `drap`, `xray`, `protonflux`, `kpindex`, `alerts`, `geoelectric`, `flight_drap_alerts`.

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/active-flight-states/latest` | Current non-ground flights (20-min recency) |
| `GET` | `/api/v1/flight-path/{icao24}` | Historical path for one aircraft |
| `GET` | `/api/v1/airports` | Airport list (paginated, Redis cached) |
| `GET` | `/api/v1/airport/{ident}` | Airport details with runways, frequencies, navaids |
| `GET` | `/api/v1/kp-index` | Kp index time series (default: last 3 hours) |
| `GET` | `/api/v1/xray` | X-ray flux time series |
| `GET` | `/api/v1/proton-flux` | Proton flux time series |
| `GET` | `/api/v1/alert` | Space weather alerts |
| `GET` | `/api/v2/{event}/latest` | Latest snapshot — `drap`, `aurora`, `geoelectric` |
| `GET` | `/api/v2/kermit` | Historical snapshots with time bucketing + gap-fill |
| `GET` | `/api/v2/location` | Grid coordinate reference data |
| `GET` | `/api/v1/transmission-lines` | Power line geometries |
| `GET/PUT` | `/api/v1/flight-drap-alerts/threshold` | D-RAP absorption alert threshold |

V2 endpoints support optional delta-bitpack compression: append `?encoding=delta-bitpack`.

---

## Data Pipelines

See [prefect_workflows/README.md](prefect_workflows/README.md) for full pipeline documentation.

**Scheduled flows:**

| Flow | Schedule | Source |
|---|---|---|
| DRAP, Aurora, Geoelectric, Alert, X-ray | Every minute | NOAA |
| OpenSky flight ingestion | Every 2 minutes | OpenSky API |
| Proton flux | Every 5 minutes | NOAA |
| Kp index | Hourly | NOAA |
| Airport data refresh, DB retention cleanup | Daily (00:00 UTC) | OurAirports / internal |

---

## Database

**TimescaleDB** (PostgreSQL 18 + PostGIS) with two databases:

| Database | User | Purpose |
|---|---|---|
| `prefect` | `prefect` | Prefect server metadata |
| `app` | `developer` | All application data |

Key tables use TimescaleDB hypertables for time-series queries. Data retention is enforced per-table via `RETENTION_DAYS_*` environment variables (managed by the `daily-retention-cleanup` flow).

---

## Development Workflow

```bash
# Rebuild and restart a single service after code changes
docker compose up -d --build fastapi

# Hot-reload for prefect workers (shared volume is live-mounted)
docker compose restart prefect-worker-noaa

# View logs
docker compose logs -f fastapi
docker compose logs -f prefect-worker-noaa

# Run backend tests
source .venv/bin/activate
pytest

# Run frontend dev server
cd frontend
npm install
npm run dev

# Lint frontend
npm run lint
```

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-api.yml` | Push/PR on `src/**`, `docker/api/**` | Test + deploy API |
| `deploy-frontend.yml` | Push/PR on `frontend/**` | Build + deploy frontend |
| `deploy-prefect.yml` | Push/PR on `prefect_workflows/**` | Test + deploy Prefect workers |
| `deploy.yml` | Manual (type "DEPLOY") | Deploy any/all services |
| `api-health.yml` | Scheduled | API health monitoring |
| `sync-flows.yml` | Automatic | Sync Prefect flow deployments |

CI runs `tests/test_folder_structure.py` and `tests/test_coverage_enforcement.py` on all pipelines, then service-specific integration tests before deploying.

---

## Contributing

- Follow PEP 8 for Python (`black` for formatting)
- Every new Prefect flow must have a corresponding test file (enforced by `test_coverage_enforcement.py`)
- Never commit secrets or credentials — add to `.gitignore` and use environment variables
- Write meaningful commit messages
- Test changes locally before opening a pull request

---

## Contact

**Project Team:** Space Weather  
**Program:** GMU DAEN Capstone 2026  
**Coordinator:** Professor Schmidt

---

*Licensed under the Apache License 2.0*
