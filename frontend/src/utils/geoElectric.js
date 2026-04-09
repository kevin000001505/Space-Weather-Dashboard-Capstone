// GeoElectric Implementation: Filled Polygon Cells
// Converts geoelectric API data to GeoJSON for grid visualization

/**
 * Converts geoelectric API data to a GeoJSON FeatureCollection of filled grid cells.
 * Only includes points with quality_flag === 1.
 * Each cell is a 1x1 degree square polygon centered at [lat, lon].
 * @param {Object|Array} geoElectricData - API response object or values array
 * @param {Array} geoElectricCoordinates - Coordinate mapping from uiSlice
 * @returns {Object} GeoJSON FeatureCollection
 */
export const getGeoElectricGeoJSON = (
  sourcePoints,
  geoElectricLogRange = [0, 100],
) => {
  if (
    sourcePoints.length === 0 || !Array.isArray(sourcePoints[0])
  ) {
    return { type: "FeatureCollection", features: [] };
  }

  const [minLog, maxLog] =
    Array.isArray(geoElectricLogRange) && geoElectricLogRange.length === 2
      ? geoElectricLogRange
      : [0, 4];

  const minMag = Math.pow(10, minLog);
  const maxMag = Math.pow(10, maxLog);
  const validPoints = sourcePoints.filter(
        ([lat, lon, magnitude]) =>
          magnitude >= minMag && magnitude <= maxMag,
      )

  // 2. Each cell is 1x1 degree (like aurora)
  const halfLat = 0.5;
  const halfLon = 0.5;

  // 3. Map to GeoJSON Polygons
  const features = validPoints.map((point) => {
    const lat = Array.isArray(point) ? point[0] : point.lat;
    const lon = Array.isArray(point) ? point[1] : point.lon;
    const magnitude = Array.isArray(point) ? point[2] : point.magnitude;
    const west = lon - halfLon;
    const east = lon + halfLon;
    const south = lat - halfLat;
    const north = lat + halfLat;

    return {
      type: "Feature",
      properties: {
        magnitude,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
};

/**
 * Returns a MapLibre/Mapbox GL layer config for geoelectric grid visualization.
 * Color is based on magnitude:
 *   1 → blue (#0074D9)
 *   100 → skyblue (#7FDBFF)
 *   100 → dark purple (#2E0854)
 *   10000 → bright purple (#E040FB)
 * @param {boolean} isZooming - If true, lower opacity
 * @returns {Array} Layer config array
 */
export const getGeoElectricMapLayers = (isZooming) => {
  return [
    {
      id: "geoelectric-filled-cells",
      type: "fill",
      source: "geoelectric-cells",
      paint: {
        "fill-antialias": false,
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "magnitude"],
          1,
          "#0074D9", // Blue
          10,
          "#7FDBFF", // Skyblue
          101,
          "#2E0854", // Dark purple (overlap at 100 for sharp transition)
          10000,
          "#E040FB", // Bright purple
        ],
        "fill-opacity": isZooming ? 0.1 : 0.2,
      },
    },
  ];
};
