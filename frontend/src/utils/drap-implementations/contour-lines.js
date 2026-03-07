// DRAP Implementation: Contour Lines
// Uses MapLibre native layers with colored outlines and subtle fill

export const createDRAPContourLinesLayers = null; // Not used with MapLibre approach

export const getDRAPContourLinesGeoJSON = (drapPoints) => {
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

  const halfLat = latStep / 2 + 0.02;
  const halfLon = lonStep / 2 + 0.02;

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

export const getDRAPContourLinesMapLayers = (isZooming, darkMode) => {
  return [
    {
      id: 'drap-contour-fill',
      type: 'fill',
      source: 'drap-cells',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['to-number', ['get', 'amp']], 0],
          0.0, darkMode ? '#1a1a2e' : '#f0f0ff',
          0.25, darkMode ? '#1a2e2e' : '#f0ffff',
          0.5, darkMode ? '#1a2e1a' : '#f0fff0',
          0.75, darkMode ? '#2e2e1a' : '#fffef0',
          1.0, darkMode ? '#2e1a1a' : '#fff0f0',
        ],
        'fill-opacity': 0.15,
      },
    },
    {
      id: 'drap-contour-lines',
      type: 'line',
      source: 'drap-cells',
      paint: {
        'line-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['to-number', ['get', 'amp']], 0],
          0.0, '#4169e1',
          0.25, '#00bfff',
          0.5, '#32cd32',
          0.75, '#ffa500',
          1.0, '#ff4500',
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['coalesce', ['to-number', ['get', 'amp']], 0],
          0.0, 1.2,
          0.5, 2.0,
          1.0, 3.5,
        ],
        'line-opacity': isZooming ? 0 : 0.85,
      },
    },
  ];
};
