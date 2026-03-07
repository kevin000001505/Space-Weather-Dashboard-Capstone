// DRAP Implementation: HeatmapLayer approach
// Uses deck.gl HeatmapLayer for smooth gradient visualization

import { HeatmapLayer } from '@deck.gl/aggregation-layers';

export const createDRAPHeatmapLayers = (drapPoints, isZooming) => {
  if (!Array.isArray(drapPoints) || drapPoints.length === 0) {
    return [];
  }
  
  return [
    new HeatmapLayer({
      id: "drap-heatmap",
      data: drapPoints.map(([lat, lon, amp]) => ({
        position: [lon, lat],
        weight: amp || 0
      })),
      getPosition: (d) => d.position,
      getWeight: (d) => d.weight,
      radiusPixels: 50,
      intensity: 1.1,
      threshold: 0.5,
      colorRange: [
        [0, 0, 255],      // blue
        [0, 255, 255],    // cyan
        [0, 255, 0],      // green
        [255, 255, 0],    // yellow
        [255, 0, 0],      // red
      ],
      opacity: isZooming ? 0.1 : 0.5,
      updateTriggers: {
        getWeight: isZooming,
      },
    }),
  ];
};

export const getDRAPHeatmapGeoJSON = null; // Not needed for HeatmapLayer
export const getDRAPHeatmapMapLayers = null; // Not needed for HeatmapLayer
