import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

export const MapController = ({ centerPos }) => {
  const map = useMap();
  
  useEffect(() => {
    if (centerPos) {
      map.flyTo([centerPos.lat, centerPos.lon], 10, {
        duration: 1.5
      });
    }
  }, [centerPos, map]);

  return null;
};

export const MapClickHandler = ({ clearSelections }) => {
  useMapEvents({
    click: () => clearSelections()
  });
  return null;
};