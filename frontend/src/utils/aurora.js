// Aurora Implementation: Filled Polygon Cells
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

export const buildAuroraStaticFromLocations = (locationsAurora) => {
  if (!Array.isArray(locationsAurora) || locationsAurora.length === 0) {
    return { featureCollection: { type: "FeatureCollection", features: [] }, count: 0 };
  }

  const features = [];
  for (let i = 0; i < locationsAurora.length; i += 1) {
    const entry = locationsAurora[i];
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

export const getAuroraFrameProbabilities = (points, auroraRegionRange = [0, 100]) => {
  const [minAmp, maxAmp] = auroraRegionRange || [0, 100];
  const result = new Map();
  if (!Array.isArray(points)) return result;

  for (let i = 0; i < points.length; i += 1) {
    const row = points[i];
    if (!Array.isArray(row)) continue;
    const prob = Number(row[2]);
    if (!Number.isFinite(prob) || prob <= 0) continue;
    if (prob < minAmp || prob > maxAmp) continue;
    result.set(i + 1, { probability: prob });
  }
  return result;
};

export const AURORA_BASE_OPACITY = 0.6;
export const AURORA_DIMMED_OPACITY = 0.2;
export const AURORA_LAYER_ID = "aurora-filled-cells";

export const getAuroraMapLayers = () => {
  const probExpr = ["coalesce", ["feature-state", "probability"], 0];
  return [
    {
      id: AURORA_LAYER_ID,
      type: "fill",
      source: "aurora-cells",
      paint: {
        "fill-antialias": false,
        "fill-color": [
          "interpolate",
          ["linear"],
          probExpr,
          0, "rgba(0, 0, 0, 0)",
          10, "#1eff00",
          50, "#fff700",
          80, "#ff0000",
        ],
        "fill-opacity": AURORA_BASE_OPACITY,
        "fill-opacity-transition": { duration: 180 },
      },
    },
  ];
};
