// GeoElectric Implementation: Filled Polygon Cells
// Static source built once from the canonical locations grid; per-frame updates
// use feature-state keyed on the locations array index.

const HALF_LAT = 0.5;
const HALF_LON = 0.5;

const cellFeature = (id, lat, lon) => ({
  type: "Feature",
  id,
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [[
      [lon - HALF_LON, lat - HALF_LAT],
      [lon + HALF_LON, lat - HALF_LAT],
      [lon + HALF_LON, lat + HALF_LAT],
      [lon - HALF_LON, lat + HALF_LAT],
      [lon - HALF_LON, lat - HALF_LAT],
    ]],
  },
});

export const buildGeoElectricStaticFromLocations = (locationsGeoelectric) => {
  if (!Array.isArray(locationsGeoelectric) || locationsGeoelectric.length === 0) {
    return { featureCollection: { type: "FeatureCollection", features: [] }, count: 0 };
  }

  const features = [];
  for (let i = 0; i < locationsGeoelectric.length; i += 1) {
    const entry = locationsGeoelectric[i];
    if (!Array.isArray(entry)) continue;
    const lat = Number(entry[0]);
    const lon = Number(entry[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    features.push(cellFeature(i + 1, lat, lon));
  }

  return {
    featureCollection: { type: "FeatureCollection", features },
    count: features.length,
  };
};

export const getGeoElectricFrameMagnitudes = (
  points,
  geoElectricLogRange = [0, 4],
) => {
  const [minLog, maxLog] =
    Array.isArray(geoElectricLogRange) && geoElectricLogRange.length === 2
      ? geoElectricLogRange
      : [0, 4];
  const minMag = Math.pow(10, minLog);
  const maxMag = Math.pow(10, maxLog);

  const result = new Map();
  if (!Array.isArray(points)) return result;

  for (let i = 0; i < points.length; i += 1) {
    const row = points[i];
    if (!Array.isArray(row)) continue;
    const magnitude = Number(row[2]);
    if (!Number.isFinite(magnitude)) continue;
    if (magnitude < minMag || magnitude > maxMag) continue;
    result.set(i + 1, { magnitude });
  }
  return result;
};

export const GEOELECTRIC_BASE_OPACITY = 0.2;
export const GEOELECTRIC_DIMMED_OPACITY = 0.05;
export const GEOELECTRIC_LAYER_ID = "geoelectric-filled-cells";

export const getGeoElectricMapLayers = () => {
  const magExpr = ["coalesce", ["feature-state", "magnitude"], 0];
  return [
    {
      id: GEOELECTRIC_LAYER_ID,
      type: "fill",
      source: "geoelectric-cells",
      paint: {
        "fill-antialias": false,
        "fill-color": [
          "interpolate",
          ["linear"],
          magExpr,
          0, "rgba(0, 0, 0, 0)",
          0.99, "rgba(0, 0, 0, 0)",
          1, "#0074D9",
          10, "#7FDBFF",
          101, "#2E0854",
          10000, "#E040FB",
        ],
        "fill-opacity": GEOELECTRIC_BASE_OPACITY,
        "fill-opacity-transition": { duration: 180 },
      },
    },
  ];
};
