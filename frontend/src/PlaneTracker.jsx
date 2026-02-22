//Base imports
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// API imports
import { fetchPlanes, fetchDRAP, fetchAirports } from './api/api';

// Component imports
import DeckGLOverlay from './components/DeckGLOverlay';
import { MapController, MapClickHandler } from './components/MapEventHandlers';
import AltitudeLegend from './components/ui/AltitudeLegend';
import SettingsPanel from './components/ui/SettingsPanel';
import FilterPanel from './components/ui/FilterPanel';
import StatsPanel from './components/ui/StatsPanel';

// Utility imports
import { getAltFt, getAltDisplay, getSpeedDisplay, formatNumber, formatCoord } from './utils/mapUtils';
import { buildDeckLayers } from './utils/deckLayersConfig';

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
        setMapCenter({ lat: plane.lat, lon: plane.lon });
      }
    } else if (result.type === 'airport') {
      const airport = result.data;
      const lat = parseFloat(airport.latitude_deg);
      const lon = parseFloat(airport.longitude_deg);
      
      setSelectedAirport(airport);
      setSelectedPlane(null);
      setMapCenter({ lat, lon });
    }
  };

  const validPlanes = [];
  const highPlanes = [];
  const mediumPlanes = [];
  const lowPlanes = [];

  planes.forEach(p => {
    if (!p.lat || !p.lon) return;
    
    validPlanes.push(p);
    const altValue = useImperial ? getAltFt(p.geo_altitude) : p.geo_altitude;
    
    if (altValue > highThresh) {
      highPlanes.push(p);
    } else if (altValue >= lowThresh && altValue <= highThresh) {
      mediumPlanes.push(p);
    } else {
      lowPlanes.push(p);
    }
  });

  let filteredPlanes = validPlanes;
  if (filter === 'high') filteredPlanes = highPlanes;
  if (filter === 'medium') filteredPlanes = mediumPlanes;
  if (filter === 'low') filteredPlanes = lowPlanes;

  const deckLayers = buildDeckLayers({
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
  });

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', display: 'flex' }}>
      <MapContainer center={[30, 0]} zoom={3} minZoom={2} style={{ width: '100%', height: '100%', flex: 1 }} zoomControl={true} scrollWheelZoom={true} worldCopyJump={true}>
        <MapController centerPos={mapCenter} />
        <MapClickHandler clearSelections={() => { setSelectedPlane(null); setSelectedAirport(null); }} />
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url={darkMode ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />
        <DeckGLOverlay layers={deckLayers} />

        {/* Popups */}
        {showAirports && selectedAirport && (
          <Popup position={[parseFloat(selectedAirport.latitude_deg), parseFloat(selectedAirport.longitude_deg)]} onClose={() => setSelectedAirport(null)}>
            <div style={{ padding: '5px', color: '#333' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#000' }}>{selectedAirport.name}</h4>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <strong>Code:</strong> {selectedAirport.iata_code || selectedAirport.gps_code}<br/>
                <strong>Location:</strong> {selectedAirport.municipality || 'N/A'}, {selectedAirport.iso_country || ''}<br/>
                <strong>Elevation:</strong> {formatNumber(selectedAirport.elevation_ft, 0, ' ft')}<br/>
                <strong>Position:</strong><br/> {formatCoord(selectedAirport.latitude_deg)}°, {formatCoord(selectedAirport.longitude_deg)}°
              </div>
            </div>
          </Popup>
        )}
        {selectedPlane && filteredPlanes.includes(selectedPlane) && (
          <Popup position={[selectedPlane.lat, selectedPlane.lon]} onClose={() => setSelectedPlane(null)}>
            <div style={{ padding: '8px', minWidth: '180px', color: '#333' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#000' }}>{selectedPlane.callsign || selectedPlane.icao24.toUpperCase()}</h3>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <strong>ICAO24:</strong> {selectedPlane.icao24.toUpperCase()}<br/>
                <strong>Altitude:</strong> {getAltDisplay(selectedPlane.geo_altitude, useImperial)}<br/>
                <strong>Speed:</strong> {getSpeedDisplay(selectedPlane.velocity, useImperial)}<br/>
                <strong>Heading:</strong> {formatNumber(selectedPlane.heading, 0, '°')}<br/>
                <strong>Position:</strong><br/> {formatCoord(selectedPlane.lat)}°, {formatCoord(selectedPlane.lon)}°
              </div>
            </div>
          </Popup>
        )}
      </MapContainer>

      {/* Overlays */}
      <FilterPanel 
        darkMode={darkMode} useImperial={useImperial} filter={filter} setFilter={setFilter} 
        showAirports={showAirports} setShowAirports={setShowAirports} 
        counts={{ total: validPlanes.length, high: highPlanes.length, medium: mediumPlanes.length, low: lowPlanes.length, airports: airports.length }}
        searchProps={{ planes, airports, onSelect: handleSearchSelect }}
      />
      <StatsPanel darkMode={darkMode} planesCount={planes.length} drapCount={drapPoints.length} planesError={planesError} drapError={drapError} />
      <SettingsPanel darkMode={darkMode} setDarkMode={setDarkMode} useImperial={useImperial} setUseImperial={setUseImperial} showSettings={showSettings} setShowSettings={setShowSettings} />
      <AltitudeLegend darkMode={darkMode} useImperial={useImperial} />
    </div>
  );
};

export default PlaneTracker;