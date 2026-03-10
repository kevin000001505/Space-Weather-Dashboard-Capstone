//Base imports
import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// MapLibre imports
import { MapboxOverlay } from '@deck.gl/mapbox';
import Map, { Layer, Popup, Source, useControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// API imports
import { fetchPlanes, fetchDRAP, fetchAirports } from './api/api';

// Component imports
import AltitudeLegend from './components/ui/AltitudeLegend';
import SettingsPanel from './components/ui/SettingsPanel';
import FilterPanel from './components/ui/FilterPanel';
import StatsPanel from './components/ui/StatsPanel';

// Redux action imports
import {
  clearSelections,
  setSelectedAirport,
  setSelectedPlane,
  setViewState,
  setIsZooming,
} from './store/slices/uiSlice';

// Utility imports
import { getAltFt, getAltDisplay, getSpeedDisplay, formatNumber, formatCoord } from './utils/mapUtils';
import { buildDeckLayers } from './utils/deckLayersConfig';

// DRAP implementations
import { 
  createDRAPHeatmapLayers,
  getDRAPHeatmapGeoJSON,
  getDRAPHeatmapMapLayers
} from './utils/drap-implementations/heatmap';
import { 
  createDRAPBitmapLayers,
  getDRAPBitmapGeoJSON,
  getDRAPBitmapMapLayers
} from './utils/drap-implementations/bitmap';
import { 
  createDRAPFilledCellsLayers,
  getDRAPFilledCellsGeoJSON,
  getDRAPFilledCellsMapLayers
} from './utils/drap-implementations/filled-cells';
import { 
  createDRAPContourLinesLayers,
  getDRAPContourLinesGeoJSON,
  getDRAPContourLinesMapLayers
} from './utils/drap-implementations/contour-lines';

const DeckGLOverlay = (props) => {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
};

const PlaneTracker = () => {
  const dispatch = useDispatch();
  const { data: planes } = useSelector((state) => state.planes);
  const { points: drapPoints } = useSelector((state) => state.drap);
  const { data: airports } = useSelector((state) => state.airports);
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
    drapImplementation,
    viewState,
    isZooming,
    altitudeRange,
    airportAltitudeRange,
    drapRegionRange,
  } = useSelector((state) => state.ui);
  
  const zoomTimeoutRef = useRef(null);

  const highThresh = useImperial ? 36000 : 11000;
  const lowThresh = useImperial ? 30000 : 9000;

  useEffect(() => {
    // Fetch data on component mount
    dispatch(fetchPlanes());
    dispatch(fetchDRAP());
    if (airports.length === 0) {
        dispatch(fetchAirports());
    }

    // Set up interval to refresh data every 2 minutes
    const interval = setInterval(() => {
      dispatch(fetchPlanes());
      dispatch(fetchDRAP());
    }, 120000);

    return () => clearInterval(interval);
  }, [dispatch, airports.length]);

  const filteredPlanes = useMemo(() => {
    const valid = [];
    const high = [];
    const med = [];
    const low = [];

    planes.forEach(p => {
      if (!p.lat || !p.lon) return;
      const altValue = useImperial ? getAltFt(p.geo_altitude) : p.geo_altitude;
      if (altitudeRange && (altValue < altitudeRange[0] || altValue > altitudeRange[1])) return;
      valid.push(p);
      if (altValue > highThresh) high.push(p);
      else if (altValue >= lowThresh && altValue <= highThresh) med.push(p);
      else low.push(p);
    });

    let activePlanes = valid;
    if (planeFilter === 'high') activePlanes = high;
    if (planeFilter === 'medium') activePlanes = med;
    if (planeFilter === 'low') activePlanes = low;
    if (planeFilter === 'none') activePlanes = [];

    return activePlanes;
  }, [planes, planeFilter, useImperial, highThresh, lowThresh, altitudeRange]);

  const filteredAirports = useMemo(() => {
    if (airportFilter.length === 0) return [];
    return airports.filter(a => {
      if (!airportFilter.includes(a.type)) return false;
      // Use 'elevation_ft' from CSV, fallback to 0 if missing
      let elevation = a.elevation_ft !== undefined ? parseFloat(a.elevation_ft) : (a.elevation !== undefined ? parseFloat(a.elevation) : 0);
      if (isNaN(elevation)) elevation = 0;
      const altValue = useImperial ? elevation : elevation * 0.3048;
      if (airportAltitudeRange && (altValue < airportAltitudeRange[0] || altValue > airportAltitudeRange[1])) return false;
      return true;
    });
  }, [airports, airportFilter, airportAltitudeRange, useImperial]);

// Dynamic DRAP implementation selection
  const { drapGeoJson, drapMapLayers, drapDeckLayers } = useMemo(() => {
    if (!drapPoints || drapPoints.length === 0) {
      return { drapGeoJson: null, drapMapLayers: null, drapDeckLayers: [] };
    }

    // Filter DRAP points by amplitude range
    const [minAmp, maxAmp] = drapRegionRange || [0, 35];
    const filteredDrapPoints = drapPoints.filter(([lat, lon, amp]) => amp >= minAmp && amp <= maxAmp);

    try {
      switch (drapImplementation) {
        case 'heatmap':
          return {
            drapGeoJson: getDRAPHeatmapGeoJSON?.(filteredDrapPoints),
            drapMapLayers: getDRAPHeatmapMapLayers?.(isZooming, darkMode),
            drapDeckLayers: createDRAPHeatmapLayers(filteredDrapPoints, isZooming),
          };

        case 'bitmap':
          return {
            drapGeoJson: getDRAPBitmapGeoJSON?.(filteredDrapPoints),
            drapMapLayers: getDRAPBitmapMapLayers?.(isZooming, darkMode),
            drapDeckLayers: createDRAPBitmapLayers(filteredDrapPoints, isZooming),
          };

        case 'filled-cells':
          return {
            drapGeoJson: getDRAPFilledCellsGeoJSON(filteredDrapPoints),
            drapMapLayers: getDRAPFilledCellsMapLayers(isZooming, darkMode),
            drapDeckLayers: [],
          };

        case 'contour-lines':
        default:
          return {
            drapGeoJson: getDRAPContourLinesGeoJSON(filteredDrapPoints),
            drapMapLayers: getDRAPContourLinesMapLayers(isZooming, darkMode),
            drapDeckLayers: [],
          };
      }
    } catch (error) {
      console.error(`DRAP implementation failed: ${drapImplementation}`, error);
      return { drapGeoJson: null, drapMapLayers: null, drapDeckLayers: [] };
    }
  }, [drapPoints, drapImplementation, isZooming, darkMode, drapRegionRange]);
  const deckLayers = useMemo(() => {

    const baseLayers = buildDeckLayers({
      filteredPlanes,
      filteredAirports,
      showAirports,
      showPlanes,
      darkMode,
      useImperial,
      selectedPlane,
      selectedAirport,
      isZooming,
      setSelectedPlane: (plane) => dispatch(setSelectedPlane(plane)),
      setSelectedAirport: (airport) => dispatch(setSelectedAirport(airport))
    });
    
    // Add DRAP deck.gl layers if using deck.gl-based implementation
    if (showDRAP && drapDeckLayers && drapDeckLayers.length > 0) {
      return [...drapDeckLayers, ...baseLayers];
    }
    
    return baseLayers;
  }, [
    dispatch,
    filteredAirports,
    showDRAP,
    filteredPlanes,
    showAirports,
    showPlanes,
    darkMode,
    useImperial,
    selectedPlane,
    selectedAirport,
    isZooming,
    drapDeckLayers
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
    '--ui-bg': darkMode ? 'rgba(30, 30, 30, 1)' : 'rgba(255, 255, 255, 1)',
    '--ui-text': darkMode ? '#ffffff' : '#000000',
    '--ui-border': darkMode ? '#555555' : '#cccccc',
    '--ui-shadow': '0 4px 12px rgba(0,0,0,0.3)',
  };

  return (
    <div style={{ ...themeVars, width: '100%', height: '100vh', position: 'relative', display: 'flex' }}>
      <Map
        {...viewState}
        onMove={handleViewStateChange}
        mapStyle={darkMode 
          ? 'https://tiles.stadiamaps.com/styles/stamen_toner.json'
          : 'https://tiles.stadiamaps.com/styles/stamen_toner_lite.json'
        }
        onClick={() => dispatch(clearSelections())}
      >
        {/* MapLibre-based DRAP implementations (filled-cells, contour-lines) */}
        {showDRAP && drapGeoJson && drapMapLayers && drapGeoJson.features?.length > 0 && (
          <Source id="drap-cells" type="geojson" data={drapGeoJson}>
            {drapMapLayers.map((layer) => (
              <Layer key={layer.id} {...layer} />
            ))}
          </Source>
        )}

        {/* Airports and Planes rendering */}
        <DeckGLOverlay
          layers={deckLayers}
          interleaved={true}
          getCursor={({ isDragging, isHovering }) =>
            isDragging ? 'grabbing' : (isHovering ? 'pointer' : 'grab')
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
            <div style={{ padding: '8px', minWidth: '150px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{selectedAirport.name}</h3>
              <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                <strong>Code:</strong> {selectedAirport.iata_code || selectedAirport.gps_code}<br/>
                <strong>Type:</strong>
                {selectedAirport.type.replace('_', ' ').split(' ').map(word => word.charAt(0)
                .toUpperCase() + word.slice(1)).join(' ')}<br/>
                <strong>Location:</strong> {selectedAirport.municipality || 'N/A'}, {selectedAirport.country}<br/>
                <strong>Elevation:</strong> {getAltDisplay(selectedAirport.elevation_ft, true, useImperial)}<br/>
                <strong>Position:</strong> {formatCoord(selectedAirport.lat)}°, {formatCoord(selectedAirport.lon)}°
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
            <div style={{ padding: '8px', minWidth: '180px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{selectedPlane.callsign || selectedPlane.icao24.toUpperCase()}</h3>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <strong>ICAO24:</strong> {selectedPlane.icao24.toUpperCase()}<br/>
                <strong>Altitude:</strong> {getAltDisplay(selectedPlane.geo_altitude, false, useImperial)}<br/>
                <strong>Speed:</strong> {getSpeedDisplay(selectedPlane.velocity, false, useImperial)}<br/>
                <strong>Heading:</strong> {formatNumber(selectedPlane.heading, 0, '°')}<br/>
                <strong>Position:</strong> {formatCoord(selectedPlane.lat)}°, {formatCoord(selectedPlane.lon)}°
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
          color: var(--ui-text) !important;
          font-size: 16px;
          padding: 4px 8px;
        }
        .maplibregl-popup-close-button:hover {
          background-color: transparent !important;
          opacity: 0.7;
        }
      `}</style>

      {/* Overlays */}
      <FilterPanel />
      <StatsPanel />
      <SettingsPanel />
      <AltitudeLegend />
    </div>
  );
};

export default PlaneTracker;