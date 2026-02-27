import os
import time
from datetime import datetime

import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("PGHOST", "localhost"),
    "port": int(os.getenv("PGPORT", "5432")),
    "dbname": os.getenv("PGDATABASE"),
    "user": os.getenv("PGUSER"),
    "password": os.getenv("PGPASSWORD"),
}

URLS = {
    "goes_xray": "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json",
    "solar_wind_plasma": "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
    "imf_mag": "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json",
    "goes_proton": "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-7-day.json",
    "kp_index": "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    "alerts": "https://services.swpc.noaa.gov/products/alerts.json",
}


def fetch_json(url):
    r = requests.get(url, timeout=30, headers={"User-Agent": "space-weather-capstone/1.0"})
    r.raise_for_status()
    return r.json(), len(r.content)


def _parse_product_list_of_lists(data):
    if isinstance(data, list) and data and isinstance(data[0], list):
        header = data[0]
        return [dict(zip(header, row)) for row in data[1:]]
    return data


def insert_goes_xray():
    data, size_bytes = fetch_json(URLS["goes_xray"])
    rows = [(
        d.get("electron_contaminaton"),
        d.get("electron_correction"),
        d.get("energy"),
        d.get("flux"),
        d.get("observed_flux"),
        d.get("satellite"),
        d.get("time_tag"),
    ) for d in data]

    sql = """
        INSERT INTO swpc.goes_xray_flux
        (electron_contaminaton, electron_correction, energy, flux, observed_flux, satellite, time_tag)
        VALUES %s
        ON CONFLICT (time_tag, satellite, energy) DO NOTHING;
    """

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=2000)

    return {"bytes": size_bytes, "attempted": len(rows)}


def insert_goes_proton():
    data, size_bytes = fetch_json(URLS["goes_proton"])
    rows = [(
        d.get("energy"),
        d.get("flux"),
        d.get("satellite"),
        d.get("time_tag"),
    ) for d in data]

    sql = """
        INSERT INTO swpc.goes_proton_flux (energy, flux, satellite, time_tag)
        VALUES %s
        ON CONFLICT (time_tag, satellite, energy) DO NOTHING;
    """

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=2000)

    return {"bytes": size_bytes, "attempted": len(rows)}


def insert_solar_wind_plasma():
    data, size_bytes = fetch_json(URLS["solar_wind_plasma"])
    recs = _parse_product_list_of_lists(data)

    rows = [(
        r.get("time_tag"),
        r.get("density"),
        r.get("speed"),
        r.get("temperature"),
    ) for r in recs]

    sql = """
        INSERT INTO swpc.solar_wind_plasma (time_tag, density, speed, temperature)
        VALUES %s
        ON CONFLICT (time_tag) DO NOTHING;
    """

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=2000)

    return {"bytes": size_bytes, "attempted": len(rows)}


def insert_imf_mag():
    data, size_bytes = fetch_json(URLS["imf_mag"])
    recs = _parse_product_list_of_lists(data)

    rows = [(
        r.get("time_tag"),
        r.get("bx_gsm"),
        r.get("by_gsm"),
        r.get("bz_gsm"),
        r.get("lon_gsm"),
        r.get("lat_gsm"),
        r.get("bt"),
    ) for r in recs]

    sql = """
        INSERT INTO swpc.imf_magnetic_field (time_tag, bx_gsm, by_gsm, bz_gsm, lon_gsm, lat_gsm, bt)
        VALUES %s
        ON CONFLICT (time_tag) DO NOTHING;
    """

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=2000)

    return {"bytes": size_bytes, "attempted": len(rows)}


def insert_kp_index():
    data, size_bytes = fetch_json(URLS["kp_index"])
    recs = _parse_product_list_of_lists(data)

    rows = [(
        r.get("time_tag"),
        r.get("Kp") if r.get("Kp") is not None else r.get("kp"),
        r.get("a_running"),
        r.get("station_count"),
    ) for r in recs]

    sql = """
        INSERT INTO swpc.kp_index (time_tag, kp, a_running, station_count)
        VALUES %s
        ON CONFLICT (time_tag) DO NOTHING;
    """

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=2000)

    return {"bytes": size_bytes, "attempted": len(rows)}


def insert_alerts():
    data, size_bytes = fetch_json(URLS["alerts"])
    rows = [(
        d.get("issue_datetime"),
        d.get("message"),
        d.get("product_id"),
    ) for d in data]

    sql = """
        INSERT INTO swpc.swpc_alerts (issue_datetime, message, product_id)
        VALUES %s
        ON CONFLICT (issue_datetime, product_id) DO NOTHING;
    """

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=2000)

    return {"bytes": size_bytes, "attempted": len(rows)}


def poll_all_forever(sleep_seconds=60):
    cycle = 0
    while True:
        cycle += 1
        try:
            r1 = insert_goes_xray()
            r2 = insert_goes_proton()
            r3 = insert_solar_wind_plasma()
            r4 = insert_imf_mag()
            r5 = insert_kp_index()
            r6 = insert_alerts()

            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(
            f"{ts} cycle={cycle} attempted_rows: "
            f"xray={r1['attempted']} proton={r2['attempted']} "
            f"plasma={r3['attempted']} imf={r4['attempted']} "
            f"kp={r5['attempted']} alerts={r6['attempted']}"
)
        except Exception as e:
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"{ts} cycle={cycle} ERROR: {e}")

        time.sleep(sleep_seconds)


if __name__ == "__main__":
    poll_all_forever(60)
