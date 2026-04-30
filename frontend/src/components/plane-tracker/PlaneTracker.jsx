// Base imports
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

// MapLibre imports
import { MapboxOverlay } from "@deck.gl/mapbox";
import Map, { ScaleControl, useControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { _GlobeView as GlobeView, MapView } from "@deck.gl/core";
// API imports
import {
  fetchPlanes,
  fetchDRAP,
  fetchAurora,
  fetchAirports,
  fetchGeoelectric,
  fetchElectricTransmissionLines,
  fetchLocations,
  fetchInitialAlerts,
} from "../../api/api";
import { useLiveStream } from "../../hooks/useLiveStream";

// Component imports
import SettingsPanel from "./SettingsPanel";
import StatsPanel from "./legends/StatsPanel";
import DateTimeViewer from "../ui/DateTimeViewer";
import FlightDetailsPanel from "./FlightDetailsPanel";
import AirportDetailsPanel from "./AirporDetailsPanel";
import SearchBar from "./SearchBar";
import PlaybackPanel from "./playback/PlaybackPanel";
import PlaybackPlaneTracker from "./PlaybackPlaneTracker";
import ColorLegend from "./legends/ColorLegend";
import EventGridOverlay from "./EventGridOverlay";
import AlertTrayButton from "./alerts/AlertTrayButton";
import AlertHistoryPanel from "./alerts/AlertHistoryPanel";
import AlertToastManager from "./alerts/AlertToastManager";
import { Slide } from "@mui/material";

// Redux action imports
import {
  clearSelections,
  setSelectedAirport,
  setSelectedPlane,
  setSelectedElectricTransmissionLine,
  setViewState,
  setIsZooming,
  addFlightPanel,
  removeFlightPanel,
  addAirportPanel,
  removeAirportPanel,
  setHoveredRunwayId,
} from "../../store/slices/uiSlice";
import { clearPlaybackPlanes } from "../../store/slices/planesSlice";

// Utility imports
import { getAltDisplay } from "../../utils/mapUtils";
import { buildDeckLayers } from "../../utils/deckLayersConfig";
import { buildDeckTooltip } from "../../utils/deckTooltip";
import { filterElectricTransmissionLines } from "../../utils/electricTransmissionLines";
import { resolveFlightPositions } from "./helpers/flightPlayback";

const DeckGLOverlay = (props) => {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
};

const PlaneTracker = () => {
  const dispatch = useDispatch();
  const [hoverTooltip, setHoverTooltip] = useState(null);

  const { data: planes } = useSelector((state) => state.planes);
  const selectedFlightsPanels = useSelector(
    (state) => state.ui.selectedFlightsPanels,
  );
  const selectedAirportsPanels = useSelector(
    (state) => state.ui.selectedAirportsPanels || [],
  );
  const hoveredRunwayId = useSelector((state) => state.ui.hoveredRunwayId);
  const selectedElectricTransmissionLine = useSelector(
    (state) => state.ui.selectedElectricTransmissionLine,
  );
  const { data: airports } = useSelector((state) => state.airports);
  const flightPath = useSelector((state) => state.flightPath.paths);
  const electricTransmissionLinesState = useSelector(
    (state) => state.electricTransmissionLines,
  );
  const { showElectricTransmissionLines } = electricTransmissionLinesState;

  const {
    useImperial,
    selectedPlane,
    selectedAirport,
    airportFilter,
    darkMode,
    showAirports,
    showPlanes,
    globeView,
    viewState,
    isZooming,
    altitudeRange,
    airportAltitudeRange,
    isolateMode,
    showAltitudeLegend,
    airportIconSize,
    flightIconSize,
    showIconLegend,
  } = useSelector((state) => state.ui);
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const playbackFlightData = useSelector(
    (state) => state.playbackFlightPaths.flightData,
  );

  const currentZoom = viewState?.zoom ?? 10;
  const zoomTimeoutRef = useRef(null);

  // Resolve visible playback flights at the current playback time
  const visiblePlaybackFlights = useMemo(() => {
    if (liveStreamMode || !currentPlaybackTime) return [];
    return resolveFlightPositions(playbackFlightData, currentPlaybackTime);
  }, [liveStreamMode, currentPlaybackTime, playbackFlightData]);

  // Build trail paths for currently-visible playback flights, up to current time.
  // A path appears with the plane and disappears once it lands or stops being tracked.
  // Keyed off the parallel `requested_time` array so trails extend in lockstep with
  // the (minute-aligned) playback frames rather than the seconds-offset `time_pos`.
  const visiblePlaybackFlightPaths = useMemo(() => {
    if (
      liveStreamMode ||
      !currentPlaybackTime ||
      visiblePlaybackFlights.length === 0
    ) {
      return [];
    }
    const targetMs = new Date(currentPlaybackTime).getTime();
    if (!Number.isFinite(targetMs)) return [];
    const visibleIcaos = new Set(visiblePlaybackFlights.map((f) => f.icao24));
    const byIcao = {};
    Object.values(playbackFlightData || {}).forEach((data) => {
      if (
        !data ||
        !Array.isArray(data.points) ||
        !Array.isArray(data.requested_time)
      ) {
        return;
      }
      const requested = data.requested_time;
      const points = data.points;
      const len = Math.min(requested.length, points.length);
      for (let i = 0; i < len; i++) {
        const p = points[i];
        if (!p || p.lat == null || p.lon == null) continue;
        if (p.on_ground === true || p.on_ground === "true") continue;
        const t = new Date(requested[i]).getTime();
        if (!Number.isFinite(t) || t > targetMs) continue;
        const key = p.icao24;
        if (!key || !visibleIcaos.has(key)) continue;
        (byIcao[key] = byIcao[key] || []).push({
          t,
          coord: [parseFloat(p.lon), parseFloat(p.lat)],
        });
      }
    });
    return Object.entries(byIcao)
      .map(([icao24, pts]) => ({
        icao24,
        coords: pts.sort((a, b) => a.t - b.t).map((entry) => entry.coord),
      }))
      .filter((entry) => entry.coords.length > 1);
  }, [liveStreamMode, currentPlaybackTime, playbackFlightData, visiblePlaybackFlights]);

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchInitialAlerts());
  }, [dispatch]);

  useLiveStream(liveStreamMode);

  useEffect(() => {
    if(!liveStreamMode)return;
    dispatch(clearPlaybackPlanes());
    dispatch(fetchPlanes());
    dispatch(fetchDRAP());
    dispatch(fetchAurora());
    dispatch(fetchGeoelectric());
    dispatch(fetchElectricTransmissionLines());
    dispatch(fetchAirports());
  }, [dispatch, liveStreamMode]);

  useEffect(() => {
    if (!showElectricTransmissionLines && selectedElectricTransmissionLine) {
      dispatch(setSelectedElectricTransmissionLine(null));
    }
  }, [
    dispatch,
    selectedElectricTransmissionLine,
    showElectricTransmissionLines,
  ]);

  const filteredPlanes = useMemo(() => {
    return planes.filter((p) => {
      if (!p.lat || !p.lon) return false;
      const altValue =
        getAltDisplay(p.geo_altitude, false, useImperial) === "N/A"
          ? 0
          : parseFloat(getAltDisplay(p.geo_altitude, false, useImperial));
      if (altValue < altitudeRange[0] || altValue > altitudeRange[1]) {
        return false;
      }
      return true;
    });
  }, [planes, useImperial, altitudeRange]);

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
      ) {
        return false;
      }
      return true;
    });
  }, [airports, airportFilter, airportAltitudeRange, useImperial]);

  const filteredElectricTransmissionLines = useMemo(() => {
    const {
      data,
      electricTransmissionLinesVoltageRange,
      showOnlyInServiceLines,
      dontShowInferredLines,
      showACLines,
      showDCLines,
      showOverheadLines,
      showUndergroundLines,
    } = electricTransmissionLinesState;

    return filterElectricTransmissionLines(data, {
      electricTransmissionLinesVoltageRange,
      showOnlyInServiceLines,
      dontShowInferredLines,
      showACLines,
      showDCLines,
      showOverheadLines,
      showUndergroundLines,
    });
  }, [electricTransmissionLinesState]);

  const showPlanesIsolate = isolateMode ? true : showPlanes;
  const showAirportsIsolate = isolateMode ? true : showAirports;
  const filteredPlanesIsolate = isolateMode
    ? selectedFlightsPanels
    : filteredPlanes;
  const filteredAirportsIsolate = isolateMode
    ? selectedAirportsPanels
    : filteredAirports;

  // Plane and Airport layers
  const deckLayers = useMemo(() => {
    return buildDeckLayers({
      filteredPlanes: filteredPlanesIsolate,
      filteredAirports: filteredAirportsIsolate,
      showAirports: showAirportsIsolate,
      showPlanes: showPlanesIsolate,
      showElectricTransmissionLines,
      darkMode,
      useImperial,
      selectedPlane,
      selectedAirport,
      selectedElectricTransmissionLine,
      currentZoom,
      isZooming,
      flightPath,
      setSelectedPlane: (plane) => dispatch(setSelectedPlane(plane)),
      setSelectedAirport: (airport) => dispatch(setSelectedAirport(airport)),
      setSelectedElectricTransmissionLine: (line) =>
        dispatch(setSelectedElectricTransmissionLine(line)),
      dispatch,
      addFlightPanel: (plane) => dispatch(addFlightPanel(plane)),
      selectedFlightsPanels,
      addAirportPanel: (airport) => dispatch(addAirportPanel(airport)),
      selectedAirportsPanels,
      filteredElectricTransmissionLines,
      hoveredRunwayId,
      setHoveredRunwayId: (id) => dispatch(setHoveredRunwayId(id)),
      airportIconSize,
      flightIconSize,
      globeView,
      playbackFlights: visiblePlaybackFlights,
      playbackFlightPaths: visiblePlaybackFlightPaths,
    });
  }, [
    dispatch,
    filteredAirportsIsolate,
    filteredPlanesIsolate,
    showAirportsIsolate,
    showPlanesIsolate,
    showElectricTransmissionLines,
    darkMode,
    useImperial,
    selectedPlane,
    selectedAirport,
    selectedElectricTransmissionLine,
    currentZoom,
    isZooming,
    flightPath,
    selectedAirportsPanels,
    selectedFlightsPanels,
    filteredElectricTransmissionLines,
    hoveredRunwayId,
    airportIconSize,
    flightIconSize,
    globeView,
    visiblePlaybackFlights,
    visiblePlaybackFlightPaths,
  ]);

  const handleViewStateChange = (evt) => {
    dispatch(setViewState(evt.viewState));
    dispatch(setIsZooming(true));

    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }

    zoomTimeoutRef.current = setTimeout(() => {
      dispatch(setIsZooming(false));
    }, 250);
  };

  const getHoverTooltipPosition = (info, tooltip) => {
    const offset = 16;
    const edgePadding = 1;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedWidth = tooltip.estimatedWidth ?? 340;
    const estimatedHeight = tooltip.estimatedHeight ?? 220;

    const shouldFlipX =
      info.x + offset + estimatedWidth + edgePadding > viewportWidth;
    const shouldFlipY =
      info.y + offset + estimatedHeight + edgePadding > viewportHeight;

    let left = shouldFlipX ? info.x - offset - estimatedWidth : info.x + offset;
    let top = shouldFlipY ? info.y - offset - estimatedHeight : info.y + offset;

    left = Math.max(
      edgePadding,
      Math.min(left, viewportWidth - estimatedWidth - edgePadding),
    );
    top = Math.max(
      edgePadding,
      Math.min(top, viewportHeight - estimatedHeight - edgePadding),
    );

    return { left, top };
  };

  const handleDeckHover = (info) => {
    const tooltip = buildDeckTooltip({ info, useImperial });

    if (!tooltip) {
      setHoverTooltip(null);
      return;
    }

    setHoverTooltip({
      ...tooltip,
      position: getHoverTooltipPosition(info, tooltip),
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        display: "flex",
        background: 'linear-gradient(0, #000, #223)'
      }}
    >
      <Slide direction="down" in={true} timeout={500} mountOnEnter unmountOnExit>
        <DateTimeViewer playbackMode />
      </Slide>

      <Map
        reuseMaps
        {...viewState}
        onMove={handleViewStateChange}
        mapStyle={
          darkMode
            ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        }
        projection={globeView ? "globe" : "mercator"}
        onClick={() => dispatch(clearSelections())}        
        dragRotate={false}
        maxPitch={0}
      >
        <EventGridOverlay />

        <DeckGLOverlay
          views={globeView ? new GlobeView() : new MapView()}
          layers={deckLayers}
          interleaved={true}
          onHover={handleDeckHover}
          getCursor={({ isDragging, isHovering }) =>
            isDragging ? "grabbing" : isHovering ? "pointer" : "grab"
          }
        />

        <ScaleControl
          position="bottom-left"
          style={{
            borderBottom: `4px solid ${darkMode ? "#7f5cff" : "#1565c0"} `,
            padding: "2px 6px",
            background: "transparent",
            color: "#fff",
            marginLeft: "20px",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        />
      </Map>

      {hoverTooltip && (
        <div
          className={hoverTooltip.className}
          style={{
            position: "fixed",
            left: hoverTooltip.position.left,
            top: hoverTooltip.position.top,
            pointerEvents: "none",
            zIndex: 20,
            ...hoverTooltip.style,
          }}
          dangerouslySetInnerHTML={{ __html: hoverTooltip.html }}
        />
      )}

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
        .deck-tooltip {
          font-family: inherit;
        }
        .plane-tracker-tooltip {
          pointer-events: none;
        }
      `}</style>
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

      {selectedAirportsPanels.map((airport) => (
        <AirportDetailsPanel
          key={airport.ident}
          airport={airport}
          onClose={() => dispatch(removeAirportPanel(airport.ident))}
          useImperial={useImperial}
        />
      ))}

      <Slide
        direction="up"
        in={showIconLegend}
        timeout={500}
        mountOnEnter
        unmountOnExit
      >
        <StatsPanel />
      </Slide>

      <Slide
        direction="up"
        in={!liveStreamMode}
        timeout={500}
        mountOnEnter
        unmountOnExit
      >
        <PlaybackPanel />
      </Slide>

      <PlaybackPlaneTracker />

      <Slide
        direction="up"
        in={showAltitudeLegend}
        timeout={500}
        mountOnEnter
        unmountOnExit
      >
        <ColorLegend />
      </Slide>

      <SettingsPanel />

      <Slide
        direction="down"
        in={true}
        timeout={500}
        mountOnEnter
        unmountOnExit
      >
        <SearchBar />
      </Slide>

      <AlertTrayButton />
      <AlertHistoryPanel />
      <AlertToastManager />
    </div>
  );
};

export default PlaneTracker;
