import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import planesData from './planesData.json'
const createPlaneIcon = (heading, altitude) => {
  const color = altitude > 36000 ? '#ff6b6b' : altitude > 30000 ? '#ffa500' : '#4ecdc4';
  
  return L.divIcon({
    className: 'custom-plane-icon',
    html: `
      <div style="transform: rotate(${heading}deg); width: 30px; height: 30px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

  const PlaneTracker = () => {
  const [planes, setPlanes] = useState(planesData);
  const [selectedPlane, setSelectedPlane] = useState(null);
  const [filter, setFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(false);

  const updatePlanes = (newPlaneData) => {
    setPlanes(newPlaneData);
  };

  const getFilteredPlanes = () => {
    switch (filter) {
      case 'high':
        return planes.filter(p => p.altitude > 36000);
      case 'medium':
        return planes.filter(p => p.altitude >= 30000 && p.altitude <= 36000);
      case 'low':
        return planes.filter(p => p.altitude < 30000);
      default:
        return planes;
    }
  };

  const filteredPlanes = getFilteredPlanes();

  const [solarFlare] = useState({
  center: [40, -85], // 500km
  radius: 900000, 
});

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', display: 'flex' }}>
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ width: '100%', height: '100%', flex: 1 }}
        zoomControl={true}
        scrollWheelZoom={true}
      >

        {darkMode ? (
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {filteredPlanes.map((plane) => (
          <Marker
            key={plane.id}
            position={[plane.lat, plane.lng]}
            icon={createPlaneIcon(plane.heading, plane.altitude)}
            eventHandlers={{
              click: () => setSelectedPlane(plane),
            }}
          >
            <Popup>
              <div style={{ padding: '8px', minWidth: '180px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                  {plane.id}
                </h3>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <strong>Altitude:</strong> {plane.altitude.toLocaleString()} ft<br/>
                  <strong>Speed:</strong> {plane.speed} knots<br/>
                  <strong>Heading:</strong> {Math.round(plane.heading)}°<br/>
                  <strong>Position:</strong><br/>
                  {plane.lat.toFixed(4)}°, {plane.lng.toFixed(4)}°
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <Circle
        center={solarFlare.center}
        radius={solarFlare.radius}
        pathOptions={{
          color: '#ff6600',
          fillColor: '#ff9933',
          fillOpacity: 0.3,
          weight: 2,
        }}
      />
      </MapContainer>


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