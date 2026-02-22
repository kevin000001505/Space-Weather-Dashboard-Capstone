import pandas as pd
from datetime import datetime, timedelta, timezone
from database.db_tools import get_connection
from prefect import flow, task, get_run_logger
from prefect.blocks.system import Secret
from prefect.variables import Variable
from pyopensky.rest import REST


def clean_row(row):
    """
    Maps OpenSky Arrow-backed DataFrame row -> Native Python Tuple for AsyncPG.
    AsyncPG requires native Python types (datetime, float, str), not Arrow/Numpy types.
    """

    def get_val(key, type_cast=None):
        val = row.get(key)

        if pd.isna(val) or val is None or val == "":
            return None

        try:
            if type_cast:
                return type_cast(val)
            return val
        except (ValueError, TypeError):
            return None

    def get_ts(key):
        val = row.get(key)
        if pd.isna(val) or val is None:
            return None
        return val.to_pydatetime()

    return (
        get_ts("timestamp"),  # time
        str(row.get("icao24")).strip(),  # icao24
        get_val("callsign", str),  # callsign
        get_val("origin_country", str),  # origin_country
        get_ts("last_position"),  # time_pos
        get_val("latitude", float),  # lat
        get_val("longitude", float),  # lon
        get_val("geoaltitude", float),  # geo_altitude
        get_val("altitude", float),  # baro_altitude
        get_val("groundspeed", float),  # velocity
        get_val("track", float),  # heading
        get_val("vertical_rate", float),  # vert_rate
        bool(row.get("onground", False)),  # on_ground
        get_val("squawk", str),  # squawk
        bool(row.get("spi", False)),  # spi
        get_val("position_source", int),  # source
        None,  # sensors
        get_val("longitude", float),  # geom_lon
        get_val("latitude", float),  # geom_lat
    )


def clean_records(df):
    """
    Clean and validate flight records from DataFrame.

    Args:
        df: DataFrame with flight data

    Returns:
        List of cleaned tuples, or empty list if no valid records
    """
    if df.empty:
        return []

    records = [clean_row(row) for _, row in df.iterrows()]

    # Filter: timestamp and icao24 must exist
    records = [r for r in records if r[0] is not None and r[1]]

    return records


@task(retries=3, retry_delay_seconds=10)
def fetch_flights():
    """
    Sync task running pyopensky.
    """
    logger = get_run_logger()
    try:
        rest = REST()
        df = rest.states(own=False)
        logger.info(f"Fetched {len(df)} aircraft.")
        return df
    except Exception as e:
        logger.error(f"pyopensky failed: {e}")
        raise


@task
async def insert_batch(records):
    logger = get_run_logger()

    async with get_connection() as conn:
        first_ts = records[0][0]
        await conn.execute("SELECT create_partition_if_missing($1)", first_ts)

        query = """
            INSERT INTO flight_states 
            (time, icao24, callsign, origin_country, time_pos, lat, lon, 
             geo_altitude, baro_altitude, velocity, heading, vert_rate, 
             on_ground, squawk, spi, source, sensors, geom)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
                    ST_SetSRID(ST_MakePoint($18, $19), 4326))
            ON CONFLICT DO NOTHING
        """

        await conn.executemany(query, records)
        logger.info(f"Inserted {len(records)} records.")


@task
async def insert_activate_flight(records):
    logger = get_run_logger()
    async with get_connection() as conn:
        query = """
        INSERT INTO activate_flight 
            (time, icao24, callsign, origin_country, time_pos, lat, lon,
            geo_altitude, baro_altitude, velocity, heading, vert_rate,
            on_ground, squawk, spi, source, sensors, geom, path_geom)
        VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            ST_SetSRID(ST_MakePoint($18, $19), 4326), 
            ST_Multi(ST_SetSRID(ST_MakePoint($18, $19), 4326)))
        ON CONFLICT (icao24) 
        DO UPDATE SET
            path_geom = CASE
                -- State A: New Flight / Takeoff
                WHEN EXCLUDED.on_ground = FALSE AND activate_flight.on_ground = TRUE THEN
                    ST_Multi(EXCLUDED.geom)

                -- State B: Lost Position Update (e.g. due to signal loss)
                WHEN EXCLUDED.on_ground = FALSE AND (EXCLUDED.lat IS NULL OR EXCLUDED.lon IS NULL) THEN
                    activate_flight.path_geom

                -- State C: Normal flying
                ELSE
                    ST_Multi(ST_CollectionExtract(
                        ST_Collect(activate_flight.path_geom, EXCLUDED.geom), 1
                    ))
            END,

            time = EXCLUDED.time,
            time_pos = COALESCE(EXCLUDED.time_pos, activate_flight.time_pos),
            callsign = EXCLUDED.callsign,
            origin_country = EXCLUDED.origin_country,
            lat = COALESCE(EXCLUDED.lat, activate_flight.lat),
            lon = COALESCE(EXCLUDED.lon, activate_flight.lon),
            geom = COALESCE(EXCLUDED.geom, activate_flight.geom),
            geo_altitude = COALESCE(EXCLUDED.geo_altitude, activate_flight.geo_altitude),
            baro_altitude = COALESCE(EXCLUDED.baro_altitude, activate_flight.baro_altitude),
            velocity = EXCLUDED.velocity,
            heading = EXCLUDED.heading,
            squawk = EXCLUDED.squawk,
            spi = EXCLUDED.spi,
            source = EXCLUDED.source,
            sensors = EXCLUDED.sensors,
            vert_rate = EXCLUDED.vert_rate;
        """

        await conn.executemany(query, records)
        logger.info(f"Inserted {len(records)} records.")


@task
async def cleanup_db():
    logger = get_run_logger()

    retention_days = await Variable[int].aget("flight_data_retention_days", default=3)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    async with get_connection() as conn:
        res = await conn.execute("DELETE FROM flight_states WHERE time < $1", cutoff)
        logger.info(f"Cleaned old data: {res}")


@flow(name="Ingest Flight Data", log_prints=True)
async def ingest_flow():
    df = fetch_flights()
    records = clean_records(df)
    await insert_activate_flight(records)
    await insert_batch(records)


@flow(name="Daily Maintenance", log_prints=True)
async def maintenance_flow():
    await cleanup_db()
