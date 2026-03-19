import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { toIso, getTimeRange } from "./helper";
import { setLoading } from "../store/slices/chartsSlice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchPlanes = createAsyncThunk(
  "planes/fetchPlanes",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/active-flight-states/latest`,
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

export const fetchDRAP = createAsyncThunk(
  "drap/fetchDRAP",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/drap/latest`);
      if (!response.ok) {
        throw new Error("Failed to fetch DRAP data");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAurora = createAsyncThunk(
  "aurora/fetchAurora",
  async (utc_time = null, { rejectWithValue }) => {
    try {
      const url = utc_time
        ? `${API_BASE_URL}/aurora?utc_time=${utc_time}`
        : `${API_BASE_URL}/aurora`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch Aurora data");
      }
      const data = await response.json();
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
      const response = await fetch(`${API_BASE_URL}/airports`);
      if (!response.ok) {
        throw new Error("Failed to fetch airport data");
      }
      const data = await response.json();
      return data.airports;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchFlightPath = createAsyncThunk(
  "flightPath/fetchFlightPath",
  async (flightId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/flight-path/${flightId}`);
      if (!response.ok) throw new Error("Failed to fetch flight path");
      const data = await response.json();
      if (data && data.path_geojson.coordinates.length <= 1) {
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
      const url = `${API_BASE_URL}/kp-index?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch Kp index");
      const data = await response.json();
      return data.indices;
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
      const url = `${API_BASE_URL}/xray?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch X-ray flux");
      const data = await response.json();
      return data.xray_fluxes;
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
      const url = `${API_BASE_URL}/proton-flux?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch proton flux");
      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);
