import React, { useState, useEffect } from 'react';

const SearchBar = ({ planes, airports, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Debounce search to avoid lagging while typing
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      
      // Search Planes (limit to 5)
      const planeMatches = planes
        .filter(p =>
          (p.callsign && p.callsign.toLowerCase().includes(lowerQuery)) ||
          (p.icao24 && p.icao24.toLowerCase().includes(lowerQuery))
        )
        .slice(0, 5)
        .map(p => ({ type: 'plane', data: p }));

      // Search Airports (limit to 5)
      const airportMatches = airports
        .filter(a =>
          (a.name && a.name.toLowerCase().includes(lowerQuery)) ||
          (a.iata_code && a.iata_code.toLowerCase().includes(lowerQuery)) ||
          (a.municipality && a.municipality.toLowerCase().includes(lowerQuery))
        )
        .slice(0, 5)
        .map(a => ({ type: 'airport', data: a }));

      setResults([...planeMatches, ...airportMatches]);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, planes, airports]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '250px', marginBottom: '10px' }}>
      <input
        type="text"
        placeholder="Search flight or airport..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          boxSizing: 'border-box',
          color: '#333',
          backgroundColor: 'white'
        }}
      />
      
      {isOpen && results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '0 0 4px 4px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 2000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {results.map((item, index) => (
            <li
              key={index}
              onClick={() => handleSelect(item)}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#333'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.color = 'black';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#333';
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>
                  {item.type === 'plane'
                    ? (item.data.callsign || item.data.icao24)
                    : (item.data.iata_code || item.data.gps_code)}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {item.type === 'plane'
                    ? `Flight • ${item.data.geo_altitude || 0} ft`
                    : `${item.data.name}`}
                </div>
              </div>
              <span style={{
                fontSize: '10px',
                padding: '2px 4px',
                borderRadius: '3px',
                backgroundColor: item.type === 'plane' ? '#e3f2fd' : '#e8f5e9',
                color: item.type === 'plane' ? '#1565c0' : '#2e7d32'
              }}>
                {item.type === 'plane' ? '✈️' : '📍'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;