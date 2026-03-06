import { configureStore } from '@reduxjs/toolkit';
import planesReducer from './slices/planesSlice';
import drapReducer from './slices/drapSlice';
import airportsReducer from './slices/airportsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    planes: planesReducer,
    drap: drapReducer,
    airports: airportsReducer,
    ui: uiReducer,
  },
});
