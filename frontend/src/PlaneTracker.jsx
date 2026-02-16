import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchPlanes, fetchDRAP, fetchAirports } from './api/api';
import './leaflet-heat-setup';
import 'leaflet.heat';
import SearchBar from './components/SearchBar';

const MapController = ({ centerPos }) => {
  const map = useMap();
  
  useEffect(() => {
    if (centerPos) {
      map.flyTo([centerPos.lat, centerPos.lon], 10, {
        duration: 1.5
      });
    }
  }, [centerPos, map]);

  return null;
};

// Safe number formatting helper
const formatNumber = (val, decimals = 0, suffix = '') => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${parseFloat(val).toFixed(decimals)}${suffix}`;
};

// Specific helper for coordinates
const formatCoord = (val) => {
  if (val === null || val === undefined) return 'N/A';
  const num = parseFloat(val);
  return isNaN(num) ? 'N/A' : num.toFixed(4);
};

// Component that renders DRAP data as a heatmap layer
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!points || points.length === 0) return;

    const heatPoints = points.map(([lat, lon, intensity]) => [lat, lon, intensity]);

    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: 20,
      blur: 30,
      maxZoom: 10,
      max: 1.0,
      minOpacity: 0.3,
      gradient: {
        0.0: 'blue',
        0.2: 'cyan',
        0.4: 'lime',
        0.6: 'yellow',
        0.8: 'orange',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
};

const createPlaneIcon = (heading, altitude, isSelected) => {
  const color = altitude > 36000 ? '#ff6b6b' : altitude > 30000 ? '#ffa500' : '#4ecdc4';
  const size = isSelected ? 50 : 30;
  const center = size / 2;
  const strokeAttrs = isSelected
    ? 'stroke="#000" stroke-width="2" stroke-linejoin="round"' 
    : '';
  
  return L.divIcon({
    className: 'custom-plane-icon',
    html: `
      <div style="transform: rotate(${heading}deg); width: ${size}px; height: ${size}px; transition: all 0.3s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" ${strokeAttrs}>
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [center, center],
    popupAnchor: [0, -center],
    zIndexOffset: isSelected ? 100000 : 0
  });
};

  const PlaneTracker = () => {
  const dispatch = useDispatch();
  const { data: planes, loading: planesLoading, error: planesError } = useSelector((state) => state.planes);
  const { points: drapPoints, loading: drapLoading, error: drapError } = useSelector((state) => state.drap);
  const { data: airports, loading: airportsLoading } = useSelector((state) => state.airports);
  
  const [selectedPlane, setSelectedPlane] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  const [filter, setFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(false);
  const [showAirports, setShowAirports] = useState(true);

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

  const getFilteredPlanes = () => {
    if (!planes || planes.length === 0) return [];
    
    switch (filter) {
      case 'high':
        return planes.filter(p => p.geo_altitude && p.geo_altitude > 36000);
      case 'medium':
        return planes.filter(p => p.geo_altitude && p.geo_altitude >= 30000 && p.geo_altitude <= 36000);
      case 'low':
        return planes.filter(p => p.geo_altitude && p.geo_altitude < 30000);
      default:
        return planes.filter(p => p.lat && p.lon); // Only show planes with valid coordinates
    }
  };

  const filteredPlanes = getFilteredPlanes();

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', display: 'flex' }}>
      <MapContainer
        center={[30, 0]}
        zoom={3}
        minZoom={2}
        style={{ width: '100%', height: '100%', flex: 1 }}
        zoomControl={true}
        scrollWheelZoom={true}
        worldCopyJump={true}
        maxBounds={[[-90, -Infinity], [90, Infinity]]}
        maxBoundsViscosity={1.0}
      >
        <MapController centerPos={mapCenter} />
        {darkMode ? (
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            noWrap={false}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            noWrap={false}
          />
        )}

        {/* Render DRAP heatmap */}
        {drapPoints && drapPoints.length > 0 && <HeatmapLayer points={drapPoints} />}

        {/* Airports Layer*/}
        {showAirports && airports.map((airport) => {
          const isSelected = selectedAirport && selectedAirport.id === airport.id;
          return (
           <CircleMarker
              key={airport.id}
              center={[parseFloat(airport.latitude_deg), parseFloat(airport.longitude_deg)]}
              ref={(node) => {
                if (node && isSelected) {
                  node.openPopup();
                }
              }}
              pathOptions={{ 
                color: isSelected ? 'red' : (darkMode ? '#a8a8a8' : '#555'), 
                fillColor: isSelected ? 'red' : (darkMode ? '#a8a8a8' : '#555'), 
                fillOpacity: isSelected ? 0.8 : 0.6,
                weight: isSelected ? 3 : 1
              }}
              radius={airport.type === 'large_airport' ? 5 : 3}
              eventHandlers={{
                click: () => {
                  setSelectedAirport(airport);
                  setSelectedPlane(null);
                }
              }}
            >
              <Popup>
                <div style={{ padding: '5px', color: '#333' }}> {/* Added text color */}
                  <h4 style={{ margin: '0 0 5px 0', color: '#000' }}>{airport.name}</h4>
                  <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    <strong>Code:</strong> {airport.iata_code || airport.gps_code || 'N/A'}<br/>
                    <strong>Location:</strong> {airport.municipality || 'N/A'}, {airport.iso_country || ''}<br/>
                    <strong>Elevation:</strong> {formatNumber(airport.elevation_ft, 0, ' ft')}<br/>
                    <strong>Position:</strong><br/>
                    {formatCoord(airport.latitude_deg)}°, {formatCoord(airport.longitude_deg)}°
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Planes */}
        {filteredPlanes.map((plane) => {
          const isSelected = selectedPlane && selectedPlane.icao24 === plane.icao24;
          
          return (
            <Marker
              key={plane.icao24}
              position={[plane.lat, plane.lon]}
              icon={createPlaneIcon(plane.heading || 0, plane.geo_altitude || 0, isSelected)}
              ref={(node) => {
                if (node && isSelected) {
                  node.openPopup();
                }
              }}
              eventHandlers={{
                click: () => {
                  setSelectedPlane(plane);
                  setSelectedAirport(null);
                }
              }}
            >
               <Popup>
                <div style={{ padding: '8px', minWidth: '180px', color: '#333' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#000' }}>
                    {plane.callsign || plane.icao24}
                  </h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <strong>ICAO24:</strong> {plane.icao24}<br/>
                    <strong>Baro Altitude:</strong> {formatNumber(plane.geo_altitude, 0, ' ft')}<br/>
                    <strong>Ground Speed:</strong> {formatNumber(plane.speed, 1, ' knots')}<br/>
                    <strong>Heading:</strong> {formatNumber(plane.heading, 0, '°')}<br/>
                    <strong>Position:</strong><br/>
                    {formatCoord(plane.lat)}°, {formatCoord(plane.lon)}°
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div style={{
        position: 'absolute',
        left: '10px',
        top: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Search Bar */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          borderRadius: '4px', 
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)' 
        }}>
          <SearchBar 
            planes={planes} 
            airports={airports} 
            onSelect={handleSearchSelect} 
          />
        </div>

        {/* Filter Controls */}
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold', color: '#000' }}>Filter:</div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '5px', borderRadius: '3px', width: '100%' }}>
            <option value="all">All Planes ({filteredPlanes.length})</option>
            <option value="high">High Alt (&gt;36k)</option>
            <option value="medium">Med Alt (30k-36k)</option>
            <option value="low">Low Alt (&lt;30k)</option>
          </select>
          <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#000' }}>
              <input 
                type="checkbox" 
                checked={showAirports} 
                onChange={() => setShowAirports(!showAirports)}
                style={{ marginRight: '8px' }}
              />
              Show Airports ({airports.length})
            </label>
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div style={{
        position: 'absolute',
        left: '10px',
        bottom: '10px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        fontSize: '12px',
      }}>
        <div><strong>Flights:</strong> {planes.length}</div>
        <div><strong>DRAP Points:</strong> {drapPoints.length}</div>
        {planesError && <div style={{ color: 'red' }}>Flight Error: {planesError}</div>}
        {drapError && <div style={{ color: 'red' }}>DRAP Error: {drapError}</div>}
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: 'absolute',
          right: '10px',
          top: '10px',
          zIndex: 1000,
          width: '30px',
          height: '45px',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
        }}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f4f4f4';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
    </div>
  );
};

export default PlaneTracker;