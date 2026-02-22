import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, IconLayer } from '@deck.gl/layers';
import { getAltFt, getAltitudeColor, PLANE_ATLAS, PLANE_OUTLINE_ATLAS } from './mapUtils';

export const buildDeckLayers = ({
  drapPoints,
  airports,
  filteredPlanes,
  showAirports,
  darkMode,
  useImperial,
  selectedPlane,
  selectedAirport,
  setSelectedPlane,
  setSelectedAirport
}) => {
  const handlePlaneClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        setSelectedPlane(object);
        setSelectedAirport(null);
      }, 10);
      return true;
    }
  };

  const handleAirportClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        setSelectedAirport(object);
        setSelectedPlane(null);
      }, 10);
      return true;
    }
  };

  return [
    // DRAP Heatmap Layer
    new HeatmapLayer({
      id: 'drap-heatmap', data: drapPoints, getPosition: d => [d[1], d[0]], getWeight: d => d[2],
      radiusPixels: 40, intensity: 1, threshold: 0.1,
      colorRange: [
        [0, 0, 255],
        [0, 255, 255],
        [0, 255, 0],
        [255, 255, 0],
        [255, 165, 0],
        [255, 0, 0]]
    }),

    // Airports Scatterplot Layer
    showAirports && new ScatterplotLayer({
      id: 'airports-base',
      data: airports,
      getPosition: d => [parseFloat(d.longitude_deg),parseFloat(d.latitude_deg)],
      getFillColor: darkMode ? [168, 168, 168, 150] : [85, 85, 85, 150],
      getRadius: d => d.type === 'large_airport' ? 5 : 3,
      radiusUnits: 'pixels',
      lineWidthMinPixels: 1,
      stroked: true,
      getLineColor: [0, 0, 0, 100],
      pickable: true,
      onClick: handleAirportClick,
      updateTriggers: { getFillColor: darkMode }
    }),

    // Planes Icon Layer
    new IconLayer({
      id: 'planes-base',
      data: filteredPlanes,
      pickable: true,
      iconAtlas: PLANE_ATLAS,
      iconMapping: { plane: { x: 0, y: 0, width: 128, height: 128, mask: true } },
      getIcon: d => 'plane',
      getPosition: d => [d.lon, d.lat],
      getSize: 30,
      getAngle: d => -(d.heading || 0),
      getColor: d => getAltitudeColor(useImperial ? getAltFt(d.geo_altitude) : d.geo_altitude, useImperial),
      onClick: handlePlaneClick,
      updateTriggers: {
        getSize: selectedPlane?.icao24,
        getColor: [useImperial]
    }
    }),

    // Selected Airport Highlight
    showAirports && selectedAirport && new ScatterplotLayer({
      id: 'selected-airport',
      data: [selectedAirport],
      getPosition: d => [parseFloat(d.longitude_deg),parseFloat(d.latitude_deg)],
      getFillColor: [255, 0, 0, 255],
      getRadius: d => d.type === 'large_airport' ? 7 : 5,
      radiusUnits: 'pixels',
      lineWidthMinPixels: 2,
      stroked: true,
      getLineColor: darkMode ? [255, 255, 255, 255] : [0, 0, 0, 255],
      updateTriggers: {
        getLineColor: darkMode
    }
    }),

    // Selected Plane Outline
    selectedPlane && filteredPlanes.includes(selectedPlane) && new IconLayer({
      id: 'selected-plane-outline',
      data: [selectedPlane],
      iconAtlas: PLANE_OUTLINE_ATLAS,
      iconMapping: { plane: { x: 0, y: 0, width: 128, height: 128, mask: true } },
      getIcon: d => 'plane',
      getPosition: d => [d.lon, d.lat],
      getSize: 50,
      getAngle: d => -(d.heading || 0),
      getColor: darkMode ? [255, 255, 255] : [0, 0, 0],
      updateTriggers: {
        getColor: darkMode
    }
    }),

    // Selected Plane Fill
    selectedPlane && filteredPlanes.includes(selectedPlane) && new IconLayer({
      id: 'selected-plane-fill',
      data: [selectedPlane],
      iconAtlas: PLANE_ATLAS,
      iconMapping: { plane: { x: 0, y: 0, width: 128, height: 128, mask: true } },
      getIcon: d => 'plane',
      getPosition: d => [d.lon, d.lat],
      getSize: 45,
      getAngle: d => -(d.heading || 0),
      getColor: d => getAltitudeColor(useImperial ? getAltFt(d.geo_altitude) : d.geo_altitude, useImperial),
      updateTriggers: {
        getColor: [useImperial]
      }
    })
  ].filter(Boolean);
};