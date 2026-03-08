// DRAP Implementation: Filled Polygon Cells
// Uses MapLibre native fill layers with solid color per cell

export const createDRAPFilledCellsLayers = null; // Not used with MapLibre approach

export const getDRAPFilledCellsGeoJSON = (drapPoints) => {
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

  const validPoints = drapPoints
    .map(([lat, lon, amp]) => ({ lat: Number(lat), lon: Number(lon), amp: Number(amp) }))
    .filter(({ lat, lon, amp }) => Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(amp) && amp > 0);

  if (validPoints.length === 0) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  const uniqueLats = [...new Set(validPoints.map(({ lat }) => lat))].sort((a, b) => a - b);
  const uniqueLons = [...new Set(validPoints.map(({ lon }) => lon))].sort((a, b) => a - b);

  const latStep = getMedianStep(uniqueLats) || 2;
  const lonStep = getMedianStep(uniqueLons) || 4;

  const halfLat = latStep / 2;
  const halfLon = lonStep / 2;

  const ampByCell = new Map();
  let maxAmp = 0;

  validPoints.forEach(({ lat, lon, amp }) => {
    const key = `${lat}|${lon}`;
    const prev = ampByCell.get(key) ?? 0;
    if (amp > prev) {
      ampByCell.set(key, amp);
    }
    if (amp > maxAmp) {
      maxAmp = amp;
    }
  });

  const safeMaxAmp = maxAmp > 0 ? maxAmp : 1;
  const entries = [...ampByCell.entries()]
    .map(([key, rawAmp]) => {
      const [latStr, lonStr] = key.split('|');
      return {
        lat: Number(latStr),
        lon: Number(lonStr),
        rawAmp,
      };
    })
    .filter(({ lat, lon }) => Number.isFinite(lat) && Number.isFinite(lon))
    .sort((a, b) => (b.lat - a.lat) || (a.lon - b.lon));

  const features = entries.map(({ lat, lon, rawAmp }) => {
    const west = lon - halfLon;
    const east = lon + halfLon;
    const south = lat - halfLat;
    const north = lat + halfLat;
    const normalizedAmp = Math.max(0, Math.min(1, rawAmp / safeMaxAmp));

    return {
      type: 'Feature',
      properties: {
        amp: normalizedAmp,
        ampRaw: rawAmp,
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

export const getDRAPFilledCellsMapLayers = (isZooming) => {
  return [
    {
      id: 'drap-filled-cells',
      type: 'fill',
      source: 'drap-cells',
      paint: {
        'fill-antialias': false,
        'fill-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['to-number', ['get', 'ampRaw']], 0],
          0,  '#000000',
          5,  '#7700ff',
          10, '#0000ff',
          15, '#00ffff',
          20, '#55ff00',
          25, '#ffff00',
          30, '#ff8000',
          35, '#ff0000',
        ],
        'fill-opacity': isZooming? 0.1 : 0.5,
      },
    },
  ];
};
