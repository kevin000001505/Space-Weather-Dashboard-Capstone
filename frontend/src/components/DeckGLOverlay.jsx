import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { DeckOverlay } from '@deck.gl-community/leaflet';
import { MapView } from '@deck.gl/core';

const DeckGLOverlay = ({ layers }) => {
  const map = useMap();
  const deckLayerRef = useRef(null);

  useEffect(() => {
    deckLayerRef.current = new DeckOverlay({
      views: [new MapView({ repeat: true })],
      layers: layers,
      getCursor: ({ isHovering }) => (isHovering ? 'pointer' : 'inherit')
    });
    
    map.addLayer(deckLayerRef.current);

    return () => {
      if (deckLayerRef.current) {
        map.removeLayer(deckLayerRef.current);
      }
    };
  }, [map]);

  useEffect(() => {
    if (deckLayerRef.current) {
      deckLayerRef.current.setProps({ layers });
    }
  }, [layers]);

  return null;
};

export default DeckGLOverlay;