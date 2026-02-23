import { createAsyncThunk } from "@reduxjs/toolkit";
import Papa from 'papaparse';

const API_BASE_URL = '/api/v1';

export const fetchPlanes = createAsyncThunk(
  'planes/fetchPlanes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/flight-states/latest`);
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
      const response = await fetch('/airports.csv');
      if (!response.ok) {
        throw new Error('Failed to fetch CSV');
      }
      
      const csvText = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const validAirports = results.data.filter(airport => 
              airport.latitude_deg && 
              airport.longitude_deg && 
              (airport.type === 'large_airport' || airport.type === 'medium_airport')
            );
            resolve(validAirports);
          },
          error: (err) => {
            reject(err);
          }
        });
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);