import { useSelector } from 'react-redux';

const StatsPanel = () => {
  const planesCount = useSelector((state) => state.planes.data.length);
  const drapCount = useSelector((state) => state.drap.points.length);
  const planesError = useSelector((state) => state.planes.error);
  const drapError = useSelector((state) => state.drap.error);

  return (
    <div style={{
      position: 'absolute',
      left: '10px',
      bottom: '10px',
      zIndex: 1000,
      backgroundColor: 'var(--ui-bg)',
      padding: '10px',
      borderRadius: '4px',
      boxShadow: 'var(--ui-shadow)',
      fontSize: '12px',
      color: 'var(--ui-text)'
    }}>
      <div><strong>Flights:</strong> {planesCount}</div>
      <div><strong>DRAP Points:</strong> {drapCount}</div>
      {planesError && <div style={{ color: 'red' }}>Flight Error: {planesError}</div>}
      {drapError && <div style={{ color: 'red' }}>DRAP Error: {drapError}</div>}
    </div>
  );
};
export default StatsPanel;