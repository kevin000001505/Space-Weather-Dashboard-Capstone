import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { toIso, getTimeRange } from "./helper";
import { setLoading } from "../store/slices/chartsSlice";
import { decodeDeltaBitpack, mergeCoordinatesAndValues } from "../utils/compression";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_V1_URL = API_BASE_URL.replace("/v2", "/v1");

// Module-level cache for grid coordinates (fetched once, reused forever)
let _locationsCache = null;
let _locationsFetching = null;

export async function getLocations() {
  if (_locationsCache) return _locationsCache;
  if (_locationsFetching) return _locationsFetching;
  _locationsFetching = fetch(`${API_BASE_URL}/location`)
    .then((r) => r.json())
    .then((data) => {
      _locationsCache = data;
      _locationsFetching = null;
      return data;
    });
  return _locationsFetching;
}

export const fetchPlanes = createAsyncThunk(
  "planes/fetchPlanes",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_V1_URL}/active-flight-states/latest`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch flight data");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchLocations = createAsyncThunk(
  "locations/fetchLocations",
  async (_, { rejectWithValue }) => {
    try {
      return await getLocations();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchDRAP = createAsyncThunk(
  "drap/fetchDRAP",
  async (_, { rejectWithValue }) => {
    try {
      const [response, locations] = await Promise.all([
        fetch(`${API_BASE_URL}/drap/latest?encoding=delta-bitpack`),
        getLocations(),
      ]);
      if (!response.ok) {
        throw new Error("Failed to fetch DRAP data");
      }
      const data = await response.json();
      if (data.encoding === "delta-bitpack") {
        const values = decodeDeltaBitpack(data.points);
        const points = mergeCoordinatesAndValues(locations.drap, values);
        return { timestamp: data.timestamp, points };
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);
export const fetchHistoricalData = createAsyncThunk(
  "historicalData/fetchHistoricalData",
  async (time_range, { rejectWithValue }) => {
    try {
      const { start, end, event, interval } = time_range;
      const [response, locations] = await Promise.all([
        fetch(`${API_BASE_URL}/kermit?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&event=${event}&interval=${interval}`),
        getLocations(),
      ]);
      if (!response.ok) {
        throw new Error("Failed to fetch historical data");
      }
      const snapshots = await response.json();
      const coords = locations[event];
      return snapshots.map((snap) => ({
        ...snap,
        points: mergeCoordinatesAndValues(coords, snap.points),
      }));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAurora = createAsyncThunk(
  "aurora/fetchAurora",
  async (utc_time = null, { rejectWithValue }) => {
    try {
      const [response, locations] = await Promise.all([
        fetch(`${API_BASE_URL}/aurora/latest?encoding=delta-bitpack`),
        getLocations(),
      ]);

      if (!response.ok) {
        throw new Error("Failed to fetch Aurora data");
      }
      const data = await response.json();
      if (data.encoding === "delta-bitpack") {
        const values = decodeDeltaBitpack(data.points);
        const points = mergeCoordinatesAndValues(locations.aurora, values);
        return { timestamp: data.timestamp, points };
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchGeoelectric = createAsyncThunk(
  "geoelectric/fetchGeoelectric",
  async (utc_time = null, { rejectWithValue }) => {
    try {
      const [response, locations] = await Promise.all([
        fetch(`${API_BASE_URL}/geoelectric/latest?encoding=delta-bitpack`),
        getLocations(),
      ]);

      if (!response.ok) {
        throw new Error("Failed to fetch Geoelectric data");
      }
      const data = await response.json();
      if (data.encoding === "delta-bitpack") {
        const values = decodeDeltaBitpack(data.points);
        const points = mergeCoordinatesAndValues(locations.geoelectric, values);
        return { timestamp: data.timestamp, points };
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAirports = createAsyncThunk(
  "airports/fetchAirports",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_V1_URL}/airports`);
      if (!response.ok) {
        throw new Error("Failed to fetch airport data");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAirportDetails = createAsyncThunk(
  "airports/fetchAirportDetails",
  async (airportIdent, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_V1_URL}/airport/${airportIdent}`);
      if (!response.ok) throw new Error("Failed to fetch airport details");
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchFlightPath = createAsyncThunk(
  "flightPath/fetchFlightPath",
  async (flightId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_V1_URL}/flight-path/${flightId}`);
      if (!response.ok) throw new Error("Failed to fetch flight path");
      const data = await response.json();
      if (data && data.path_points.length <= 1) {
        toast.error(
          `No flight path exists for ${data?.callsign?.toUpperCase() ?? flightId.toUpperCase()}`,
          {
            style: {
              borderRadius: "10px",
              background: "#fc3636",
              color: "#fff",
            },
          },
        );
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchKpIndex = createAsyncThunk(
  "charts/fetchKpIndex",
  async ({ start, end, hours = 144, polling = false } = {}, { dispatch, rejectWithValue }) => {
    try {
      let s = start,
        e = end;
      if (!s || !e) {
        [s, e] = getTimeRange(hours);
      }
      if (!polling) {
        dispatch(setLoading(true));
      }
      const url = `${API_V1_URL}/kp-index?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch Kp index");
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchXrayFlux = createAsyncThunk(
  "charts/fetchXrayFlux",
  async (
    { start, end, hours = 24, polling = false } = {},
    { dispatch, rejectWithValue },
  ) => {
    try {
      let s = start,
        e = end;
      if (!s || !e) {
        [s, e] = getTimeRange(hours);
      }
      if (!polling) {
        dispatch(setLoading(true));
      }
      const url = `${API_V1_URL}/xray?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch X-ray flux");
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchProtonFlux = createAsyncThunk(
  "charts/fetchProtonFlux",
  async ({ start, end, hours = 24, polling = false } = {}, { dispatch, rejectWithValue }) => {
    try {
      let s = start,
        e = end;
      if (!s || !e) {
        [s, e] = getTimeRange(hours);
      }
      if (!polling) {
        dispatch(setLoading(true));
      }
      const url = `${API_V1_URL}/proton-flux?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch proton flux");
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchNoAAScales = createAsyncThunk(
  "noaa/fetchNoAAScales",
  async (airportIdent, { rejectWithValue }) => {
    try {
      const response = await fetch(`https://services.swpc.noaa.gov/products/noaa-scales.json`);
      if (!response.ok) throw new Error("Failed to fetch NOOA scales");
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const ALERT_DAY_TIERS = [1, 7, 14, 30];
const MIN_INITIAL_ALERTS = 5;

async function fetchAlertsForDays(days) {
  const response = await fetch(`${API_V1_URL}/alert?days=${days}`);
  if (!response.ok) throw new Error(`Failed to fetch alerts (days=${days})`);
  return await response.json();
}

export const fetchInitialAlerts = createAsyncThunk(
  "alerts/fetchInitial",
  async (_, { rejectWithValue }) => {
    try {
      let alerts = [];
      let chosenDays = ALERT_DAY_TIERS[ALERT_DAY_TIERS.length - 1];
      for (const days of ALERT_DAY_TIERS) {
        alerts = await fetchAlertsForDays(days);
        chosenDays = days;
        if (alerts.length >= MIN_INITIAL_ALERTS) break;
      }
      return { alerts, days: chosenDays };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchMoreAlerts = createAsyncThunk(
  "alerts/fetchMore",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { currentDays } = getState().alerts;
      const nextTier = ALERT_DAY_TIERS.find((d) => d > currentDays);
      if (!nextTier) {
        return { alerts: [], days: currentDays };
      }
      const alerts = await fetchAlertsForDays(nextTier);
      return { alerts, days: nextTier };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchElectricTransmissionLines = createAsyncThunk(
  "transmissionLines/fetchElectricTransmissionLines",
  async (utc_time = null, { rejectWithValue }) => {
    try {
      // Fetch from dummy_data/power_grid.json for development/testing
      const response = await fetch('/power_grid.json');
      if (!response.ok) {
        throw new Error("Failed to fetch Electric Transmission Lines data");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchPlaybackFlightPath = createAsyncThunk(
  "playbackFlightPaths/fetchPlaybackFlightPath",
  async ({ identifier, type, start, end, interval }, { rejectWithValue }) => {
    try {
      const apiValue = (identifier || "").toLowerCase();
      const param = type === "icao24"
        ? `icao24=${encodeURIComponent(apiValue)}`
        : `callsign=${encodeURIComponent(apiValue)}`;
      const url = `${API_BASE_URL}/kermit/flight-path?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&interval=${interval}&${param}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch flight path for ${identifier}`);
      }
      const data = await response.json();
      return { identifier, type, data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);