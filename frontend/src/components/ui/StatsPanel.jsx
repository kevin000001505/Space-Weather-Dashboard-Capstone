const StatsPanel = ({ darkMode, planesCount, drapCount, planesError, drapError }) => {
  return (
    <div style={{
      position: 'absolute',
      left: '10px',
      bottom: '10px',
      zIndex: 1000,
      backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      padding: '10px',
      borderRadius: '4px',
      boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
      fontSize: '12px',
      color: darkMode ? '#fff' : '#333'
    }}>
      <div><strong>Flights:</strong> {planesCount}</div>
      <div><strong>DRAP Points:</strong> {drapCount}</div>
      {planesError && <div style={{ color: 'red' }}>Flight Error: {planesError}</div>}
      {drapError && <div style={{ color: 'red' }}>DRAP Error: {drapError}</div>}
    </div>
  );
};
export default StatsPanel;