import { createSlice } from "@reduxjs/toolkit";
import {
  fetchElectricTransmissionLines,
} from "../../api/api";

const electricTransmissionLinesSlice = createSlice({
  name: "electricTransmissionLines",
  initialState: {
    data: [],
    showElectricTransmissionLines: false,
    electricTransmissionLinesVoltageRange: [200, 1000],
    showOnlyInServiceLines: false,
    dontShowInferredLines: false,
    showACLines: true,
    showDCLines: true,
    showOverheadLines: true,
    showUndergroundLines: true,
    loading: false,
    error: null,
  },
  reducers: {
    setShowElectricTransmissionLines: (state, action) => {
      state.showElectricTransmissionLines = action.payload;
    },
    setElectricTransmissionLinesVoltageRange: (state, action) => {
      state.electricTransmissionLinesVoltageRange = action.payload;
    },
    setShowOnlyInServiceLines: (state, action) => {
      state.showOnlyInServiceLines = action.payload;
    },
    setDontShowInferredLines: (state, action) => {
      state.dontShowInferredLines = action.payload;
    },
    setShowACLines: (state, action) => {
      state.showACLines = action.payload;
    },
    setShowDCLines: (state, action) => {
      state.showDCLines = action.payload;
    },
    setShowOverheadLines: (state, action) => {
      state.showOverheadLines = action.payload;
    },
    setShowUndergroundLines: (state, action) => {
      state.showUndergroundLines = action.payload;
    },

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchElectricTransmissionLines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchElectricTransmissionLines.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload || [];
      })
      .addCase(fetchElectricTransmissionLines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setShowElectricTransmissionLines,
  setElectricTransmissionLinesVoltageRange,
  setShowOnlyInServiceLines,
  setDontShowInferredLines,
  setShowACLines,
  setShowDCLines,
  setShowOverheadLines,
  setShowUndergroundLines,
} = electricTransmissionLinesSlice.actions;
export default electricTransmissionLinesSlice.reducer;
