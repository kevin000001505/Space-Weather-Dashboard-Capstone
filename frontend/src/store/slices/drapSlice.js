import { createSlice } from "@reduxjs/toolkit";
import { fetchDRAP } from "../../api/api";

const drapSlice = createSlice({
  name: "drap",
  initialState: {
    showDRAP: true,
    drapRegionRange: [0, 35],
    points: [],
    playback: [],
    timestamp: null,
    count: 0,
    loading: false,
    error: null,
  },
  reducers: {
    injectLiveDRAP: (state, action) => {
      state.points = action.payload.points || [];
    },
    setDRAPPoints: (state, action) => {
      state.points = action.payload;
    },
    setDRAPPlayback: (state, action) => {
      state.playback = action.payload;
    },
    setShowDRAP: (state, action) => {
      state.showDRAP = action.payload;
    },
    setDrapRegionRange: (state, action) => {
      state.drapRegionRange = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDRAP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDRAP.fulfilled, (state, action) => {
        state.loading = false;
        state.points = action.payload.points || [];
        state.timestamp = action.payload.timestamp;
        state.count = action.payload.count || 0;
      })
      .addCase(fetchDRAP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setDRAPPoints,
  injectLiveDRAP,
  setDRAPPlayback,
  setShowDRAP,
  setDrapRegionRange,
} = drapSlice.actions;
export default drapSlice.reducer;
