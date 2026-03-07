// DRAP Implementation: BitmapLayer approach
// Uses deck.gl BitmapLayer with canvas raster generation

import { BitmapLayer } from '@deck.gl/layers';

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

const heatColor = (t) => {
  const safeT = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  const gradient = [
    [0, 0, 255],
    [0, 255, 255],
    [0, 255, 0],
    [255, 255, 0],
    [255, 0, 0],
  ];
  const scaled = safeT * (gradient.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const c0 = gradient[i];
  const c1 = gradient[Math.min(i + 1, gradient.length - 1)];
  return [
    c0[0] + (c1[0] - c0[0]) * f,
    c0[1] + (c1[1] - c0[1]) * f,
    c0[2] + (c1[2] - c0[2]) * f,
  ];
};

export const createDRAPBitmapLayers = (drapPoints, isZooming) => {
  if (!Array.isArray(drapPoints) || drapPoints.length === 0) {
    return [];
  }

  const validPoints = drapPoints
    .map(([lat, lon, amp]) => ({ lat: Number(lat), lon: Number(lon), amp: Number(amp) }))
    .filter(({ lat, lon, amp }) => Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(amp) && amp > 0);

  if (validPoints.length === 0) {
    return [];
  }

  const lats = [...new Set(validPoints.map(({ lat }) => lat))].sort((a, b) => b - a);
  const lons = [...new Set(validPoints.map(({ lon }) => lon))].sort((a, b) => a - b);
  const rows = lats.length;
  const cols = lons.length;

  if (rows < 2 || cols < 2) {
    return [];
  }

  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  const latIndex = new Map(lats.map((lat, i) => [lat, i]));
  const lonIndex = new Map(lons.map((lon, i) => [lon, i]));

  let minAmp = Infinity;
  let maxAmp = -Infinity;

  validPoints.forEach(({ lat, lon, amp }) => {
    const row = latIndex.get(lat);
    const col = lonIndex.get(lon);
    if (row == null || col == null) return;

    grid[row][col] = amp;
    if (amp < minAmp) minAmp = amp;
    if (amp > maxAmp) maxAmp = amp;
  });

  if (!Number.isFinite(minAmp) || !Number.isFinite(maxAmp)) {
    return [];
  }

  const safeMax = maxAmp > 0 ? maxAmp : 1;

  const width = 1440;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return [];
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const imageData = ctx.createImageData(width, height);
  const threshold = 0.02;
  let paintedPixels = 0;

  for (let y = 0; y < height; y += 1) {
    const gy = (y / (height - 1)) * (rows - 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(y0 + 1, rows - 1);
    const dy = gy - y0;

    for (let x = 0; x < width; x += 1) {
      const gx = (x / (width - 1)) * (cols - 1);
      const x0 = Math.floor(gx);
      const x1 = Math.min(x0 + 1, cols - 1);
      const dx = gx - x0;

      const v00 = grid[y0]?.[x0];
      const v10 = grid[y0]?.[x1];
      const v01 = grid[y1]?.[x0];
      const v11 = grid[y1]?.[x1];

      if (v00 == null || v10 == null || v01 == null || v11 == null) {
        continue;
      }

      const value =
        v00 * (1 - dx) * (1 - dy) +
        v10 * dx * (1 - dy) +
        v01 * (1 - dx) * dy +
        v11 * dx * dy;

      const normalized = Math.max(0, Math.min(1, value / safeMax));
      if (normalized < threshold) continue;

      const [r, g, b] = heatColor(normalized);

      const index = (y * width + x) * 4;
      imageData.data[index] = Math.round(r);
      imageData.data[index + 1] = Math.round(g);
      imageData.data[index + 2] = Math.round(b);
      imageData.data[index + 3] = 255;
      paintedPixels += 1;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return [
    new BitmapLayer({
      id: 'drap-bitmap',
      bounds: [minLon, minLat, maxLon, maxLat],
      image: canvas,
      opacity: isZooming ? 0.01 : 0.18,
    }),
  ];
};

export const getDRAPBitmapGeoJSON = null; // Not needed for BitmapLayer
export const getDRAPBitmapMapLayers = null; // Not needed for BitmapLayer
