import SearchBar from '../SearchBar';

const FilterPanel = ({ darkMode, useImperial, filter, setFilter, showAirports, setShowAirports, counts, searchProps }) => {
  const panelStyle = {
    backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.6)',
    padding: '10px',
    borderRadius: '4px',
    boxShadow: '0 1px 5px rgba(0,0,0,0.4)'
  };

  return (
    <div style={{
      position: 'absolute',
      left: '50px',
      top: '10px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      color: darkMode ? '#fff' : '#000' 
    }}
    >
      <div style={panelStyle}>
        <SearchBar planes={searchProps.planes} airports={searchProps.airports} onSelect={searchProps.onSelect} />
      </div>
      <div style={panelStyle}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Filter:</div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '5px', borderRadius: '3px', width: '100%', color: darkMode ? '#fff' : '#333' }}>
          <option value="all">All Planes ({counts.total})</option>
          <option value="high">High Alt ({useImperial ? '>36k ft' : '>11 km'}) ({counts.high})</option>
          <option value="medium">Med Alt ({useImperial ? '30k-36k ft' : '9k-11 km'}) ({counts.medium})</option>
          <option value="low">Low Alt ({useImperial ? '<30k ft' : '<9 km'}) ({counts.low})</option>
        </select>
        <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAirports} onChange={() => setShowAirports(!showAirports)} style={{ marginRight: '8px' }} />
            Show Airports ({counts.airports})
          </label>
        </div>
      </div>
    </div>
  );
};
export default FilterPanel;