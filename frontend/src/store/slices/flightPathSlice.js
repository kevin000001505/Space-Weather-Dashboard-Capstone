import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchFlightPath } from '../../api/api';

const flightPathSlice = createSlice({
  name: 'flightPath',
  initialState: {
    paths: {}, // { [icao24]: pathData }
    loading: {}, // { [icao24]: boolean }
    error: {}, // { [icao24]: error }
  },
  reducers: {
    removeFlightPath: (state, action) => {
      const icao24 = action.payload;
      delete state.paths[icao24];
      delete state.loading[icao24];
      delete state.error[icao24];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFlightPath.pending, (state, action) => {
        const icao24 = action.meta.arg;
        state.loading[icao24] = true;
        state.error[icao24] = null;
      })
      .addCase(fetchFlightPath.fulfilled, (state, action) => {
        const icao24 = action.meta.arg;
        state.loading[icao24] = false;
        state.paths[icao24] = action.payload;
      })
      .addCase(fetchFlightPath.rejected, (state, action) => {
        const icao24 = action.meta.arg;
        state.loading[icao24] = false;
        state.error[icao24] = action.payload;
      });
  }
});

export default flightPathSlice.reducer;
