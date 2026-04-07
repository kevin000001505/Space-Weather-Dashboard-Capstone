"""Mock data factory functions shared across API response tests."""

import json
from datetime import datetime, timezone


def make_airport_row(**overrides):
    base = {
        "ident": "KDCA",
        "name": "Ronald Reagan Washington National Airport",
        "iata_code": "DCA",
        "gps_code": "KDCA",
        "type": "large_airport",
        "municipality": "Washington",
        "country": "US",
        "elevation_ft": 15,
        "lat": 38.8521,
        "lon": -77.0377,
    }
    base.update(overrides)
    return base


def make_airport_detail_row(**overrides):
    base = {
        "id": 1,
        "ident": "KDCA",
        "type": "large_airport",
        "name": "Ronald Reagan Washington National Airport",
        "elevation_ft": 15.0,
        "continent": "NA",
        "iso_country": "US",
        "iso_region": "US-DC",
        "municipality": "Washington",
        "scheduled_service": True,
        "icao_code": "KDCA",
        "iata_code": "DCA",
        "gps_code": "KDCA",
        "local_code": "DCA",
        "home_link": None,
        "wikipedia_link": None,
        "keywords": None,
        "geom": json.dumps({"type": "Point", "coordinates": [-77.0377, 38.8521]}),
        "country_name": "United States",
        "region_name": "District of Columbia",
        "runways": json.dumps([]),
        "frequencies": json.dumps([]),
        "navaids": json.dumps([]),
    }
    base.update(overrides)
    return base


def make_flight_state_row(**overrides):
    base = {
        "icao24": "a1b2c3",
        "callsign": "AAL123",
        "lat": 38.85,
        "lon": -77.04,
        "geo_altitude": 10000.0,
        "velocity": 250.0,
        "heading": 180.0,
        "on_ground": False,
    }
    base.update(overrides)
    return base


def make_kp_row(**overrides):
    base = {
        "time_tag": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "kp": 3.0,
        "a_running": 10,
        "station_count": 12,
    }
    base.update(overrides)
    return base


def make_xray_row(**overrides):
    base = {
        "time_tag": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "satellite": 16,
        "flux": 1.5e-8,
        "observed_flux": 1.4e-8,
        "electron_correction": 0.0,
        "electron_contamination": False,
        "energy": "0.1-0.8nm",
    }
    base.update(overrides)
    return base


def make_proton_flux_row(**overrides):
    base = {
        "time_tag": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "satellite": 16,
        "flux_10_mev": 0.5,
        "flux_50_mev": 0.1,
        "flux_100_mev": 0.05,
        "flux_500_mev": 0.001,
    }
    base.update(overrides)
    return base


def make_alert_row(**overrides):
    base = {
        "time": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "message": "ALERT: Geomagnetic Storm Watch",
    }
    base.update(overrides)
    return base
