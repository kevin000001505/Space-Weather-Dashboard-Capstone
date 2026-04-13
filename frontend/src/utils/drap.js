// DRAP Implementation: Filled Polygon Cells
// Static source built once from the canonical locations grid; per-frame updates
// use feature-state keyed on the locations array index.

const getMedianStep = (values) => {
  if (values.length < 2) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const deltas = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const delta = Math.abs(sorted[i] - sorted[i - 1]);
    if (delta > 1e-6) deltas.push(delta);
  }
  if (deltas.length === 0) return 0;
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)];
};

const cellFeature = (id, lat, lon, halfLat, halfLon) => ({
  type: "Feature",
  id,
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [[
      [lon - halfLon, lat - halfLat],
      [lon + halfLon, lat - halfLat],
      [lon + halfLon, lat + halfLat],
      [lon - halfLon, lat + halfLat],
      [lon - halfLon, lat - halfLat],
    ]],
  },
});

export const buildDRAPStaticFromLocations = (locationsDrap) => {
  if (!Array.isArray(locationsDrap) || locationsDrap.length === 0) {
    return { featureCollection: { type: "FeatureCollection", features: [] }, count: 0 };
  }

  const uniqueLats = new Set();
  const uniqueLons = new Set();
  for (let i = 0; i < locationsDrap.length; i += 1) {
    const entry = locationsDrap[i];
    if (!Array.isArray(entry)) continue;
    const lat = Number(entry[0]);
    const lon = Number(entry[1]);
    if (Number.isFinite(lat)) uniqueLats.add(lat);
    if (Number.isFinite(lon)) uniqueLons.add(lon);
  }
  const latStep = getMedianStep([...uniqueLats]) || 2;
  const lonStep = getMedianStep([...uniqueLons]) || 4;
  const halfLat = latStep / 2;
  const halfLon = lonStep / 2;

  const features = [];
  for (let i = 0; i < locationsDrap.length; i += 1) {
    const entry = locationsDrap[i];
    if (!Array.isArray(entry)) continue;
    const lat = Number(entry[0]);
    const lon = Number(entry[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    features.push(cellFeature(i + 1, lat, lon, halfLat, halfLon));
  }

  return {
    featureCollection: { type: "FeatureCollection", features },
    count: features.length,
  };
};

export const getDRAPFrameAmps = (points, drapRegionRange = [0, 35]) => {
  const [minFilterAmp, maxFilterAmp] = drapRegionRange || [0, 35];
  const result = new Map();
  if (!Array.isArray(points)) return result;

  for (let i = 0; i < points.length; i += 1) {
    const row = points[i];
    if (!Array.isArray(row)) continue;
    const amp = Number(row[2]);
    if (!Number.isFinite(amp) || amp <= 0) continue;
    if (amp < minFilterAmp || amp > maxFilterAmp) continue;
    result.set(i + 1, { amp });
  }
  return result;
};

export const DRAP_BASE_OPACITY = 0.5;
export const DRAP_DIMMED_OPACITY = 0.1;
export const DRAP_LAYER_ID = "drap-filled-cells";

export const getDRAPFilledCellsMapLayers = () => {
  const ampExpr = ["coalesce", ["feature-state", "amp"], 0];
  return [
    {
      id: DRAP_LAYER_ID,
      type: "fill",
      source: "drap-cells",
      paint: {
        "fill-antialias": false,
        "fill-color": [
          "interpolate",
          ["linear"],
          ampExpr,
          0, "rgba(0, 0, 0, 0)",
          0.01, "#000000",
          5, "#7700ff",
          10, "#0000ff",
          15, "#00ffff",
          20, "#55ff00",
          25, "#ffff00",
          30, "#ff8000",
          35, "#ff0000",
        ],
        "fill-opacity": DRAP_BASE_OPACITY,
        "fill-opacity-transition": { duration: 180 },
      },
    },
  ];
};
