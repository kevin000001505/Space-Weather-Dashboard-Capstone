import SearchBar from './SearchBar';

const FilterPanel = ({ useImperial, filter, setFilter, showAirports, setShowAirports, counts, searchProps }) => {
  const panelStyle = {
    backgroundColor: 'var(--ui-bg)',
    padding: '10px',
    borderRadius: '4px',
    boxShadow: 'var(--ui-shadow)'
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
      color: 'var(--ui-text)' 
    }}
    >
      <div style={panelStyle}>
        <SearchBar planes={searchProps.planes} airports={searchProps.airports} onSelect={searchProps.onSelect} />
      </div>
      <div style={panelStyle}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Filter:</div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '5px', borderRadius: '3px', width: '100%', color: 'var(--ui-text)', backgroundColor: 'var(--ui-bg)', border: 'var(--ui-border)' }}>
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