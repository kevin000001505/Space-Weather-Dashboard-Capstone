import { createSlice } from "@reduxjs/toolkit";
import { fetchLocations } from "../../api/api";

const locationSlice = createSlice({
  name: "locations",
  initialState: {
    aurora: null,
    drap: null,
    geoelectric: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.aurora = action.payload.aurora;
        state.drap = action.payload.drap;
        state.geoelectric = action.payload.geoelectric;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default locationSlice.reducer;
