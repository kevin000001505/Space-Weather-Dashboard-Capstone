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
  showChartSettings: false,
  backgroundBandsOpacity: 0.25,
  labelBoxSize: 1,
  axisLabelSize: 14,
  borderWidth: 2,
  showDownloadPanel: false,
  showCustomDateDialog: false,
  customDialogStart: null,
  customDialogEnd: null,
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
    setShowChartSettings(state, action) {
      state.showChartSettings = action.payload;
    },
    setBackgroundBandsOpacity(state, action) {
      state.backgroundBandsOpacity = action.payload;
    },
    setLabelBoxSize(state, action) {
      state.labelBoxSize = action.payload;
    },
    setAxisLabelSize(state, action) {
      state.axisLabelSize = action.payload;
    },
    setShowDownloadPanel(state, action) {
      state.showDownloadPanel = action.payload;
    },
    setShowCustomDateDialog(state, action) {
      state.showCustomDateDialog = action.payload;
    },
    setCustomDialogStart(state, action) {
      state.customDialogStart = action.payload;
    },
    setCustomDialogEnd(state, action) {
      state.customDialogEnd = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setBorderWidth(state, action) {
      state.borderWidth = action.payload;
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

export const {
  setActiveTab,
  setSelectedTimezone,
  setCustomDateTime,
  setShowChartSettings,
  setBackgroundBandsOpacity,
  setLabelBoxSize,
  setAxisLabelSize,
  setBorderWidth,
  setShowDownloadPanel,
  setShowCustomDateDialog,
  setCustomDialogStart,
  setCustomDialogEnd,
  setLoading,
} = chartsSlice.actions;
export default chartsSlice.reducer;
