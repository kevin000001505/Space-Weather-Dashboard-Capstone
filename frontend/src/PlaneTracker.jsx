//Base imports
import { useState, useEffect, useMemo } from 'react';
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
  const { data: planes, loading: planesLoading, error: planesError } = useSelector((state) => state.planes);
  const { points: drapPoints, loading: drapLoading, error: drapError } = useSelector((state) => state.drap);
  const { data: airports, loading: airportsLoading } = useSelector((state) => state.airports);
  
  const [useImperial, setUseImperial] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPlane, setSelectedPlane] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [filter, setFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(false);
  const [showAirports, setShowAirports] = useState(true);

  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 30,
    zoom: 3,
    pitch: 0,
    bearing: 0
  });

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

  const handleSearchSelect = (result) => {
    if (result.type === 'plane') {
      const plane = result.data;
      if (plane.lat && plane.lon) {
        setSelectedPlane(plane);
        setSelectedAirport(null);
        setViewState({
          ...viewState,
          longitude: plane.lon,
          latitude: plane.lat,
          zoom: 10,
          transitionDuration: 1500
        });
      }
    } else if (result.type === 'airport') {
      const airport = result.data;
      const lat = parseFloat(airport.lat);
      const lon = parseFloat(airport.lon);
      
      setSelectedAirport(airport);
      setSelectedPlane(null);
      setViewState({
        ...viewState,
        longitude: parseFloat(airport.lon),
        latitude: parseFloat(airport.lat),
        zoom: 10,
        transitionDuration: 1500
      });
    }
  };

  const { filteredPlanes, counts } = useMemo(() => {
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

    return {
      filteredPlanes: activePlanes,
      counts: { 
        total: valid.length,
        high: high.length,
        medium: med.length,
        low: low.length,
        airports: airports.length
      }
    };
  }, [planes, filter, useImperial, highThresh, lowThresh, airports.length]);

  const deckLayers = useMemo(() => buildDeckLayers({
    drapPoints,
    airports,
    filteredPlanes,
    showAirports,
    darkMode,
    useImperial,
    selectedPlane,
    selectedAirport,
    setSelectedPlane,
    setSelectedAirport
  }), [
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
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={darkMode 
          ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
          : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
        }
        onClick={() => {
          setSelectedPlane(null);
          setSelectedAirport(null);
        }}
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
            onClose={() => setSelectedAirport(null)}
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
            onClose={() => setSelectedPlane(null)}
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
      <FilterPanel 
        useImperial={useImperial} filter={filter} setFilter={setFilter} 
        showAirports={showAirports} setShowAirports={setShowAirports} 
        counts={counts}
        searchProps={{ planes, airports, onSelect: handleSearchSelect }}
      />
      <StatsPanel planesCount={planes.length} drapCount={drapPoints.length} planesError={planesError} drapError={drapError} />
      <SettingsPanel darkMode={darkMode} setDarkMode={setDarkMode} useImperial={useImperial} setUseImperial={setUseImperial} showSettings={showSettings} setShowSettings={setShowSettings} />
      <AltitudeLegend useImperial={useImperial} />
    </div>
  );
};

export default PlaneTracker;