import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  useImperial: true,
  showSettings: false,
  selectedPlane: null,
  selectedAirport: null,
  filter: 'all',
  darkMode: false,
  showAirports: true,
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
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
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
  },
});

export const {
  setUseImperial,
  setShowSettings,
  setSelectedPlane,
  setSelectedAirport,
  setFilter,
  setDarkMode,
  setShowAirports,
  setViewState,
  setSearchQuery,
  setSearchResults,
  setSearchOpen,
  clearSelections,
} = uiSlice.actions;

export default uiSlice.reducer;
