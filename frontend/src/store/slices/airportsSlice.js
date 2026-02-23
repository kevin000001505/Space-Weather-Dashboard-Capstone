import { createSlice } from '@reduxjs/toolkit';
import { fetchAirports } from '../../api/api';

const airportsSlice = createSlice({
  name: 'airports',
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAirports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAirports.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAirports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default airportsSlice.reducer;