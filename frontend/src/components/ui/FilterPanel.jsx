import SearchBar from './SearchBar';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilter, setShowAirports } from '../../store/slices/uiSlice';
import { getAltFt } from '../../utils/mapUtils';

const FilterPanel = () => {
  const dispatch = useDispatch();
  const planes = useSelector((state) => state.planes.data);
  const airports = useSelector((state) => state.airports.data);
  const { useImperial, filter, showAirports } = useSelector((state) => state.ui);

  const counts = useMemo(() => {
    const highThresh = useImperial ? 36000 : 11000;
    const lowThresh = useImperial ? 30000 : 9000;

    let total = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    planes.forEach((plane) => {
      if (!plane.lat || !plane.lon) return;
      total += 1;

      const altValue = useImperial ? getAltFt(plane.geo_altitude) : plane.geo_altitude;
      if (altValue > highThresh) high += 1;
      else if (altValue >= lowThresh && altValue <= highThresh) medium += 1;
      else low += 1;
    });

    return {
      total,
      high,
      medium,
      low,
      airports: airports.length,
    };
  }, [airports.length, planes, useImperial]);

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
        <SearchBar />
      </div>
      <div style={panelStyle}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Filter:</div>
        <select value={filter} onChange={(e) => dispatch(setFilter(e.target.value))} style={{ padding: '5px', borderRadius: '3px', width: '100%', color: 'var(--ui-text)', backgroundColor: 'var(--ui-bg)', border: 'var(--ui-border)' }}>
          <option value="all">All Planes ({counts.total})</option>
          <option value="high">High Alt ({useImperial ? '>36k ft' : '>11 km'}) ({counts.high})</option>
          <option value="medium">Med Alt ({useImperial ? '30k-36k ft' : '9k-11 km'}) ({counts.medium})</option>
          <option value="low">Low Alt ({useImperial ? '<30k ft' : '<9 km'}) ({counts.low})</option>
        </select>
        <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAirports} onChange={() => dispatch(setShowAirports(!showAirports))} style={{ marginRight: '8px' }} />
            Show Airports ({counts.airports})
          </label>
        </div>
      </div>
    </div>
  );
};
export default FilterPanel;