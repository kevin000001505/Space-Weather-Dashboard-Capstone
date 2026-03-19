import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useSelector } from 'react-redux';
import { getAltDisplay, capitalizeWords } from '../../utils/mapUtils';

const getCenteredPosition = (width = 340, height = 250) => {
  const x = 40;
  const randomOffset = Math.floor(Math.random() * (400 - 80 + 1)) + 80;
  const y = randomOffset;
  return { x, y };
};

const AirportDetailsPanel = ({ airport, onClose, children, useImperial }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const hoveredRunwayId = useSelector((state) => state.ui.hoveredRunwayId);

  const getCoords = () => {
    if (airport.geom && airport.geom.coordinates) {
      return `${airport.geom.coordinates[1].toFixed(4)}°, ${airport.geom.coordinates[0].toFixed(4)}°`;
    }
    return 'N/A';
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const headerStyle = {
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 6px',
    borderBottom: '1px solid var(--ui-border)',
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    fontWeight: '500'
  };

  const contentStyle = {
    padding: '10px 8px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderBottom: '1px solid var(--ui-border)',
    fontSize: '12px'
  };

  // Hex equivalents of the DeckGL RGB palette
  const RUNWAY_PALETTE = [
    '#ff8c00', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#1abc9c', '#ff69b4'
  ];

  const getRunwayColor = (isClosed, index) => {
    if (isClosed) return '#ff3333'; // Red
    return RUNWAY_PALETTE[index % RUNWAY_PALETTE.length];
  };

  return (
    <Rnd
      default={{
        ...getCenteredPosition(),
        width: 340, // Made slightly wider to fit the new side-by-side data
        height: 'auto',
      }}
      minWidth={320}
      bounds="window"
      dragHandleClassName="airport-details-title"
      enableResizing={{
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      }}
      style={{
        zIndex: 1000,
        background: 'var(--ui-bg)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        position: 'absolute',
        color: 'var(--ui-text)',
        border: '1px solid var(--ui-border)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
      }}
    >
      {/* Wrapper div to control internal padding and prevent horizontal scroll */}
      <div style={{ 
        padding: '16px', 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        boxSizing: 'border-box',
        width: '100%',
        height: '100%'
      }}>
        
        <div style={{ position: 'sticky', top: 0, float: 'right', zIndex: 4001 }}>
          <IconButton
            size="small"
            aria-label="close"
            onClick={() => onClose(airport.ident)}
            sx={{
              color: "#fff",
              backgroundColor: "#d32f2f",
              border: "1px solid #d32f2f",
              "&:hover": { backgroundColor: "#b71c1c" },
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        <h4 
          className="airport-details-title" 
          style={{ 
            cursor: 'move', 
            margin: 0, 
            marginBottom: 8, 
            borderBottom: '1px solid var(--ui-border)', 
            paddingBottom: 6, 
            color: 'var(--ui-text)',
            paddingRight: '30px',
            wordWrap: 'break-word'
          }}
        >
          {airport.iata_code?.toUpperCase()} - {airport.name}
        </h4>

        {/* Extended Airport Details */}
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--ui-text)', marginBottom: '12px' }}>
          <strong>Location:</strong> {airport.municipality || 'N/A'}, {airport.region_name || 'N/A'}, {airport.country_name || 'N/A'}<br/>
          <strong>Type:</strong> {capitalizeWords(airport.type)} {airport.scheduled_service ? '(Scheduled Service)' : ''}<br/>
          <strong>Codes:</strong> IATA: {airport.iata_code || '-'} | ICAO: {airport.icao_code || '-'} | GPS: {airport.gps_code || '-'}<br/>
          <strong>Elevation:</strong> {getAltDisplay(airport.elevation_ft, true, useImperial)}<br/>
          <strong>Coordinates:</strong> {getCoords()}<br/>
          
          {/* Links & Meta */}
          <div style={{ marginTop: '4px', fontSize: '12px' }}>
            {airport.home_link && <><a href={airport.home_link} target="_blank" rel="noreferrer" style={{ color: '#1976d2' }}>Official Website</a> • </>}
            {airport.wikipedia_link && <a href={airport.wikipedia_link} target="_blank" rel="noreferrer" style={{ color: '#1976d2' }}>Wikipedia</a>}
            {airport.keywords && <div style={{ color: 'var(--ui-border)', fontStyle: 'italic', marginTop: '2px' }}>Keywords: {airport.keywords}</div>}
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--ui-text)' }}>
          <strong style={{ display: 'block', marginBottom: '6px' }}>Infrastructure Details:</strong>
          
          {/* RUNWAYS */}
          <div style={headerStyle} onClick={() => toggleSection('runways')}>
            <span>🛣️ Runways ({airport.runways?.length || 0})</span>
            <span>{expandedSection === 'runways' ? '▼' : '▶'}</span>
          </div>
          {expandedSection === 'runways' && (
            <div style={contentStyle}>
              {airport.runways?.length > 0 ? airport.runways.map((r, index) => {
                const runwayColor = getRunwayColor(r.closed, index);
                const isHovered = r.id === hoveredRunwayId;

                // Dynamic style object that triggers when hovered
                const highlightStyle = isHovered ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  outline: `2px solid ${runwayColor}`,
                  boxShadow: `0 0 12px ${runwayColor}`,
                  transform: 'scale(1.02)',
                  transition: 'all 0.2s ease-in-out',
                  zIndex: 10,
                  position: 'relative',
                  borderRadius: '6px'
                } : {
                  transition: 'all 0.2s ease-in-out'
                };

                return (
                  <div key={r.id} style={{ marginBottom: '12px', padding: '8px', borderBottom: '1px solid rgba(128,128,128,0.2)', ...highlightStyle }}>
                    <div style={{ marginBottom: '6px' }}>
                      <strong style={{ color: runwayColor, fontSize: '14px' }}>
                        {r.le_ident || '?'} / {r.he_ident || '?'}
                      </strong> 
                      <span style={{ marginLeft: '8px', color: 'var(--ui-border)' }}>
                        {r.length_ft || '?'}x{r.width_ft || '?'}ft • {r.surface || 'Unknown'} 
                        <span style={{ marginLeft: '6px' }}>{r.lighted ? '💡 Lit' : '🌑 Unlit'}</span>
                      </span>
                      {r.closed && <span style={{ color: '#ff3333', marginLeft: '6px', fontWeight: 'bold' }}>(CLOSED)</span>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', backgroundColor: 'rgba(128,128,128,0.05)', padding: '6px', borderRadius: '4px' }}>
                      <div style={{ flex: 1 }}>
                        <strong>Low End ({r.le_ident || '-'})</strong><br/>
                        Heading: {r.le_heading_degt ? `${r.le_heading_degt}°` : '-'}<br/>
                        Elev: {r.le_elevation_ft ? `${r.le_elevation_ft} ft` : '-'}<br/>
                        Disp. Threshold: {r.le_displaced_threshold_ft ? `${r.le_displaced_threshold_ft} ft` : '-'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong>High End ({r.he_ident || '-'})</strong><br/>
                        Heading: {r.he_heading_degt ? `${r.he_heading_degt}°` : '-'}<br/>
                        Elev: {r.he_elevation_ft ? `${r.he_elevation_ft} ft` : '-'}<br/>
                        Disp. Threshold: {r.he_displaced_threshold_ft ? `${r.he_displaced_threshold_ft} ft` : '-'}
                      </div>
                    </div>
                  </div>
                );
              }) : <div>No runway data available.</div>}
            </div>
          )}

          {/* FREQUENCIES */}
          <div style={headerStyle} onClick={() => toggleSection('freqs')}>
            <span>📻 Frequencies ({airport.frequencies?.length || 0})</span>
            <span>{expandedSection === 'freqs' ? '▼' : '▶'}</span>
          </div>
          {expandedSection === 'freqs' && (
            <div style={contentStyle}>
              {airport.frequencies?.length > 0 ? airport.frequencies.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px dashed rgba(128,128,128,0.2)' }}>
                  <span title={f.description}><strong>{f.type}</strong> <span style={{fontSize: '10px', color: 'var(--ui-border)'}}>{f.description}</span></span>
                  <strong>{f.frequency_mhz} MHz</strong>
                </div>
              )) : <div>No frequency data available.</div>}
            </div>
          )}

          {/* NAVAIDS */}
          <div style={{ ...headerStyle }} onClick={() => toggleSection('navaids')}>
            <span>📡 Navaids ({airport.navaids?.length || 0})</span>
            <span style={{ color: 'var(--ui-text)' }}>{expandedSection === 'navaids' ? '▼' : '▶'}</span>
          </div>
          {expandedSection === 'navaids' && (
            <div style={contentStyle}>
              {airport.navaids?.length > 0 ? airport.navaids.map(n => (
                <div key={n.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
                  <div style={{ marginBottom: '4px' }}>
                    {/* Cyan for the main navaid title */}
                    <strong style={{ color: '#00c8ff' }}>{n.ident}</strong> ({n.type}) - {n.name} <span style={{fontSize: '10px'}}>[{n.iso_country}]</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px', color: 'var(--ui-border)' }}>
                    <div><strong style={{ color: '#00c8ff' }}>Main Freq:</strong> {n.frequency_khz ? `${(n.frequency_khz / 1000).toFixed(2)} MHz` : '-'}</div>
                    <div><strong>Elevation:</strong> {getAltDisplay(n.elevation_ft, true, useImperial)}</div>
                    
                    {/* Purple for all the DME specific data */}
                    <div><strong style={{ color: '#9c27b0' }}>DME Freq:</strong> {n.dme_frequency_khz ? `${(n.dme_frequency_khz / 1000).toFixed(2)} MHz` : '-'}</div>
                    <div><strong style={{ color: '#9c27b0' }}>DME Chan:</strong> {n.dme_channel || '-'}</div>
                    <div><strong style={{ color: '#9c27b0' }}>DME Elev:</strong> {getAltDisplay(n.dme_elevation_ft, true, useImperial)}</div>
                    
                    <div><strong>Power:</strong> {n.power || '-'}</div>
                    <div><strong>Usage:</strong> {n.usagetype || '-'}</div>
                    <div><strong>Mag Var:</strong> {n.magnetic_variation_deg ? `${n.magnetic_variation_deg}°` : '-'}</div>
                    <div><strong>Slaved Var:</strong> {n.slaved_variation_deg ? `${n.slaved_variation_deg}°` : '-'}</div>
                  </div>
                </div>
              )) : <div>No local navaid data available.</div>}
            </div>
          )}

          {/* COMMENTS */}
          <div style={headerStyle} onClick={() => toggleSection('comments')}>
            <span>💬 Comments ({airport.comments?.length || 0})</span>
            <span>{expandedSection === 'comments' ? '▼' : '▶'}</span>
          </div>
          {expandedSection === 'comments' && (
            <div style={contentStyle}>
              {airport.comments?.length > 0 ? airport.comments.map(c => (
                <div key={c.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
                  <strong>{c.subject || 'No Subject'}</strong>
                  <br/><span style={{ color: 'var(--ui-border)', fontSize: '10px' }}>By {c.author} on {c.date ? new Date(c.date).toLocaleDateString() : 'Unknown'}</span>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap', fontStyle: 'italic', backgroundColor: 'rgba(128,128,128,0.05)', padding: '6px', borderRadius: '4px' }}>"{c.body}"</p>
                </div>
              )) : <div>No comments available.</div>}
            </div>
          )}
        </div>

        {children}
      </div>
    </Rnd>
  );
};

export default AirportDetailsPanel;