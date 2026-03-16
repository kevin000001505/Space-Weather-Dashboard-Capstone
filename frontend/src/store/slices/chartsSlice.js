import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  kpIndex: [],
  xrayFlux: [],
  protonFlux: [],
  loading: false,
  error: null,
  activeTab: 0,
  selectedTimezone: "local",
  customdt: { start: "", end: "", range: "3days" }, // range: 1week, 3days, 24hours, 6hours, custom
};

const chartsSlice = createSlice({
  name: "charts",
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    },
    setSelectedTimezone(state, action) {
      state.selectedTimezone = action.payload;
    },
    setCustomDateTime(state, action) {
      state.customdt = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("charts/fetchKpIndex/fulfilled", (state, action) => {
        state.kpIndex = action.payload;
        state.loading = false;
      })
      .addCase("charts/fetchXrayFlux/fulfilled", (state, action) => {
        state.xrayFlux = action.payload;
        state.loading = false;
      })
      .addCase("charts/fetchProtonFlux/fulfilled", (state, action) => {
        state.protonFlux = action.payload;
        state.loading = false;
      });
  },
});

export const { setActiveTab, setSelectedTimezone, setCustomDateTime } =
  chartsSlice.actions;
export default chartsSlice.reducer;
