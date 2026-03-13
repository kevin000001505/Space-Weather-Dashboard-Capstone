import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  kpIndex: [],
  xrayFlux: [],
  protonFlux: [],
  loading: false,
  error: null,
  activeTab: 0,
  showDate: false,
  showProtonWarningThreshold: false,
  selectedTimezone: 'local',
};

const chartsSlice = createSlice({
  name: "charts",
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    },
    setShowDate(state, action) {
      state.showDate = action.payload;
    },
    setShowProtonWarningThreshold(state, action) {
      state.showProtonWarningThreshold = action.payload;
    },
    setSelectedTimezone(state, action) {
      state.selectedTimezone = action.payload;
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
      })
  },
});

export const { setActiveTab, setShowDate, setShowProtonWarningThreshold, setSelectedTimezone } = chartsSlice.actions;
export default chartsSlice.reducer;
