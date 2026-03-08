import SearchBar from './SearchBar';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setPlaneFilter,
  setAirportFilter,
  setShowAirports,
  setShowPlanes,
  setShowDRAP,
  setDrapImplementation,
  setIsAirportDropdownOpen,
} from '../../store/slices/uiSlice';
import { getAltFt } from '../../utils/mapUtils';

const FilterPanel = () => {
  const dispatch = useDispatch();
  const planes = useSelector((state) => state.planes.data);
  const airports = useSelector((state) => state.airports.data);
  const {
    useImperial,
    planeFilter,
    airportFilter,
    showAirports,
    showPlanes,
    showDRAP,
    drapImplementation,
    isAirportDropdownOpen,
  } = useSelector((state) => state.ui);

  const counts = useMemo(() => {
    const highThresh = useImperial ? 36000 : 11000;
    const lowThresh = useImperial ? 30000 : 9000;

    let planes_all = 0;
    let planes_high = 0;
    let planes_medium = 0;
    let planes_low = 0;

    planes.forEach((plane) => {
      if (!plane.lat || !plane.lon) return;
      planes_all += 1;

      const altValue = useImperial ? getAltFt(plane.geo_altitude) : plane.geo_altitude;
      if (altValue > highThresh) planes_high += 1;
      else if (altValue >= lowThresh && altValue <= highThresh) planes_medium += 1;
      else planes_low += 1;
    });

    let airports_all = 0;
    let large_airports = 0;
    let medium_airports = 0;
    let small_airports = 0;
    let seaplane_bases = 0;
    let balloon_ports = 0;
    let heliports = 0;
    let closed_airports = 0;

    airports.forEach((airport) => {
      if (!airport.lat || !airport.lon) return;
      switch (airport.type) {
        case 'large_airport': large_airports += 1; break;
        case 'medium_airport': medium_airports += 1; break;
        case 'small_airport': small_airports += 1; break;
        case 'seaplane_base': seaplane_bases += 1; break;
        case 'balloonport': balloon_ports += 1; break;
        case 'heliport': heliports += 1; break;
        case 'closed': closed_airports += 1; break;
        default: break;
      }
    });

    return {
      planes_all,
      planes_high,
      planes_medium,
      planes_low,
      airports_all,
      large_airports,
      medium_airports,
      small_airports,
      seaplane_bases,
      balloon_ports,
      heliports,
      closed_airports,
    };
  }, [planes, airports, useImperial]);

  const panelStyle = {
    backgroundColor: 'var(--ui-bg)',
    padding: '10px',
    borderRadius: '4px',
    boxShadow: 'var(--ui-shadow)'
  };

  const airportTypeOptions = [
    { id: 'large_airport', label: 'Large Airports', count: counts.large_airports },
    { id: 'medium_airport', label: 'Medium Airports', count: counts.medium_airports },
    { id: 'small_airport', label: 'Small Airports', count: counts.small_airports },
    { id: 'seaplane_base', label: 'Seaplane Bases', count: counts.seaplane_bases },
    { id: 'heliport', label: 'Heliports', count: counts.heliports },
    { id: 'balloonport', label: 'Balloonports', count: counts.balloon_ports },
    { id: 'closed', label: 'Closed', count: counts.closed_airports },
  ];

  const filteredAirportsCount = airportFilter.length === 0 
    ? counts.airports_all 
    : airportTypeOptions
        .filter(option => airportFilter.includes(option.id))
        .reduce((sum, option) => sum + option.count, 0);

  const allAirportTypes = airportTypeOptions.map(opt => opt.id);

  const handleAirportTypeToggle = (typeId) => {
    if (airportFilter.length === 0) {
      dispatch(setAirportFilter(allAirportTypes.filter(id => id !== typeId)));
      return;
    }

    if (airportFilter.includes(typeId)) {
      if (airportFilter.length === 1) return;
      dispatch(setAirportFilter(airportFilter.filter(id => id !== typeId)));
    } else {
      const newFilter = [...airportFilter, typeId];
      dispatch(setAirportFilter(newFilter));
    }
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
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Filter Planes</div>
        {showPlanes && (
          <select value={planeFilter} onChange={(e) => dispatch(setPlaneFilter(e.target.value))} style={{ padding: '5px', borderRadius: '3px', width: '100%', color: 'var(--ui-text)', backgroundColor: 'var(--ui-bg)', border: 'var(--ui-border)'}}>
            <option value="all">All Planes ({counts.planes_all})</option>
            <option value="high">High Alt ({useImperial ? '>36k ft' : '>11 km'}) ({counts.planes_high})</option>
            <option value="medium">Med Alt ({useImperial ? '30k-36k ft' : '9k-11 km'}) ({counts.planes_medium})</option>
            <option value="low">Low Alt ({useImperial ? '<30k ft' : '<9 km'}) ({counts.planes_low})</option>
          </select>
        )}
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={showPlanes} onChange={() => dispatch(setShowPlanes(!showPlanes))} style={{ marginRight: '8px' }} />
          Show Planes ({counts.planes_all})
        </label>
        <div style={{ marginBottom: '5px', marginTop: '5px', fontWeight: 'bold' }}>Filter Airports</div>
        {showAirports && (
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => dispatch(setIsAirportDropdownOpen(!isAirportDropdownOpen))}
              style={{
                padding: '5px', borderRadius: '3px', border: '1px solid var(--ui-border)',
                backgroundColor: 'var(--ui-bg)', cursor: 'pointer', display: 'flex', 
                justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9em'
              }}
            >
              <span>Select Types ({airportFilter.length || 'All'})</span>
              <span style={{ transform: isAirportDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
            </div>

            {isAirportDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                backgroundColor: 'var(--ui-bg)', border: '1px solid var(--ui-border)',
                borderRadius: '3px', boxShadow: 'var(--ui-shadow)', maxHeight: '180px',
                overflowY: 'auto', zIndex: 10, padding: '5px', display: 'flex', flexDirection: 'column', gap: '5px'
              }}>
                {airportTypeOptions.map((option) => (
                  <label key={option.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85em', padding: '2px 0' }}>
                    <input 
                      type="checkbox" 
                      checked={airportFilter.length === 0 || airportFilter.includes(option.id)} 
                      onChange={() => handleAirportTypeToggle(option.id)} 
                      style={{ marginRight: '8px' }} 
                    />
                    {option.label} ({option.count})
                  </label>
                ))}
                <div style={{ borderTop: '1px solid var(--ui-border)', paddingTop: '4px', marginTop: '2px', textAlign: 'center' }}>
                  <button 
                    onClick={() => dispatch(setAirportFilter(allAirportTypes))}
                    style={{ background: 'none', border: 'none', color: 'var(--ui-text)', cursor: 'pointer', fontSize: '0.85em', textDecoration: 'underline', padding: 0 }}
                  >
                    Select All
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAirports} onChange={() => dispatch(setShowAirports(!showAirports))} style={{ marginRight: '8px' }} />
          Show Airports ({filteredAirportsCount})
        </label>
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={showDRAP} onChange={() => dispatch(setShowDRAP(!showDRAP))} style={{ marginRight: '8px' }} />
            Show DRAP
          </label>
          {false && showDRAP && (
            <div style={{ marginLeft: '24px', marginTop: '5px' }}>
              <label style={{ fontSize: '0.85em', color: 'var(--ui-text-dim, #666)' }}>DRAP Style:</label>
              <select 
                value={drapImplementation} 
                onChange={(e) => dispatch(setDrapImplementation(e.target.value))} 
                style={{ 
                  padding: '3px', 
                  borderRadius: '3px', 
                  width: '100%', 
                  marginTop: '3px',
                  fontSize: '0.9em',
                  color: 'var(--ui-text)', 
                  backgroundColor: 'var(--ui-bg)', 
                  border: 'var(--ui-border)' 
                }}
              >
                <option value="contour-lines">Contour Lines</option>
                <option value="filled-cells">Filled Cells</option>
                <option value="bitmap">Bitmap</option>
                <option value="heatmap">Heatmap</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default FilterPanel;