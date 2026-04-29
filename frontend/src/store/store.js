import { configureStore } from '@reduxjs/toolkit';
import planesReducer from './slices/planesSlice';
import drapReducer from './slices/drapSlice';
import airportsReducer from './slices/airportsSlice';
import uiReducer from './slices/uiSlice';
import flightPathReducer from './slices/flightPathSlice';
import chartsReducer from './slices/chartsSlice';
import auroraReducer from './slices/auroraSlice';
import geoElectricReducer from './slices/geoElectricSlice';
import sidebarReducer from './slices/sidebarSlice';
import helpReducer from './slices/helpSlice';
import playbackReducer from './slices/playbackSlice';
import electricTransmissionLinesReducer from './slices/electricTransmissionLinesSlice';
import locationsReducer from './slices/locationSlice';
import alertsReducer from './slices/alertsSlice';

export const store = configureStore({
  reducer: {
    planes: planesReducer,
    drap: drapReducer,
    airports: airportsReducer,
    ui: uiReducer,
    flightPath: flightPathReducer,
    charts: chartsReducer,
    aurora: auroraReducer,
    sidebar: sidebarReducer,
    geoelectric: geoElectricReducer,
    help: helpReducer,
    playback: playbackReducer,
    electricTransmissionLines : electricTransmissionLinesReducer,
    locations: locationsReducer,
    alerts: alertsReducer,
  },
});
