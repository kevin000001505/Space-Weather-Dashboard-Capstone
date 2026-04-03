#!/bin/bash
# ============================================================
#  migrate_to_timescale.sh
#  Migrates postgis/postgis → timescale/timescaledb-ha
#  - Progress bars via pv (auto-installed if missing)
#  - Streams dump/restore with no disk double-write
#  - Preserves old volume (renamed, not deleted)
#  - Resume from any step via START_FROM env var
#
#  Usage:
#    Full run:       bash migrate_to_timescale.sh
#    Resume step 6:  DUMP_FILE=/root/sw_migration_20260402_064643.dump START_FROM=6 bash migrate_to_timescale.sh
# ============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail() { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

# ── Config — edit these if your setup differs ────────────────
CONTAINER="postgis"
OLD_IMAGE="postgis/postgis:16-3.4"
NEW_IMAGE="timescale/timescaledb-ha:pg18"
PROJECT="202610-003-team-space-weather"
OLD_VOLUME="${PROJECT}_postgis_data"
NEW_VOLUME="${PROJECT}_postgis_data_timescale"
COMPOSE_FILE="docker-compose.yaml"

# ── Resume control ────────────────────────────────────────────
# Run all steps:         bash migrate_to_timescale.sh
# Skip to step 6:        DUMP_FILE=/root/sw_migration_20260402_064643.dump START_FROM=6 bash migrate_to_timescale.sh
START_FROM="${START_FROM:-1}"
skip() { [ "$1" -lt "$START_FROM" ]; }

# DUMP_FILE: use env var if passed in (for resume), otherwise generate new name
DUMP_FILE="${DUMP_FILE:-$HOME/sw_migration_$(date +%Y%m%d_%H%M%S).dump}"

# ── Load .env ─────────────────────────────────────────────────
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  warn "No .env found — falling back to defaults"
fi

# Use env vars with fallbacks
DB_USER="${POSTGRES_USER:-prefect}"
DB_NAME="${DEVELOPER_DB:-app}"

# ── Default values for variables set inside step blocks ───────
# These ensure skipped steps don't cause unbound variable errors
DB_SIZE="unknown"
DUMP_SIZE="$(du -sh "$DUMP_FILE" 2>/dev/null | cut -f1 || echo 'unknown')"

# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       TimescaleDB Migration Script           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
if [ "$START_FROM" -gt 1 ]; then
  warn "Resuming from step $START_FROM — steps 1-$((START_FROM - 1)) skipped"
  warn "Using dump file: $DUMP_FILE"
  echo ""
fi

# ── Preflight checks ─────────────────────────────────────────
log "Checking prerequisites..."
docker info > /dev/null 2>&1 || fail "Docker not running"
[ -f "$COMPOSE_FILE" ]       || fail "$COMPOSE_FILE not found — run from project root"
docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$" \
                             || fail "Container '$CONTAINER' is not running"

# Auto-install pv if missing
if ! command -v pv &>/dev/null; then
  log "Installing pv (progress viewer)..."
  apt-get install -y -qq pv > /dev/null 2>&1 || fail "Could not install pv — run: apt-get install pv"
  ok "pv installed"
fi
ok "Preflight checks passed"
echo ""

# ── Step 1: Dump with progress ────────────────────────────────
if ! skip 1; then
  echo -e "${BLUE}━━━ Step 1/7 — Dump database ━━━━━━━━━━━━━━━━━━${NC}"

  DB_SIZE=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" | tr -d ' ')
  log "Uncompressed DB size: $DB_SIZE"
  log "Dumping '$DB_NAME' → $DUMP_FILE"
  log "Progress = compressed bytes written (will be smaller than DB size)"
  echo ""

  docker exec "$CONTAINER" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -Fc \
    | pv --name "  Dumping" --timer --rate --bytes \
    > "$DUMP_FILE"

  echo ""
  DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
  ok "Dump complete: $DUMP_FILE ($DUMP_SIZE compressed)"
  echo ""
else
  log "Step 1 skipped"
  DUMP_SIZE=$(du -sh "$DUMP_FILE" 2>/dev/null | cut -f1 || echo "unknown")
  echo ""
fi

# ── Step 2: Stop all services ─────────────────────────────────
if ! skip 2; then
  echo -e "${BLUE}━━━ Step 2/7 — Stop services ━━━━━━━━━━━━━━━━━━${NC}"
  log "Bringing down docker compose stack..."
  docker compose down
  ok "All services stopped"
  echo ""
else
  log "Step 2 skipped"
  echo ""
fi

# ── Step 3: Preserve old volume ───────────────────────────────
if ! skip 3; then
  echo -e "${BLUE}━━━ Step 3/7 — Preserve old volume ━━━━━━━━━━━━${NC}"
  log "Old volume '$OLD_VOLUME' kept untouched as rollback backup"
  log "Creating new volume '$NEW_VOLUME' for TimescaleDB..."
  docker volume create "$NEW_VOLUME" > /dev/null
  ok "New volume created : $NEW_VOLUME"
  ok "Old volume preserved: $OLD_VOLUME (delete manually when satisfied)"
  echo ""
else
  log "Step 3 skipped"
  echo ""
fi

# ── Step 4: Update docker-compose.yaml ───────────────────────
if ! skip 4; then
  echo -e "${BLUE}━━━ Step 4/7 — Update $COMPOSE_FILE ━━━━━━━━━━━━${NC}"
  cp "$COMPOSE_FILE" "${COMPOSE_FILE}.pre-timescale.bak"
  log "Backup saved: ${COMPOSE_FILE}.pre-timescale.bak"

  sed -i "s|image: ${OLD_IMAGE}|image: ${NEW_IMAGE}|g" "$COMPOSE_FILE"
  sed -i "s|${OLD_VOLUME}:|${NEW_VOLUME}:|g"           "$COMPOSE_FILE"
  sed -i "s|- ${OLD_VOLUME}|- ${NEW_VOLUME}|g"         "$COMPOSE_FILE"

  ok "$COMPOSE_FILE updated (image + volume swapped)"
  echo ""
else
  log "Step 4 skipped"
  echo ""
fi

# ── Step 5: Start TimescaleDB container ──────────────────────
if ! skip 5; then
  echo -e "${BLUE}━━━ Step 5/7 — Start TimescaleDB container ━━━━${NC}"
  log "Starting $CONTAINER with $NEW_IMAGE..."
  docker compose up -d "$CONTAINER"
  echo ""

  log "Waiting for TimescaleDB to be ready..."
  log "(timescaledb-ha may restart Postgres during first init — waiting for stable state)"
  ATTEMPTS=0
  STABLE_COUNT=0
  STABLE_NEEDED=5   # require 5 consecutive successes (10s of stability)
  while [ "$STABLE_COUNT" -lt "$STABLE_NEEDED" ]; do
    if docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
      STABLE_COUNT=$((STABLE_COUNT + 1))
      printf "\r  ${CYAN}⠋${NC}  Ready check %d/%d (%ds elapsed)" "$STABLE_COUNT" "$STABLE_NEEDED" "$((ATTEMPTS * 2))"
    else
      STABLE_COUNT=0
      printf "\r  ${CYAN}⠋${NC}  Waiting... (%ds elapsed)          " "$((ATTEMPTS * 2))"
    fi
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    [ $ATTEMPTS -gt 90 ] && fail "TimescaleDB did not stabilize after 180s"
  done
  printf "\r%-60s\n" ""
  ok "TimescaleDB is ready and stable"
  echo ""
else
  log "Step 5 skipped"
  echo ""
fi

# ── Roles (must exist before DB creation) ────────────────────
echo -e "${BLUE}━━━ Roles & Grants ━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -z "${DEVELOPER_USER:-}" ] || [ -z "${DEVELOPER_PASSWORD:-}" ] || [ -z "${READONLY_PASSWORD:-}" ]; then
  warn "DEVELOPER_USER / DEVELOPER_PASSWORD / READONLY_PASSWORD not set in .env — skipping roles"
else
  log "Creating roles..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres \
    -c "CREATE ROLE IF NOT EXISTS readonly WITH LOGIN PASSWORD '${READONLY_PASSWORD}';" \
    2>/dev/null || true
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres \
    -c "CREATE ROLE IF NOT EXISTS ${DEVELOPER_USER} WITH LOGIN CREATEDB PASSWORD '${DEVELOPER_PASSWORD}';" \
    2>/dev/null || true
  # Verify developer role exists
  ROLE_CHECK=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres \
  -tAc "SELECT rolname FROM pg_roles WHERE rolname = '${DEVELOPER_USER}';")
  if [ "$ROLE_CHECK" != "${DEVELOPER_USER}" ]; then
    fail "Role ${DEVELOPER_USER} was not created — check .env credentials"
  fi
  ok "Roles created"
fi
echo ""

# ── Step 6: Restore with progress ────────────────────────────
if ! skip 6; then
  echo -e "${BLUE}━━━ Step 6/7 — Restore database ━━━━━━━━━━━━━━━${NC}"

  log "Waiting for DB to accept queries (stable)..."
  ATTEMPTS=0
  STABLE_COUNT=0
  STABLE_NEEDED=3
  while [ "$STABLE_COUNT" -lt "$STABLE_NEEDED" ]; do
    if docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
      STABLE_COUNT=$((STABLE_COUNT + 1))
    else
      STABLE_COUNT=0
    fi
    printf "\r  ${CYAN}⠋${NC}  Stability check %d/%d (%ds elapsed)" "$STABLE_COUNT" "$STABLE_NEEDED" "$((ATTEMPTS * 2))"
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    [ $ATTEMPTS -gt 60 ] && fail "TimescaleDB not accepting queries after 120s"
  done
  printf "\r%-60s\n" ""
  ok "DB is accepting queries (stable)"
  echo ""
 
  log "Terminating existing connections to '$DB_NAME'..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
  " > /dev/null 2>&1 || true
 
  log "Dropping and recreating '$DB_NAME'..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};" > /dev/null 2>&1 || true
  # Run CREATE DATABASE as superuser but with OWNER set to developer
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres \
    -c "CREATE DATABASE ${DB_NAME} OWNER ${DEVELOPER_USER:-$DB_USER};"
  ok "Database '$DB_NAME' ready (owned by ${DEVELOPER_USER:-$DB_USER})"
 
  log "Enabling extensions..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    CREATE EXTENSION IF NOT EXISTS postgis;
    SELECT timescaledb_pre_restore();
  " > /dev/null 2>&1 || true
  ok "Extensions enabled"
 
  echo ""
  log "Restoring — this is the slow part, grab a coffee ☕"
  log "Progress bar based on dump file size ($DUMP_SIZE)"
  log "ETA is an estimate based on restore throughput"
  echo ""
 
  set +e
  pv --name "  Restoring" \
     --timer --rate --bytes --progress --eta \
     "$DUMP_FILE" \
    | docker exec -i "$CONTAINER" pg_restore \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner
  RESTORE_EXIT=${PIPESTATUS[1]}
  set -e

  echo ""
  # Always run post-restore — even if pg_restore had warnings
  log "Running post-restore..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "SELECT timescaledb_post_restore();" > /dev/null

  if [ "$RESTORE_EXIT" -eq 0 ]; then
    ok "Database restored successfully (no errors)"
  else
    warn "Restore finished with warnings (exit code $RESTORE_EXIT) — check output above"
    warn "post-restore has been run — DB may still be usable"
  fi
  echo ""
else
  log "Step 6 skipped"
  echo ""
fi

# ── Step 7: Verify & bring stack up ──────────────────────────
if ! skip 7; then
  echo -e "${BLUE}━━━ Step 7/7 — Verify & start stack ━━━━━━━━━━━${NC}"
  log "Installed extensions:"
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname IN ('timescaledb', 'postgis');
  "

  log "Bringing up full stack..."
  docker compose up -d
  ok "All services started"
  echo ""
else
  log "Step 7 skipped"
  echo ""
fi

# ── Grants & ownership (roles already created above) ─────────
echo -e "${BLUE}━━━ Grants & Ownership ━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -z "${DEVELOPER_USER:-}" ]; then
  warn "DEVELOPER_USER not set — skipping grants"
else
  log "Granting database-level privileges..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DEVELOPER_USER};
    GRANT CONNECT ON DATABASE ${DB_NAME} TO readonly;
    ALTER DATABASE ${DB_NAME} OWNER TO ${DEVELOPER_USER};
EOSQL
 
  log "Granting table-level privileges on app database..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<-EOSQL
    GRANT ALL ON ALL TABLES IN SCHEMA public TO ${DEVELOPER_USER};
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${DEVELOPER_USER};
    GRANT ALL ON SCHEMA public TO ${DEVELOPER_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DEVELOPER_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DEVELOPER_USER};
EOSQL
 
  log "Ensuring extensions..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS btree_gist;
EOSQL

  ok "Grants and ownership applied"
fi
echo ""

# ── Hypertables ───────────────────────────────────────────────
echo -e "${BLUE}━━━ Hypertables ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log "Converting drap_region → hypertable..."
docker exec "$CONTAINER" psql -U "$DEVELOPER_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE TABLE drap_region_ts (LIKE drap_region INCLUDING ALL);

    SELECT create_hypertable(
        'drap_region_ts',
        'observed_at',
        chunk_time_interval => INTERVAL '1 month'
    );

    INSERT INTO drap_region_ts SELECT * FROM drap_region;

    ALTER TABLE drap_region RENAME TO drap_region_old;
    ALTER TABLE drap_region_ts RENAME TO drap_region;

    SELECT hypertable_name FROM timescaledb_information.hypertables
    WHERE hypertable_name = 'drap_region';
EOSQL
ok "drap_region converted"

log "Converting geoelectric_field → hypertable..."
docker exec "$CONTAINER" psql -U "$DEVELOPER_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE TABLE geoelectric_field_ts (LIKE geoelectric_field INCLUDING ALL);

    SELECT create_hypertable(
        'geoelectric_field_ts',
        'observed_at',
        chunk_time_interval => INTERVAL '1 month'
    );

    INSERT INTO geoelectric_field_ts SELECT * FROM geoelectric_field;

    ALTER TABLE geoelectric_field RENAME TO geoelectric_field_old;
    ALTER TABLE geoelectric_field_ts RENAME TO geoelectric_field;

    SELECT hypertable_name FROM timescaledb_information.hypertables
    WHERE hypertable_name = 'geoelectric_field';
EOSQL
ok "geoelectric_field converted"

log "Converting aurora_forecast → hypertable..."
docker exec "$CONTAINER" psql -U "$DEVELOPER_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE TABLE aurora_forecast_ts (LIKE aurora_forecast INCLUDING ALL);

    SELECT create_hypertable(
        'aurora_forecast_ts',
        'observation_time',
        chunk_time_interval => INTERVAL '1 month'
    );

    INSERT INTO aurora_forecast_ts SELECT * FROM aurora_forecast;

    ALTER TABLE aurora_forecast RENAME TO aurora_forecast_old;
    ALTER TABLE aurora_forecast_ts RENAME TO aurora_forecast;

    SELECT hypertable_name FROM timescaledb_information.hypertables
    WHERE hypertable_name = 'aurora_forecast';
EOSQL
ok "aurora_forecast converted"
echo ""

# ── Transfer ownership to developer ──────────────────────────
echo -e "${BLUE}━━━ Ownership Transfer ━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -z "${DEVELOPER_USER:-}" ]; then
  warn "DEVELOPER_USER not set — skipping ownership transfer"
else
  log "Transferring ownership of all tables to ${DEVELOPER_USER}..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    DO \$\$
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${DEVELOPER_USER};';
      END LOOP;
    END \$\$;
  "

  log "Transferring ownership of all sequences to ${DEVELOPER_USER}..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    DO \$\$
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
      LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO ${DEVELOPER_USER};';
      END LOOP;
    END \$\$;
  "

  log "Transferring ownership of all views to ${DEVELOPER_USER}..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    DO \$\$
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public'
      LOOP
        EXECUTE 'ALTER VIEW public.' || quote_ident(r.viewname) || ' OWNER TO ${DEVELOPER_USER};';
      END LOOP;
    END \$\$;
  " 2>/dev/null || true

  log "Setting default privileges for future objects..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DEVELOPER_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DEVELOPER_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${DEVELOPER_USER};
  "

  log "Verifying ownership..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT tablename, tableowner
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  "
  ok "All objects transferred to ${DEVELOPER_USER}"
fi
echo ""

# ── Summary ───────────────────────────────────────────────────
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Migration Complete ✓                 ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
printf "${GREEN}║${NC}  %-42s${GREEN}║${NC}\n" "New image  : $NEW_IMAGE"
printf "${GREEN}║${NC}  %-42s${GREEN}║${NC}\n" "New volume : $NEW_VOLUME"
printf "${GREEN}║${NC}  %-42s${GREEN}║${NC}\n" "Dump file  : $DUMP_FILE"
printf "${GREEN}║${NC}  %-42s${GREEN}║${NC}\n" "Old volume : $OLD_VOLUME (preserved)"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
warn "Clean up once you're confident everything works:"
warn "  docker volume rm $OLD_VOLUME"
warn "  rm $DUMP_FILE"
warn "  DROP TABLE drap_region_old, geoelectric_field_old, aurora_forecast_old;"
