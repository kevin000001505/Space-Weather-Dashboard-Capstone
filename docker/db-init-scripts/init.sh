#!/bin/bash
set -e


# ── 1. Create roles ──
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'readonly') THEN
            CREATE ROLE readonly WITH LOGIN PASSWORD '${READONLY_PASSWORD}';
        END IF;
    END \$\$;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DEVELOPER_USER}') THEN
            CREATE ROLE ${DEVELOPER_USER} WITH LOGIN CREATEDB PASSWORD '${DEVELOPER_PASSWORD}';
        END IF;
    END \$\$;
EOSQL

# ── 2. Create the app database owned by developer ──
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    SELECT 'CREATE DATABASE $DEVELOPER_DB OWNER $DEVELOPER_USER'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DEVELOPER_DB')\gexec
EOSQL

# ── 3. Grant database-level privileges ──
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE $DEVELOPER_DB TO $DEVELOPER_USER;
    GRANT CONNECT ON DATABASE $DEVELOPER_DB TO readonly;
EOSQL

# ── 4. Create PostGIS extension as SUPERUSER (prefect) ──
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DEVELOPER_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    CREATE EXTENSION IF NOT EXISTS timescaledb;
EOSQL

echo "Database initialization complete."
echo "   - Roles:     prefect (superuser), $DEVELOPER_USER (app admin), readonly"
echo "   - Databases: prefect (Prefect Server), $DEVELOPER_DB (app data, owned by developer)"
