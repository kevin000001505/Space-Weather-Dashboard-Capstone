import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../store/slices/planesSlice";

const SettingsPanel = ({ darkMode, setDarkMode, useImperial, setUseImperial, showSettings, setShowSettings }) => {
  
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector(state => state.planes.isSidebarOpen);

  const handleSidebar = (value) => {
    console.log(value);
    dispatch(toggleSidebar(value))
  }

  const btnStyle = {
    width: '45px', height: '45px',
    border: '1px solid var(--ui-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--ui-bg)',
    color: 'var(--ui-text)',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '20px',
    boxShadow: 'var(--ui-shadow)',
    backdropFilter: 'blur(4px)'
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
        <button onClick={() => handleSidebar(true)} style={btnStyle} title="Toggle Filters">☰</button>
      </div>
      {showSettings && (
        <div style={{
          backgroundColor: 'var(--ui-bg)',
          color: 'var(--ui-text)',
          border: 'var(--ui-border)',
          boxShadow: 'var(--ui-shadow)',
          backdropFilter: 'blur(4px)',
          padding: '15px',
          borderRadius: '4px',
          minWidth: '180px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--ui-border)', paddingBottom: '5px' }}>Settings</h4>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={useImperial}
              onChange={() => setUseImperial(!useImperial)}
              style={{ marginRight: '8px' }}
            />
            Use Imperial
          </label>
          <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
            Active units: {useImperial ? '(ft, knots)' : '(m, m/s)'}
          </div>
        </div>
      )}
    </div>
  );
};
export default SettingsPanel;