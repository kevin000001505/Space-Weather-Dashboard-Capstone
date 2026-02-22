const SettingsPanel = ({ darkMode, setDarkMode, useImperial, setUseImperial, showSettings, setShowSettings }) => {
  const btnStyle = {
    width: '45px',
    height: '45px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    boxShadow: '0 1px 5px rgba(0,0,0,0.4)'
  };

  return (
    <div style={{
      position: 'absolute',
      right: '10px',
      top: '10px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '10px'
      }}
    >
      <div style={{ display: 'flex', gap: '5px' }}>
        <button onClick={() => setShowSettings(!showSettings)} style={btnStyle} title="Settings">⚙️</button>
        <button onClick={() => setDarkMode(!darkMode)} style={btnStyle} title="Toggle Theme">{darkMode ? '☀️' : '🌙'}</button>
      </div>
      {showSettings && (
        <div style={{
          backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.6)', padding: '15px', borderRadius: '4px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: darkMode ? '#fff' : '#333', border: '1px solid #ccc', minWidth: '180px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Settings</h4>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
            <input type="checkbox" checked={useImperial} onChange={() => setUseImperial(!useImperial)} style={{ marginRight: '8px' }} /> Use Imperial (ft, knots)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}>
            <input type="checkbox" checked={!useImperial} onChange={() => setUseImperial(!useImperial)} style={{ marginRight: '8px' }} /> Use Metric (m, m/s)
          </label>
        </div>
      )}
    </div>
  );
};
export default SettingsPanel;