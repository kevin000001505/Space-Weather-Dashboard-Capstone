import { createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = '/api/v1';

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
      console.log(data);
      const validAirports = data.airports.filter(airport =>
        airport.lat &&
        airport.lon &&
        (airport.type === 'large_airport' || airport.type === 'medium_airport')
      );
      console.log(validAirports);
      return validAirports;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);