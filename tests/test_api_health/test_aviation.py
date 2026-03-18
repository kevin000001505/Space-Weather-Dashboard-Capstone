import requests
import pytest
airports_base_url = "https://davidmegginson.github.io/ourairports-data/"

AVIATION_ENDPOINTS = {
    "airports_url": f"{airports_base_url}airports.csv",
    "countries_url": f"{airports_base_url}countries.csv",
    "regions_url": f"{airports_base_url}regions.csv",
    "runways_url": f"{airports_base_url}runways.csv",
    "navaids_url": f"{airports_base_url}navaids.csv",
    "freqs_url": f"{airports_base_url}airport-frequencies.csv",
    "comments_url": f"{airports_base_url}airport-comments.csv",
}

@pytest.mark.parametrize("name, url", AVIATION_ENDPOINTS.items())
def test_aviation_endpoint_returns_200(name, url):
    response = requests.get(url, timeout=10)
    assert response.status_code == 200, f"{name} is down"

@pytest.mark.parametrize("name, url", AVIATION_ENDPOINTS.items())
def test_aviation_endpoint_returns_csv_data(name, url):
    response = requests.get(url, timeout=10)

    lines = response.text.strip().splitlines()
    assert len(lines) > 1, f"{name} returned empty CSV"  # at least header + 1 row

@pytest.mark.parametrize("name, url", AVIATION_ENDPOINTS.items())
def test_aviation_endpoint_has_valid_header(name, url):
    response = requests.get(url, timeout=10)

    header = response.text.splitlines()[0]
    assert "," in header, f"{name} first line doesn't look like CSV"


from unittest.mock import patch
import pandas as pd

def test_opensky_returns_dataframe():
    """Verify pyopensky REST client returns a DataFrame"""
    mock_df = pd.DataFrame([{
        "icao24": "abc123",
        "timestamp": pd.Timestamp("2024-01-01 00:00:00"),
        "callsign": "AA100",
        "origin_country": "United States",
        "latitude": 38.85,
        "longitude": -77.03,
        "altitude": 10000.0,
        "geoaltitude": 10500.0,
        "groundspeed": 450.0,
        "track": 90.0,
        "vertical_rate": 0.0,
        "onground": False,
        "squawk": "1234",
        "spi": False,
        "position_source": 0,
        "last_position": pd.Timestamp("2024-01-01 00:00:00"),
    }])

    with patch("pyopensky.rest.REST.states", return_value=mock_df):
        from pyopensky.rest import REST
        rest = REST()
        df = rest.states(own=False)

    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0