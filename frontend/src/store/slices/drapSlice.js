import { createSlice } from '@reduxjs/toolkit';
import { fetchDRAP } from '../../api/api';

const drapSlice = createSlice({
  name: 'drap',
  initialState: {
    points: [],
    timestamp: null,
    count: 0,
    loading: false,
    error: null,
  },
  reducers: {
    injectLiveDRAP: (state, action) => {
      state.data = action.payload.drap; 
    }
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
  }
});

export const { injectLiveDRAP } = drapSlice.actions;
export default drapSlice.reducer;