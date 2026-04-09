// Aurora Implementation: Filled Polygon Cells
// Ingests data directly from NOAA's OVATION Prime JSON

export const getAuroraGeoJSON = (sourcePoints, auroraRegionRange = [0, 100]) => {
  if (!sourcePoints || sourcePoints.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }
  
  const [minAmp, maxAmp] = auroraRegionRange || [0, 100];
 // 1. Filter and normalize coordinates
  // Data arrives as [lat, lon, prob] from the DB / compressed pipeline
  const validPoints = sourcePoints
        .filter(([lat, lon, prob]) => prob >= minAmp && prob <= maxAmp)
        .map(([lat, lon, prob]) => {
          // Longitude may still be 0-360 from legacy NOAA data.
          // MapLibre/deck.gl expects -180 to 180, so we must wrap it.
          const normalizedLon = lon > 180 ? lon - 360 : lon;
          return { lat, lon: normalizedLon, prob };
        }) ?? [];

  // 2. NOAA's grid is uniformly 1x1 degree
  const halfLat = 0.5;
  const halfLon = 0.5;

  // 3. Map to GeoJSON Polygons
  const features = validPoints.map(({ lat, lon, prob }) => {
    const west = lon - halfLon;
    const east = lon + halfLon;
    const south = lat - halfLat;
    const north = lat + halfLat;

    return {
      type: 'Feature',
      properties: {
        probability: prob, // 0 to 100
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ]],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
};

export const getAuroraMapLayers = (isZooming) => {
  return [
    {
      id: 'aurora-filled-cells',
      type: 'fill',
      source: 'aurora-cells',
      paint: {
        'fill-antialias': false,
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'probability'],    // NOAA gives us a 0-100 scale natively
          0,   'rgba(0, 0, 0, 0)', // Transparent for 0%
          10,  '#1eff00',          // Bright green
          50,  '#fff700',          // Bright yellow
          80,  '#ff0000',          // Intense red (high probability/intensity)
        ],
        'fill-opacity': isZooming ? 0.2 : 0.6,
      },
    },
  ];
};