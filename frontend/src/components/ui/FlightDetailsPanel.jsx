import React from 'react';
import { Rnd } from 'react-rnd';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch } from 'react-redux';
import { getAltDisplay, getSpeedDisplay, formatCoord } from '../../utils/mapUtils';

const getCenteredPosition = (width = 250, height = 180) => {
  const x = 20;
    const randomOffset = Math.floor(Math.random() * (500 - 80 + 1)) + 80;
    const y = randomOffset;
  return { x, y };
};

const FlightDetailsPanel = ({ flight, onClose, children, useImperial }) => {
    const dispatch = useDispatch();
  return (
    <Rnd
      default={{
        ...getCenteredPosition(),
        width: 250,
        height: 180,
      }}
      minWidth={250}
      minHeight={180}
      bounds="window"
      dragHandleClassName="flight-details-title"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      style={{
        zIndex: 1000,
        background: 'var(--ui-bg)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        padding: 16,
        position: 'absolute',
        color: 'var(--ui-text)', // Ensure text color is always visible
        border: '1px solid var(--ui-border)',
      }}
    >
      <div>
            <IconButton
              size="small"
              aria-label="close"
                onClick={() => onClose(flight.icao24)}
              sx={{
                position: "absolute",
                top: 4,
                right: 6,
                zIndex: 4000,
                color: "#fff",
                backgroundColor: "#d32f2f",
                border: "1px solid #d32f2f",
                "&:hover": {
                  backgroundColor: "#b71c1c",
                },
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
        <h4 className="flight-details-title" style={{ cursor: 'move', margin: 0, marginBottom: 6, borderBottom: '1px solid var(--ui-border)', paddingBottom: 3, color: 'var(--ui-text)' }}>
          {flight.callsign || flight.icao24?.toUpperCase()} - Flight Details
        </h4>
        <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ui-text)' }}>
          <strong>ICAO24:</strong> {flight.icao24?.toUpperCase() || 'N/A'}<br/>
          <strong>Altitude:</strong> {getAltDisplay(flight.geo_altitude, false, useImperial)}<br/>
          <strong>Speed:</strong> {getSpeedDisplay(flight.velocity, false, useImperial)}<br/>
          <strong>Heading:</strong> {formatCoord(flight.heading)}<br/>
          <strong>Position:</strong> {formatCoord(flight.lat)}, {formatCoord(flight.lon)}<br/>
        </div>
        {/* Show flight path info if available */}
        {typeof flightPath !== 'undefined' && flightPath && flightPath.path_geojson && (
          <div style={{ marginTop: 12, color: 'var(--ui-text)' }}>
            <strong>Flight Path:</strong><br/>
            <span>Path points: {flightPath.path_geojson.coordinates.length}</span>
          </div>
        )}
        {children}
      </div>
    </Rnd>
  );
};

export default FlightDetailsPanel;
