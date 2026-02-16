import { createSlice } from '@reduxjs/toolkit';
import planesData from '../../planesData.json';
import initialState from '../initialState';
import { fetchPlanes } from '../../api/api';

const planesSlice = createSlice({
  name: 'planes',
  initialState,
  reducers: {
    addPlanes: (state, action) => {
      state.data.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchPlanes.fulfilled, (state) => {
        state.loading = true;
    })
  }
});

export const { addPlanes } = planesSlice.actions;

export default planesSlice.reducer;