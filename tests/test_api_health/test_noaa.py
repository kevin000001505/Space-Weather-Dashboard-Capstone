import requests
import pytest

NOAA_ENDPOINTS = {
    "kp_index":   "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    "drap":       "https://services.swpc.noaa.gov/text/drap_global_frequencies.txt",
    "proton_flux":"https://services.swpc.noaa.gov/json/goes/primary/integral-protons-plot-6-hour.json",
    "aurora":     "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
    "xray_6hour": "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json",
    "alert": "https://services.swpc.noaa.gov/products/alerts.json",
}

@pytest.mark.parametrize("name, url", NOAA_ENDPOINTS.items())
def test_noaa_endpoint_returns_200(name, url):
    response = requests.get(url, timeout=10)
    assert response.status_code == 200, f"{name} API is down"

@pytest.mark.parametrize("name, url", NOAA_ENDPOINTS.items())
def test_noaa_endpoint_returns_data(name, url):
    response = requests.get(url, timeout=10)
    try:
        if name == "drap":
            data = response.text
            assert len(data) > 300, f"{name} return less data than it suppose to be"
        else:
            data = response.json()
            assert len(data) > 0, f"{name} API returned empty data"
    except requests.exceptions.JSONDecodeError:
        print("{url} have JSONDecodeError")

    