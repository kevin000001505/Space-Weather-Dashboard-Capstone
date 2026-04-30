import { createSlice } from '@reduxjs/toolkit';
import { fetchPlanes } from '../../api/api';

const planesSlice = createSlice({
  name: 'planes',
  initialState: {
    data: [],
    playback: [],
    timestamp: null,
    count: 0,
    loading: false,
    error: null,
  },
  reducers: {
    injectLivePlanes: (state, action) => {
      state.data = action.payload.flights; 
    },
    setPlaybackPlanes: (state, action) => {
      state.playback = action.payload;
    },
    clearPlaybackPlanes: (state) => {
      state.playback = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlanes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlanes.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.flights || [];
        state.timestamp = action.payload.timestamp;
        state.count = action.payload.count || 0;
      })
      .addCase(fetchPlanes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { injectLivePlanes, setPlaybackPlanes, clearPlaybackPlanes } = planesSlice.actions;
export default planesSlice.reducer;