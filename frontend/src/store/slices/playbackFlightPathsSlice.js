import { createSlice } from '@reduxjs/toolkit';

const ICAO24_REGEX = /^[0-9A-F]{6}$/;

const normalizeEntry = ({ identifier, type }) => {
  const normalized = (identifier || '').trim().toUpperCase();
  if (!normalized) return null;
  return {
    identifier: normalized,
    type: type || (ICAO24_REGEX.test(normalized) ? 'icao24' : 'callsign'),
  };
};

const playbackFlightPathsSlice = createSlice({
  name: 'playbackFlightPaths',
  initialState: {
    trackedPlanes: [], // [{ identifier: string, type: 'icao24' | 'callsign' }]
    flightData: {}, // { [identifier]: { points: [...], times: [...], requested_times: [...] } }
    fetching: false,
    currentPlaybackTime: null,
  },
  reducers: {
    addTrackedPlane: (state, action) => {
      const entry = normalizeEntry(action.payload);
      if (!entry) return;
      const exists = state.trackedPlanes.some(
        (p) => p.identifier === entry.identifier,
      );
      if (exists || state.trackedPlanes.length >= 30) return;
      state.trackedPlanes.push(entry);
    },
    removeTrackedPlane: (state, action) => {
      const identifier = action.payload;
      state.trackedPlanes = state.trackedPlanes.filter(
        (p) => p.identifier !== identifier,
      );
      delete state.flightData[identifier];
    },
    setTrackedPlanes: (state, action) => {
      const seen = new Set();
      const next = [];
      for (const raw of action.payload || []) {
        const entry = normalizeEntry(raw);
        if (!entry) continue;
        if (seen.has(entry.identifier)) continue;
        seen.add(entry.identifier);
        next.push(entry);
        if (next.length >= 30) break;
      }
      state.trackedPlanes = next;
      // Drop cached data for planes no longer tracked
      Object.keys(state.flightData).forEach((id) => {
        if (!seen.has(id)) delete state.flightData[id];
      });
    },
    setFlightData: (state, action) => {
      const { identifier, data } = action.payload;
      state.flightData[identifier] = data;
    },
    clearFlightData: (state) => {
      state.flightData = {};
      state.fetching = false;
    },
    setFetching: (state, action) => {
      state.fetching = action.payload;
    },
    setCurrentPlaybackTime: (state, action) => {
      state.currentPlaybackTime = action.payload;
    },
  },
});

export const {
  addTrackedPlane,
  removeTrackedPlane,
  setTrackedPlanes,
  setFlightData,
  clearFlightData,
  setFetching,
  setCurrentPlaybackTime,
} = playbackFlightPathsSlice.actions;

export default playbackFlightPathsSlice.reducer;
