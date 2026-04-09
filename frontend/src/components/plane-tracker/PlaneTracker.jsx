//Base imports
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

// MapLibre imports
import { MapboxOverlay } from "@deck.gl/mapbox";
import Map, { Layer, Popup, Source, useControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// API imports
import {
  fetchPlanes,
  fetchDRAP,
  fetchAurora,
  fetchAirports,
  fetchGeoelectric,
  fetchElectricTransmissionLines,
} from "../../api/api";

// SSE Hook import
import { useLiveStream } from "../../hooks/useLiveStream";

// Component imports
import SettingsPanel from "./SettingsPanel";
import StatsPanel from "./legends/StatsPanel";
import DateTimeViewer from "../ui/DateTimeViewer";

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
} from "../../store/slices/uiSlice";

// Utility imports
import {
  getAltDisplay,
  getSpeedDisplay,
  formatCoord,
  capitalizeWords,
} from "../../utils/mapUtils";
import { buildDeckLayers } from "../../utils/deckLayersConfig";

// DRAP imports
import {
  getDRAPFilledCellsGeoJSON,
  getDRAPFilledCellsMapLayers,
} from "../../utils/drap";

// Aurora imports
import { getAuroraGeoJSON, getAuroraMapLayers } from "../../utils/aurora";
// GeoElectric imports
import {
  getGeoElectricGeoJSON,
  getGeoElectricMapLayers,
} from "../../utils/geoElectric";

// Power Grid imports
import {
  getElectricTransmissionLinesGeoJSON,
  getElectricTransmissionLinesLayers,
} from "../../utils/electricTransmissionLines";
// Power grid GeoJSON (memoized)

// Flight details panel imports
import FlightDetailsPanel from "./FlightDetailsPanel";
import AirportDetailsPanel from "./AirporDetailsPanel";
import SearchBar from "./SearchBar";
import PlaybackPanel from "./playback/PlaybackPanel";
import ColorLegend from "./legends/ColorLegend";
import { Slide } from "@mui/material";

const DeckGLOverlay = (props) => {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
};

const getPlaybackTimestamp = (entry) =>
  Date.parse(
    entry?.playbackTime ||
      entry?.requested_time ||
      entry?.observation_time ||
      entry?.timestamp ||
      entry?.observed_at ||
      "",
  );

const findClosestPlaybackIndex = (timestamps, targetTime) => {
  if (!Array.isArray(timestamps) || timestamps.length === 0 || !Number.isFinite(targetTime)) {
    return -1;
  }

  let low = 0;
  let high = timestamps.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const timestamp = timestamps[mid];

    if (timestamp < targetTime) {
      low = mid + 1;
    } else if (timestamp > targetTime) {
      high = mid - 1;
    } else {
      return mid;
    }
  }

  return -1;
};

const resolvePlaybackEntry = (playback, timestamps, targetTime) => {
  const index = findClosestPlaybackIndex(timestamps, targetTime);
  return index >= 0 ? playback[index] : null;
};

const PlaneTracker = () => {
  const [
    hoveredElectricTransmissionLines,
    setHoveredElectricTransmissionLines,
  ] = useState(null);
  const dispatch = useDispatch();
  const { data: planes } = useSelector((state) => state.planes);
  const selectedFlightsPanels = useSelector(
    (state) => state.ui.selectedFlightsPanels,
  );
  const selectedAirportsPanels = useSelector(
    (state) => state.ui.selectedAirportsPanels || [],
  );
  const hoveredRunwayId = useSelector((state) => state.ui.hoveredRunwayId);
  const { points: drapPoints, playback: drapPlayback } = useSelector(
    (state) => state.drap,
  );
  const { data: auroraData, playback: auroraPlayback } = useSelector(
    (state) => state.aurora,
  );
  const {
    data: geoelectricData,
    playback: geoElectricPlayback,
    geoElectricLogRange,
    showGeoElectric,
  } = useSelector((state) => state.geoelectric);
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
    airportIconSize,
    flightIconSize,
    showIconLegend,
  } = useSelector((state) => state.ui);
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const {
    data: electricTransmissionLinesData,
    showElectricTransmissionLines,
    electricTransmissionLinesVoltageRange,
    showOnlyInServiceLines,
    dontShowInferredLines,
    showACLines,
    showDCLines,
    showOverheadLines,
    showUndergroundLines,
  } = useSelector((state) => state.electricTransmissionLines);
  const currentZoom = viewState?.zoom ?? 10;
  const zoomTimeoutRef = useRef(null);

  useLiveStream(liveStreamMode); // Custom hook to handle live stream data

  useEffect(() => {
    // Fetch data on component mount once, then rely on live stream updates
    dispatch(fetchPlanes());
    dispatch(fetchDRAP());
    dispatch(fetchAurora());
    dispatch(fetchGeoelectric());
    dispatch(fetchElectricTransmissionLines());
    dispatch(fetchAirports());
  }, [dispatch, liveStreamMode]);

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
  const showAirportsIsolate = isolateMode ? true : showAirports;
  const filteredPlanesIsolate = isolateMode
    ? selectedFlightsPanels
    : filteredPlanes;
  const filteredAirportsIsolate = isolateMode
    ? selectedAirportsPanels
    : filteredAirports;

  const drapPlaybackTimes = useMemo(
    () =>
      drapPlayback.map(getPlaybackTimestamp).filter(Number.isFinite),
    [drapPlayback],
  );
  const auroraPlaybackTimes = useMemo(
    () =>
      auroraPlayback.map(getPlaybackTimestamp).filter(Number.isFinite),
    [auroraPlayback],
  );
  const geoElectricPlaybackTimes = useMemo(
    () =>
      geoElectricPlayback.map(getPlaybackTimestamp).filter(Number.isFinite),
    [geoElectricPlayback],
  );

  const activeDrapPlayback = useMemo(
    () =>
      !liveStreamMode && currentPlaybackTime
        ? resolvePlaybackEntry(drapPlayback, drapPlaybackTimes, currentPlaybackTime)
        : null,
    [liveStreamMode, currentPlaybackTime, drapPlayback, drapPlaybackTimes],
  );
  const activeAuroraPlayback = useMemo(
    () =>
      !liveStreamMode && currentPlaybackTime
        ? resolvePlaybackEntry(auroraPlayback, auroraPlaybackTimes, currentPlaybackTime)
        : null,
    [liveStreamMode, currentPlaybackTime, auroraPlayback, auroraPlaybackTimes],
  );
  const activeGeoElectricPlayback = useMemo(
    () =>
      !liveStreamMode && currentPlaybackTime
        ? resolvePlaybackEntry(
            geoElectricPlayback,
            geoElectricPlaybackTimes,
            currentPlaybackTime,
          )
        : null,
    [
      liveStreamMode,
      currentPlaybackTime,
      geoElectricPlayback,
      geoElectricPlaybackTimes,
    ],
  );

  // Draw DRAP regions as filled cells
  const { drapGeoJson, drapMapLayers } = useMemo(() => {
    const sourcePoints =
      !liveStreamMode && activeDrapPlayback?.points?.length
        ? activeDrapPlayback.points
        : drapPoints;

    if (!sourcePoints || sourcePoints.length === 0) {
      return { drapGeoJson: null, drapMapLayers: null };
    }

    // Filter DRAP points by amplitude range
    const [minAmp, maxAmp] = drapRegionRange || [0, 35];
    const filteredDrapPoints = sourcePoints.filter(
      ([lat, lon, amp]) => amp >= minAmp && amp <= maxAmp,
    );

    return {
      drapGeoJson: getDRAPFilledCellsGeoJSON(filteredDrapPoints),
      drapMapLayers: getDRAPFilledCellsMapLayers(isZooming, darkMode),
    };
  }, [
    drapPoints,
    activeDrapPlayback,
    liveStreamMode,
    isZooming,
    darkMode,
    drapRegionRange,
  ]);

  // Draw Aurora regions as filled cells
  const { auroraGeoJson, auroraMapLayers } = useMemo(() => {
    const sourceData =
      !liveStreamMode && activeAuroraPlayback ? activeAuroraPlayback : auroraData;

    const sourceCoordinates =
      sourceData?.coordinates || sourceData?.points || sourceData?.data || [];

    if (!sourceData || !Array.isArray(sourceCoordinates) || sourceCoordinates.length === 0) {
      return { auroraGeoJson: null, auroraMapLayers: null };
    }

    // Filter Aurora points by amplitude range
    const [minAmp, maxAmp] = auroraRegionRange || [0, 100];
    const filteredAuroraPoints = sourceCoordinates.filter(
      ([lat, lon, pct]) => pct >= minAmp && pct <= maxAmp,
    );

    return {
      auroraGeoJson: getAuroraGeoJSON({
        ...sourceData,
        coordinates: filteredAuroraPoints,
      }),
      auroraMapLayers: getAuroraMapLayers(isZooming),
    };
  }, [auroraData, activeAuroraPlayback, liveStreamMode, auroraRegionRange, isZooming]);

  // Draw GeoElectric regions as filled cells
  const { geoElectricGeoJson, geoElectricMapLayers } = useMemo(() => {
    const sourceData =
      !liveStreamMode && activeGeoElectricPlayback
        ? activeGeoElectricPlayback
        : geoelectricData;

    if (!sourceData || !sourceData.points) {
      return { geoElectricGeoJson: null, geoElectricMapLayers: null };
    }
    const [minLog, maxLog] =
      Array.isArray(geoElectricLogRange) && geoElectricLogRange.length === 2
        ? geoElectricLogRange
        : [0, 4];
    const minMag = Math.pow(10, minLog);
    const maxMag = Math.pow(10, maxLog);
    const filteredGeoElectricPoints = sourceData.points.filter(
      ([lat, lon, magnitude]) =>
        magnitude >= minMag && magnitude <= maxMag,
    );
    return {
      geoElectricGeoJson: getGeoElectricGeoJSON({
        ...sourceData,
        points: filteredGeoElectricPoints,
      }),
      geoElectricMapLayers: getGeoElectricMapLayers(isZooming),
    };
  }, [
    geoelectricData,
    activeGeoElectricPlayback,
    liveStreamMode,
    geoElectricLogRange,
    isZooming,
  ]);

  const {
    electricTransmissionLinesGeoJson,
    electricTransmissionLinesMapLayers,
  } = useMemo(() => {
    if (!electricTransmissionLinesData) {
      return {
        electricTransmissionLinesGeoJson: null,
        electricTransmissionLinesMapLayers: null,
      };
    }
    if (
      !Array.isArray(electricTransmissionLinesData) ||
      !Array.isArray(electricTransmissionLinesVoltageRange)
    )
      return [];
    const filteredElectricTransmissionLines =
      electricTransmissionLinesData.filter((line) => {
        if (typeof line.VOLTAGE !== "number") return false;
        if (showOnlyInServiceLines && line.STATUS !== "IN SERVICE")
          return false;
        if (dontShowInferredLines && line.INFERRED !== "N") return false;

        const type = String(line.TYPE ?? "").toUpperCase();

        const hasOverhead = type.includes("OVERHEAD");
        const hasUnderground = type.includes("UNDERGROUND");
        const hasAC = type.includes("AC");
        const hasDC = type.includes("DC");

        const matchesConstruction =
          (showOverheadLines && hasOverhead) ||
          (showUndergroundLines && hasUnderground);

        const matchesCurrentType =
          (showACLines && hasAC) || (showDCLines && hasDC);

        if (!matchesConstruction) return false;
        if (!matchesCurrentType) return false;

        return (
          line.VOLTAGE >= electricTransmissionLinesVoltageRange[0] &&
          line.VOLTAGE <= electricTransmissionLinesVoltageRange[1]
        );
      });
    return {
      electricTransmissionLinesGeoJson: getElectricTransmissionLinesGeoJSON(
        filteredElectricTransmissionLines,
      ),
      electricTransmissionLinesMapLayers: getElectricTransmissionLinesLayers(),
    };
  }, [
    electricTransmissionLinesData,
    electricTransmissionLinesVoltageRange,
    showOnlyInServiceLines,
    dontShowInferredLines,
    showOverheadLines,
    showUndergroundLines,
    showACLines,
    showDCLines,
  ]);

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
      currentZoom,
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
      airportIconSize,
      flightIconSize,
    });
    return baseLayers;
  }, [
    dispatch,
    filteredAirportsIsolate,
    filteredPlanesIsolate,
    showAirportsIsolate,
    showPlanesIsolate,
    darkMode,
    useImperial,
    selectedPlane,
    selectedAirport,
    viewState?.zoom,
    isZooming,
    flightPath,
    isolateMode,
    selectedAirportsPanels,
    selectedFlightsPanels,
    hoveredRunwayId,
    airportIconSize,
    flightIconSize,
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

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        display: "flex",
      }}
    >
      <Slide
        direction="down"
        in={true}
        timeout={500}
        mountOnEnter
        unmountOnExit
      >
        <DateTimeViewer />
      </Slide>

      <Map
        {...viewState}
        onMove={handleViewStateChange}
        mapStyle={
          darkMode
            ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        }
        onClick={() => dispatch(clearSelections())}
        onMouseMove={(e) => {
          const map =
            e.target && e.target.queryRenderedFeatures
              ? e.target
              : e.currentTarget;
          if (!map || !e.lngLat) return;
          const features =
            showElectricTransmissionLines && map.queryRenderedFeatures
              ? map.queryRenderedFeatures(e.point, {
                  layers: ["electric-transmission-lines"],
                })
              : [];
          if (features && features.length > 0) {
            setHoveredElectricTransmissionLines({
              feature: features[0],
              lngLat: e.lngLat,
            });
          } else {
            setHoveredElectricTransmissionLines(null);
          }
        }}
        onMouseLeave={() => setHoveredElectricTransmissionLines(null)}
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

        {/* MapLibre-based GeoElectric implementation */}
        {showGeoElectric &&
          geoElectricGeoJson &&
          geoElectricMapLayers &&
          geoElectricGeoJson.features?.length > 0 && (
            <Source
              id="geoelectric-cells"
              type="geojson"
              data={geoElectricGeoJson}
            >
              {geoElectricMapLayers.map((layer) => (
                <Layer
                  key={layer.id}
                  {...layer}
                  beforeId="electric-transmission-lines"
                />
              ))}
            </Source>
          )}

        {/* MapLibre-based Power Grid implementation */}
        {showElectricTransmissionLines &&
          electricTransmissionLinesGeoJson &&
          electricTransmissionLinesMapLayers &&
          electricTransmissionLinesGeoJson.features?.length > 0 && (
            <Source
              id="electric-transmission-lines"
              type="geojson"
              data={electricTransmissionLinesGeoJson}
            >
              {electricTransmissionLinesMapLayers.map((layer) => (
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
        {hoveredElectricTransmissionLines &&
          hoveredElectricTransmissionLines.lngLat &&
          hoveredElectricTransmissionLines.feature && (
            <Popup
              longitude={hoveredElectricTransmissionLines.lngLat.lng}
              latitude={hoveredElectricTransmissionLines.lngLat.lat}
              closeButton={false}
              closeOnClick={false}
              anchor="top"
              offset={10}
            >
              <div style={{ padding: "8px", minWidth: "150px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "0.875rem" }}>
                  {hoveredElectricTransmissionLines.feature.properties.OWNER ??
                    hoveredElectricTransmissionLines.feature.properties.SUB_1 ??
                    hoveredElectricTransmissionLines.feature.properties.SUB_2}
                </h3>
                <div style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>
                  <strong>Voltage Level:</strong>{" "}
                  {hoveredElectricTransmissionLines.feature.properties.VOLTAGE}{" "}
                  kV
                  <br />
                  <strong>Type:</strong>{" "}
                  {hoveredElectricTransmissionLines.feature.properties.TYPE}
                  <br />
                  <strong>Status:</strong>{" "}
                  {hoveredElectricTransmissionLines.feature.properties.STATUS}
                  <br />
                  <strong>Source:</strong>{" "}
                  {hoveredElectricTransmissionLines.feature.properties.SOURCE &&
                  hoveredElectricTransmissionLines.feature.properties.SOURCE
                    .length > 30
                    ? hoveredElectricTransmissionLines.feature.properties.SOURCE.slice(
                        0,
                        30,
                      ) + "..."
                    : hoveredElectricTransmissionLines.feature.properties
                        .SOURCE}
                  <br />
                  <strong>Voltage Source:</strong>{" "}
                  {hoveredElectricTransmissionLines.feature.properties
                    .INFERRED === "Y"
                    ? "Estimated"
                    : "Reported"}
                  <br />
                  <strong>From Substation:</strong>{" "}
                  {hoveredElectricTransmissionLines.feature.properties.SUB_1}
                  <br />
                  <strong>To Substation:</strong>{" "}
                  {hoveredElectricTransmissionLines.feature.properties.SUB_2}
                  <br />
                  <strong>Length:</strong>{" "}
                  {useImperial
                    ? (
                        hoveredElectricTransmissionLines.feature.properties
                          .SHAPE__Len * 0.000621371
                      ).toFixed(2) + " mi"
                    : (
                        hoveredElectricTransmissionLines.feature.properties
                          .SHAPE__Len / 1000
                      ).toFixed(2) + " km"}
                </div>
              </div>
            </Popup>
          )}
        {showAirports && selectedAirport && (
          <Popup
            longitude={parseFloat(selectedAirport.lon)}
            latitude={parseFloat(selectedAirport.lat)}
            closeOnClick={false}
            onClose={() => dispatch(setSelectedAirport(null))}
            anchor="top"
            offset={30}
          >
            <div style={{ padding: "8px", minWidth: "150px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "0.875rem" }}>
                {selectedAirport.name}
              </h3>
              <div style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>
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
                <strong>Position:</strong> {formatCoord(selectedAirport.lat)},{" "}
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
              <h3 style={{ margin: "0 0 8px 0", fontSize: "0.875rem" }}>
                {selectedPlane.callsign || selectedPlane.icao24.toUpperCase()}
              </h3>
              <div style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>
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
    </div>
  );
};

export default PlaneTracker;
