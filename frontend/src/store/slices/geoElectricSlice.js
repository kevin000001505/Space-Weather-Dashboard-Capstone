import { createSlice } from "@reduxjs/toolkit";
import { fetchGeoelectric } from "../../api/api";

const geoElectricSlice = createSlice({
  name: "geoelectric",
  initialState: {
    data: [],
    playback: [],
    loading: false,
    error: null,
    showGeoElectric: false,
    geoElectricLogRange: [-1, 4],
  },
  reducers: {
    injectLiveGeoElectric: (state, action) => {
      state.data = action.payload;
    },
    setShowGeoElectric: (state, action) => {
      state.showGeoElectric = action.payload;
    },
    setGeoElectricLogRange: (state, action) => {
      state.geoElectricLogRange = action.payload;
    },
    setGeoElectricPlayback: (state, action) => {
      state.playback = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeoelectric.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGeoelectric.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchGeoelectric.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  injectLiveGeoElectric,
  setShowGeoElectric,
  setGeoElectricLogRange,
  setGeoElectricPlayback,
} = geoElectricSlice.actions;
export default geoElectricSlice.reducer;
