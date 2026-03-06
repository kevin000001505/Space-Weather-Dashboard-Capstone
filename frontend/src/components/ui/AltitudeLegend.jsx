import { getStops } from '../../utils/mapUtils';
import { useSelector } from 'react-redux';

const AltitudeLegend = () => {
  const useImperial = useSelector((state) => state.ui.useImperial);

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      padding: '12px 20px',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '500px',
      transition: 'background-color 0.3s ease',
      backgroundColor: 'var(--ui-bg)',
      color: 'var(--ui-text)',
      boxShadow: 'var(--ui-shadow)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', alignSelf: 'flex-start' }}>
        ALTITUDE ({useImperial ? 'ft' : 'm'})
      </div>
      
      {/* Gradient Bar */}
      <div style={{
        width: '100%',
        height: '14px',
        border: 'var(--ui-border)',
        borderRadius: '2px',
        background: `linear-gradient(to right, ${
          getStops(useImperial).map((s, idx, arr) =>
            `rgb(${s.color.join(',')}) ${(idx / (arr.length - 1)) * 100}%`
          ).join(', ')
        })`
      }} />
      
      {/* Gradient Text Labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: '6px',
        fontSize: '11px',
        fontWeight: '500'
      }}>
        {getStops(useImperial).map((s, idx, arr) => (
          <span key={idx} style={{
            transform: idx === 0 ? 'translateX(0)' : idx === arr.length - 1 ? 'translateX(0)' : 'translateX(-50%)'
          }}>
            {s.val >= 1000 ? `${s.val / 1000}k` : s.val}
            {idx === arr.length - 1 ? '+' : ''}
          </span>
        ))}
      </div>
    </div>
  );
};
export default AltitudeLegend;