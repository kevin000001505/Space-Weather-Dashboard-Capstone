import { createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchPlanes = createAsyncThunk(
  'planes/fetchPlanes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/active-flight-states/latest`);
      if (!response.ok) {
        throw new Error('Failed to fetch flight data');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDRAP = createAsyncThunk(
  'drap/fetchDRAP',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/drap/latest`);
      if (!response.ok) {
        throw new Error('Failed to fetch DRAP data');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAirports = createAsyncThunk(
  'airports/fetchAirports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/airports/latest`);
      if (!response.ok) {
        throw new Error('Failed to fetch airport data');
      }
      const data = await response.json();
      return data.airports;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


export const fetchFlightPath = createAsyncThunk(
  'flightPath/fetchFlightPath',
  async (flightId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/flight-path/${flightId}`);
      if (!response.ok) throw new Error('Failed to fetch flight path');
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);