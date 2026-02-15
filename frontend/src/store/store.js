import { configureStore } from '@reduxjs/toolkit';
import planesReducer from './slices/planesSlice';

export const store = configureStore({
  reducer: {
    planes: planesReducer,
  },
});