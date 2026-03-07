// DRAP Visualization Implementations
// Export all four approaches for client demonstration

import * as heatmapImplementation from './heatmap';
import * as bitmapImplementation from './bitmap';
import * as filledCellsImplementation from './filled-cells';
import * as contourLinesImplementation from './contour-lines';

export * from './heatmap';
export * from './bitmap';
export * from './filled-cells';
export * from './contour-lines';

// Implementation types enum for easy switching
export const DRAPImplementationType = {
  HEATMAP: 'heatmap',
  BITMAP: 'bitmap',
  FILLED_CELLS: 'filled-cells',
  CONTOUR_LINES: 'contour-lines',
};

const implementationMap = {
  [DRAPImplementationType.HEATMAP]: heatmapImplementation,
  [DRAPImplementationType.BITMAP]: bitmapImplementation,
  [DRAPImplementationType.FILLED_CELLS]: filledCellsImplementation,
  [DRAPImplementationType.CONTOUR_LINES]: contourLinesImplementation,
};

// Helper function to get implementation by type
export const getDRAPImplementation = (type) => {
  const implementation = implementationMap[type];
  if (!implementation) {
    throw new Error(`Unknown DRAP implementation type: ${type}`);
  }
  return implementation;
};
