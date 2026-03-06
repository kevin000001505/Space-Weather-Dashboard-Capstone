//Base imports
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// MapLibre imports
import { MapboxOverlay } from '@deck.gl/mapbox';
import Map, { Popup, useControl } from 'react-map-gl/maplibre';
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
} from './store/slices/uiSlice';

// Utility imports
import { getAltFt, getAltDisplay, getSpeedDisplay, formatNumber, formatCoord } from './utils/mapUtils';
import { buildDeckLayers } from './utils/deckLayersConfig';

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
    filter,
    darkMode,
    showAirports,
    viewState,
  } = useSelector((state) => state.ui);

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
      valid.push(p);
      const altValue = useImperial ? getAltFt(p.geo_altitude) : p.geo_altitude;
      
      if (altValue > highThresh) high.push(p);
      else if (altValue >= lowThresh && altValue <= highThresh) med.push(p);
      else low.push(p);
    });

    let activePlanes = valid;
    if (filter === 'high') activePlanes = high;
    if (filter === 'medium') activePlanes = med;
    if (filter === 'low') activePlanes = low;

    return activePlanes;
  }, [planes, filter, useImperial, highThresh, lowThresh]);

  const deckLayers = useMemo(() => buildDeckLayers({
    drapPoints,
    airports,
    filteredPlanes,
    showAirports,
    darkMode,
    useImperial,
    selectedPlane,
    selectedAirport,
    setSelectedPlane: (plane) => dispatch(setSelectedPlane(plane)),
    setSelectedAirport: (airport) => dispatch(setSelectedAirport(airport))
  }), [
    dispatch,
    drapPoints,
    airports,
    filteredPlanes,
    showAirports,
    darkMode,
    useImperial,
    selectedPlane,
    selectedAirport
  ]);

  const themeVars = {
    '--ui-bg': darkMode ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.75)',
    '--ui-text': darkMode ? '#ffffff' : '#000000',
    '--ui-border': darkMode ? '#555555' : '#cccccc',
    '--ui-shadow': '0 4px 12px rgba(0,0,0,0.3)',
  };

  return (
    <div style={{ ...themeVars, width: '100%', height: '100vh', position: 'relative', display: 'flex' }}>
      <Map
        {...viewState}
        onMove={(evt) => dispatch(setViewState(evt.viewState))}
        mapStyle={darkMode 
          ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
          : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
        }
        onClick={() => dispatch(clearSelections())}
      >
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
            anchor="bottom"
            offset={15}
          >
            <div style={{ padding: '5px' }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{selectedAirport.name}</h4>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <strong>Code:</strong> {selectedAirport.iata_code || selectedAirport.gps_code}<br/>
                <strong>Location:</strong> {selectedAirport.municipality || 'N/A'}, {selectedAirport.iso_country || ''}<br/>
                <strong>Elevation:</strong> {getAltDisplay(selectedAirport.elevation_ft, true, useImperial)}<br/>
                <strong>Position:</strong><br/> {formatCoord(selectedAirport.lat)}°, {formatCoord(selectedAirport.lon)}°
              </div>
            </div>
          </Popup>
        )}

        {selectedPlane && filteredPlanes.includes(selectedPlane) && (
          <Popup 
            longitude={selectedPlane.lon} 
            latitude={selectedPlane.lat} 
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
                <strong>Position:</strong><br/> {formatCoord(selectedPlane.lat)}°, {formatCoord(selectedPlane.lon)}°
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
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
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