import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  useImperial: true,
  showSettings: false,
  selectedPlane: null,
  selectedAirport: null,
  planeFilter: 'all',
  airportFilter: ['large_airport', 'medium_airport'],
  darkMode: false,
  showPlanes: true,
  showAirports: true,
  showDRAP: true,
  drapImplementation: 'filled-cells', // 'heatmap', 'bitmap', 'filled-cells', 'contour-lines'
  isAirportDropdownOpen: false,
  viewState: {
    longitude: 0,
    latitude: 30,
    zoom: 3,
    pitch: 0,
    bearing: 0,
  },
  searchQuery: '',
  searchResults: [],
  isSearchOpen: false,
  isZooming: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setUseImperial: (state, action) => {
      state.useImperial = action.payload;
    },
    setShowSettings: (state, action) => {
      state.showSettings = action.payload;
    },
    setSelectedPlane: (state, action) => {
      state.selectedPlane = action.payload;
    },
    setSelectedAirport: (state, action) => {
      state.selectedAirport = action.payload;
    },
    setPlaneFilter: (state, action) => {
      state.planeFilter = action.payload;
    },
    setAirportFilter: (state, action) => {
      state.airportFilter = action.payload;
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
    },
    setShowPlanes: (state, action) => {
      state.showPlanes = action.payload;
    },
    setShowAirports: (state, action) => {
      state.showAirports = action.payload;
    },
    setViewState: (state, action) => {
      state.viewState = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    setSearchOpen: (state, action) => {
      state.isSearchOpen = action.payload;
    },
    clearSelections: (state) => {
      state.selectedPlane = null;
      state.selectedAirport = null;
    },
    setIsZooming: (state, action) => {
      state.isZooming = action.payload;
    },
    setShowDRAP: (state, action) => {
      state.showDRAP = action.payload;
    },
    setDrapImplementation: (state, action) => {
      state.drapImplementation = action.payload;
    },
    setIsAirportDropdownOpen: (state, action) => {
      state.isAirportDropdownOpen = action.payload;
    },
  },
});

export const {
  setUseImperial,
  setShowSettings,
  setSelectedPlane,
  setSelectedAirport,
  setPlaneFilter,
  setAirportFilter,
  setDarkMode,
  setShowAirports,
  setShowPlanes,
  setViewState,
  setSearchQuery,
  setSearchResults,
  setSearchOpen,
  clearSelections,
  setIsZooming,
  setShowDRAP,
  setDrapImplementation,
  setIsAirportDropdownOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
