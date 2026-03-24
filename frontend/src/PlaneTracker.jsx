//Base imports
import { use, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

// MapLibre imports
import { MapboxOverlay } from "@deck.gl/mapbox";
import Map, { Layer, Popup, Source, useControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// API imports
import { fetchPlanes, fetchDRAP, fetchAurora, fetchAirports } from "./api/api";

// SSE Hook import
import { useLiveStream } from "./hooks/useLiveStream";

// Component imports
import AltitudeLegend from "./components/ui/AltitudeLegend";
import SettingsPanel from "./components/ui/SettingsPanel";
import StatsPanel from "./components/ui/StatsPanel";
import DateTimeViewer from "./components/ui/DateTimeViewer";

// Redux action imports
import {
  clearSelections,
  setSelectedAirport,
  setSelectedPlane,
  setViewState,
  setIsZooming,
  addFlightPanel,
  removeFlightPanel,
  addAirportPanel,
  removeAirportPanel,
  setHoveredRunwayId,
} from "./store/slices/uiSlice";

// Utility imports
import {
  getAltDisplay,
  getSpeedDisplay,
  formatCoord,
  capitalizeWords,
} from "./utils/mapUtils";
import { buildDeckLayers } from "./utils/deckLayersConfig";

// DRAP imports
import {
  getDRAPFilledCellsGeoJSON,
  getDRAPFilledCellsMapLayers,
} from "./utils/drap";

// Aurora imports
import { getAuroraGeoJSON, getAuroraMapLayers } from "./utils/aurora";

// Flight details panel imports
import FlightDetailsPanel from "./components/ui/FlightDetailsPanel";
import AirportDetailsPanel from "./components/ui/AirporDetailsPanel";
import SearchBar from "./components/ui/SearchBar";

const DeckGLOverlay = (props) => {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
};

const PlaneTracker = () => {
  const dispatch = useDispatch();
  const { data: planes } = useSelector((state) => state.planes);
  const selectedFlightsPanels = useSelector(
    (state) => state.ui.selectedFlightsPanels,
  );
  const selectedAirportsPanels = useSelector(
    (state) => state.ui.selectedAirportsPanels || [],
  );
  const hoveredRunwayId = useSelector((state) => state.ui.hoveredRunwayId);
  const { points: drapPoints } = useSelector((state) => state.drap);
  const { data: auroraData } = useSelector((state) => state.aurora);
  const { data: airports } = useSelector((state) => state.airports);

  const flightPath = useSelector((state) => state.flightPath.paths);
  const {
    useImperial,
    selectedPlane,
    selectedAirport,
    planeFilter,
    airportFilter,
    darkMode,
    showAirports,
    showPlanes,
    showDRAP,
    showAurora,
    viewState,
    isZooming,
    altitudeRange,
    airportAltitudeRange,
    drapRegionRange,
    auroraRegionRange,
    isolateMode,
    showAltitudeLegend,
    liveStreamMode,
  } = useSelector((state) => state.ui);

  const zoomTimeoutRef = useRef(null);

  useLiveStream(liveStreamMode); // Custom hook to handle live stream data

  useEffect(() => {
    // Fetch data on component mount once, then rely on live stream updates
    dispatch(fetchPlanes());
    dispatch(fetchDRAP());
    dispatch(fetchAurora());
    dispatch(fetchAirports());
  }, [dispatch]);

  // Plane filtering logic
  const filteredPlanes = useMemo(() => {
    return planes.filter((p) => {
      if (!p.lat || !p.lon) return false;
      const altValue =
        getAltDisplay(p.geo_altitude, false, useImperial) === "N/A"
          ? 0
          : parseFloat(getAltDisplay(p.geo_altitude, false, useImperial));
      if (altValue < altitudeRange[0] || altValue > altitudeRange[1])
        return false;
      return true;
    });
  }, [planes, planeFilter, useImperial, altitudeRange]);

  // Airport filtering logic
  const filteredAirports = useMemo(() => {
    if (airportFilter.length === 0) return [];
    return airports.filter((a) => {
      if (!airportFilter.includes(a.type)) return false;
      const altValue =
        getAltDisplay(a.elevation_ft, true, useImperial) === "N/A"
          ? 0
          : parseFloat(getAltDisplay(a.elevation_ft, true, useImperial));
      if (
        altValue < airportAltitudeRange[0] ||
        altValue > airportAltitudeRange[1]
      )
        return false;
      return true;
    });
  }, [airports, airportFilter, airportAltitudeRange, useImperial]);
  // Isolate mode logic
  const showPlanesIsolate = isolateMode ? true : showPlanes;
  const showAirportsIsolate = isolateMode ? false : showAirports;
  const filteredPlanesIsolate = isolateMode
    ? selectedFlightsPanels
    : filteredPlanes;
  const filteredAirportsIsolate = isolateMode ? [] : filteredAirports;

  // Draw DRAP regions as filled cells
  const { drapGeoJson, drapMapLayers, drapDeckLayers } = useMemo(() => {
    if (!drapPoints || drapPoints.length === 0) {
      return { drapGeoJson: null, drapMapLayers: null, drapDeckLayers: [] };
    }

    // Filter DRAP points by amplitude range
    const [minAmp, maxAmp] = drapRegionRange || [0, 35];
    const filteredDrapPoints = drapPoints.filter(
      ([lat, lon, amp]) => amp >= minAmp && amp <= maxAmp,
    );

    return {
      drapGeoJson: getDRAPFilledCellsGeoJSON(filteredDrapPoints),
      drapMapLayers: getDRAPFilledCellsMapLayers(isZooming, darkMode),
      drapDeckLayers: [],
    };
  }, [drapPoints, isZooming, darkMode, drapRegionRange]);

  // Draw Aurora regions as filled cells
  const { auroraGeoJson, auroraMapLayers } = useMemo(() => {
    if (!auroraData || !auroraData.coordinates) {
      return { auroraGeoJson: null, auroraMapLayers: null };
    }

    // Filter Aurora points by amplitude range
    const [minAmp, maxAmp] = auroraRegionRange || [0, 100];
    const filteredAuroraPoints = auroraData.coordinates.filter(
      ([lon, lat, pct]) => pct >= minAmp && pct <= maxAmp,
    );

    return {
      auroraGeoJson: getAuroraGeoJSON({
        ...auroraData,
        coordinates: filteredAuroraPoints,
      }),
      auroraMapLayers: getAuroraMapLayers(isZooming),
    };
  }, [auroraData, auroraRegionRange, isZooming]);

  // Plane and Airport layers
  const deckLayers = useMemo(() => {
    const baseLayers = buildDeckLayers({
      filteredPlanes: filteredPlanesIsolate,
      filteredAirports: filteredAirportsIsolate,
      showAirports: showAirportsIsolate,
      showPlanes: showPlanesIsolate,
      darkMode,
      useImperial,
      selectedPlane,
      selectedAirport,
      isZooming,
      flightPath,
      setSelectedPlane: (plane) => dispatch(setSelectedPlane(plane)),
      setSelectedAirport: (airport) => dispatch(setSelectedAirport(airport)),
      dispatch,
      addFlightPanel: (plane) => dispatch(addFlightPanel(plane)),
      selectedFlightsPanels,
      addAirportPanel: (airport) => dispatch(addAirportPanel(airport)),
      selectedAirportsPanels,
      hoveredRunwayId,
      setHoveredRunwayId: (id) => dispatch(setHoveredRunwayId(id)),
    });
    if (showDRAP && drapDeckLayers && drapDeckLayers.length > 0) {
      return [...drapDeckLayers, ...baseLayers];
    }
    return baseLayers;
  }, [
    dispatch,
    filteredAirportsIsolate,
    showDRAP,
    filteredPlanesIsolate,
    showAirportsIsolate,
    showPlanesIsolate,
    darkMode,
    useImperial,
    selectedPlane,
    selectedAirport,
    isZooming,
    drapDeckLayers,
    flightPath,
    isolateMode,
    selectedAirportsPanels,
    hoveredRunwayId,
  ]);

  const handleViewStateChange = (evt) => {
    dispatch(setViewState(evt.viewState));
    dispatch(setIsZooming(true));

    // Clear existing timeout
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }

    // Set new timeout to reset zoom state after 150ms of inactivity
    zoomTimeoutRef.current = setTimeout(() => {
      dispatch(setIsZooming(false));
    }, 150);
  };

  const themeVars = {
    "--ui-bg": darkMode ? "rgba(30, 30, 30, 1)" : "rgba(255, 255, 255, 1)",
    "--ui-text": darkMode ? "#ffffff" : "#000000",
    "--ui-border": darkMode ? "#555555" : "#cccccc",
    "--ui-shadow": "0 4px 12px rgba(0,0,0,0.3)",
  };

  return (
    <div
      style={{
        ...themeVars,
        width: "100%",
        height: "100vh",
        position: "relative",
        display: "flex",
      }}
    >
      <DateTimeViewer />
      <Map
        {...viewState}
        onMove={handleViewStateChange}
        mapStyle={
          darkMode
            ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        }
        onClick={() => dispatch(clearSelections())}
      >
        {/* MapLibre-based DRAP implementation*/}
        {showDRAP &&
          drapGeoJson &&
          drapMapLayers &&
          drapGeoJson.features?.length > 0 && (
            <Source id="drap-cells" type="geojson" data={drapGeoJson}>
              {drapMapLayers.map((layer) => (
                <Layer key={layer.id} {...layer} />
              ))}
            </Source>
          )}

        {/* MapLibre-based Aurora implementation */}
        {showAurora &&
          auroraGeoJson &&
          auroraMapLayers &&
          auroraGeoJson.features?.length > 0 && (
            <Source id="aurora-cells" type="geojson" data={auroraGeoJson}>
              {auroraMapLayers.map((layer) => (
                <Layer key={layer.id} {...layer} />
              ))}
            </Source>
          )}

        {/* Airports and Planes rendering */}
        <DeckGLOverlay
          layers={deckLayers}
          interleaved={true}
          getCursor={({ isDragging, isHovering }) =>
            isDragging ? "grabbing" : isHovering ? "pointer" : "grab"
          }
        />

        {/* Popups */}
        {showAirports && selectedAirport && (
          <Popup
            longitude={parseFloat(selectedAirport.lon)}
            latitude={parseFloat(selectedAirport.lat)}
            closeOnClick={false}
            onClose={() => dispatch(setSelectedAirport(null))}
            anchor="top"
            offset={10}
          >
            <div style={{ padding: "8px", minWidth: "150px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
                {selectedAirport.name}
              </h3>
              <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
                <strong>Code:</strong>{" "}
                {selectedAirport.iata_code || selectedAirport.gps_code || "N/A"}
                <br />
                <strong>Type:</strong> {capitalizeWords(selectedAirport.type)}
                <br />
                <strong>Location:</strong>{" "}
                {selectedAirport.municipality || "N/A"},{" "}
                {selectedAirport.country}
                <br />
                <strong>Elevation:</strong>{" "}
                {getAltDisplay(selectedAirport.elevation_ft, true, useImperial)}
                <br />
                <strong>Position:</strong> {formatCoord(selectedAirport.lat)}°,{" "}
                {formatCoord(selectedAirport.lon)}°
              </div>
            </div>
          </Popup>
        )}

        {showPlanes && selectedPlane && (
          <Popup
            longitude={parseFloat(selectedPlane.lon)}
            latitude={parseFloat(selectedPlane.lat)}
            closeOnClick={false}
            onClose={() => dispatch(setSelectedPlane(null))}
            anchor="bottom"
            offset={30}
          >
            <div style={{ padding: "8px", minWidth: "180px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                {selectedPlane.callsign || selectedPlane.icao24.toUpperCase()}
              </h3>
              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <strong>ICAO24:</strong> {selectedPlane.icao24.toUpperCase()}
                <br />
                <strong>Altitude:</strong>{" "}
                {getAltDisplay(selectedPlane.geo_altitude, false, useImperial)}
                <br />
                <strong>Speed:</strong>{" "}
                {getSpeedDisplay(selectedPlane.velocity, false, useImperial)}
                <br />
                <strong>Heading:</strong> {formatCoord(selectedPlane.heading)}
                <br />
                <strong>Position:</strong> {formatCoord(selectedPlane.lat)},{" "}
                {formatCoord(selectedPlane.lon)}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <style>{`
        .maplibregl-popup-content {
          background-color: var(--ui-bg) !important;
          color: var(--ui-text) !important;
          border: 1px solid var(--ui-border) !important;
          box-shadow: var(--ui-shadow) !important;
          backdrop-filter: blur(4px) !important;
        }
        .maplibregl-popup-tip {
          border-top-color: var(--ui-border) !important;
        }
        .maplibregl-popup-close-button {
          display: none !important;
        }
      `}</style>

      {/* Flight Details Panels */}
      {selectedFlightsPanels.map((flight) => (
        <FlightDetailsPanel
          key={flight.icao24}
          flight={flight}
          onClose={() => {
            dispatch(removeFlightPanel(flight.icao24));
            dispatch({
              type: "flightPath/removeFlightPath",
              payload: flight.icao24,
            });
          }}
          useImperial={useImperial}
        />
      ))}

      {/* Airport Details Panels */}
      {selectedAirportsPanels.map((airport) => (
        <AirportDetailsPanel
          key={airport.ident}
          airport={airport}
          onClose={() => dispatch(removeAirportPanel(airport.ident))}
          useImperial={useImperial}
        />
      ))}

      {/* Overlays */}

      <StatsPanel />
      {showAltitudeLegend && <AltitudeLegend />}
      <SettingsPanel />

      <div
        style={{
          backgroundColor: "var(--ui-bg)",
          padding: "10px",
          borderRadius: "4px",
          boxShadow: "var(--ui-shadow)",
          position: "absolute",
          top: "10px",
          left: "20px",
          zIndex: 1,
          fontSize: "12px",
          color: "var(--ui-text)",
        }}
      >
        <SearchBar />
      </div>
    </div>
  );
};

export default PlaneTracker;
