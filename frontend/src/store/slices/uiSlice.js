import { createSlice } from "@reduxjs/toolkit";
import { fetchAirportDetails } from "../../api/api";

const initialState = {
  liveStreamMode: true,
  useImperial: true,
  showAltitudeLegend: true,
  showIconLegend: true,
  showSettings: false,
  selectedPlane: null,
  selectedFlightsPanels: [], // Array of flights for FlightDetailsPanel
  selectedAirportsPanels: [], // Array of airports for AirportDetailsPanel
  hoveredRunwayId: null,
  selectedAirport: null,
  planeFilter: "all",
  airportFilter: ["large_airport", "medium_airport"],
  darkMode: true,
  showPlanes: true,
  showAirports: true,
  showDRAP: true,
  showAurora: false,
  auroraRegionRange: [0, 100],
  showGeoelectric: false,
  geoelectricRegionRange: [0, 100],
  isAirportDropdownOpen: false,
  viewState: {
    longitude: 0,
    latitude: 30,
    zoom: 3,
    pitch: 0,
    bearing: 0,
  },
  searchQuery: "",
  searchResults: [],
  isSearchOpen: false,
  isZooming: false,
  settingsTabIndex: 0,
  altitudeRange: [0, 50000],
  airportAltitudeRange: [0, 10000],
  drapRegionRange: [0, 35], // Match AltitudeLegend drapStops
  isolateMode: false, // Isolate mode: only show selected planes and paths
  airportIconSize: 22,
  flightIconSize: 46,
};
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setLiveStreamMode: (state, action) => {
      state.liveStreamMode = action.payload;
    },
    toggleIsolateMode: (state, action) => {
      state.isolateMode = action.payload;
    },
    setUseImperial: (state, action) => {
      state.useImperial = action.payload;
    },
    setShowAltitudeLegend: (state, action) => {
      state.showAltitudeLegend = action.payload;
    },
    setShowIconLegend: (state, action) => {
      state.showIconLegend = action.payload;
    },
    setShowSettings: (state, action) => {
      state.showSettings = action.payload;
    },
    setSelectedPlane: (state, action) => {
      state.selectedPlane = action.payload;
    },
    addFlightPanel: (state, action) => {
      // Toggle: remove if present, add if not
      const exists = state.selectedFlightsPanels.some(
        (f) => f.icao24 === action.payload.icao24,
      );
      if (exists) {
        state.selectedFlightsPanels = state.selectedFlightsPanels.filter(
          (f) => f.icao24 !== action.payload.icao24,
        );
      } else {
        state.selectedFlightsPanels.push(action.payload);
      }
    },
    removeFlightPanel: (state, action) => {
      // Remove flight panel by ICAO24
      state.selectedFlightsPanels = state.selectedFlightsPanels.filter(
        (f) => f.icao24 !== action.payload,
      );
    },
    addAirportPanel: (state, action) => {
      // Prevent duplicates if the user clicks the same airport twice
      const exists = state.selectedAirportsPanels.find(
        (a) => a.ident === action.payload.ident,
      );
      if (!exists) {
        state.selectedAirportsPanels.push(action.payload);
      }
    },
    removeAirportPanel: (state, action) => {
      // action.payload is the airport 'ident' string (e.g., "KJFK")
      state.selectedAirportsPanels = state.selectedAirportsPanels.filter(
        (a) => a.ident !== action.payload,
      );
    },
    setHoveredRunwayId: (state, action) => {
      state.hoveredRunwayId = action.payload;
    },
    clearFlightPanels: (state) => {
      state.selectedFlightsPanels = [];
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
    setShowAurora: (state, action) => {
      state.showAurora = action.payload;
    },
    setAuroraRegionRange: (state, action) => {
      state.auroraRegionRange = action.payload;
    },
    setIsAirportDropdownOpen: (state, action) => {
      state.isAirportDropdownOpen = action.payload;
    },
    setSettingsTabIndex: (state, action) => {
      state.settingsTabIndex = action.payload;
    },
    setAltitudeRange: (state, action) => {
      state.altitudeRange = action.payload;
    },
    setAirportAltitudeRange: (state, action) => {
      state.airportAltitudeRange = action.payload;
    },
    setDrapRegionRange: (state, action) => {
      state.drapRegionRange = action.payload;
    },
    setShowDate: (state, action) => {
      state.showDate = action.payload;
    },
    setAirportIconSize: (state, action) => {
      state.airportIconSize = action.payload;
    },
    setFlightIconSize: (state, action) => {
      state.flightIconSize = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchAirportDetails.fulfilled, (state, action) => {
      // Find the specific panel in the array
      const airportIndex = state.selectedAirportsPanels.findIndex(
        (a) => a.ident === action.payload.ident,
      );

      // If the panel is still open, seamlessly merge the new rich data
      // into the existing basic airport object
      if (airportIndex !== -1) {
        state.selectedAirportsPanels[airportIndex] = {
          ...state.selectedAirportsPanels[airportIndex],
          ...action.payload,
        };
      }
    });
  },
});

export const {
  setLiveStreamMode,
  setUseImperial,
  setShowAltitudeLegend,
  setShowIconLegend,
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
  setShowAurora,
  setAuroraRegionRange,
  setIsAirportDropdownOpen,
  setSettingsTabIndex,
  setAltitudeRange,
  setAirportAltitudeRange,
  setDrapRegionRange,
  addFlightPanel,
  removeFlightPanel,
  addAirportPanel,
  removeAirportPanel,
  setHoveredRunwayId,
  clearFlightPanels,
  toggleIsolateMode,
  setAirportIconSize,
  setFlightIconSize,
} = uiSlice.actions;

export default uiSlice.reducer;
