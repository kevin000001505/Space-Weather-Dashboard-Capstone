import { createAsyncThunk } from "@reduxjs/toolkit";

export const fetchPlanes = createAsyncThunk(
  'planes/fetchPlanes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('git@github.com:GMU-DAEN-Program/202610-003-Team-Space-Weather.git');
      const data = await response.json();
      return data;  
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);