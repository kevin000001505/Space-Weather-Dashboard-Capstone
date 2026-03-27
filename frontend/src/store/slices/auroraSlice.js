import { createSlice } from '@reduxjs/toolkit';
import { fetchAurora } from '../../api/api'; 

const auroraSlice = createSlice({
  name: 'aurora',
  initialState: {
    data: null, // Will hold the { "Observation Time", "Forecast Time", "coordinates" } object
    loading: false,
    error: null,
  },
  reducers: {
    injectLiveAurora: (state, action) => {
      state.data = action.payload; 
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAurora.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAurora.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAurora.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { injectLiveAurora } = auroraSlice.actions;
export default auroraSlice.reducer;