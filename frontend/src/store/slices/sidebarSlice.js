import { createSlice } from '@reduxjs/toolkit';
import { fetchNoAAScales } from '../../api/api';


const initialState = {
  noaaScales: null,
  loading: false,
  error: null,
  isSidebarOpen: false,
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    toggleSidebar: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNoAAScales.fulfilled, (state, action) => {
        state.noaaScales = action.payload;
        state.loading = false;
        state.error = null;
      })
  },
});

export const { toggleSidebar } = sidebarSlice.actions;
export default sidebarSlice.reducer;
