import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer, IconLayer, BitmapLayer } from "@deck.gl/layers";
import {
  getAltFt,
  getAltitudeColor,
  PLANE_ATLAS,
  PLANE_OUTLINE_ATLAS,
} from "./mapUtils";

export const buildDeckLayers = ({
  drapPoints,
  airports,
  filteredPlanes,
  showAirports,
  showDRAP,
  darkMode,
  useImperial,
  selectedPlane,
  selectedAirport,
  isZooming,
  setSelectedPlane,
  setSelectedAirport,
}) => {
  const handlePlaneClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        setSelectedPlane(object);
        setSelectedAirport(null);
      }, 10);
      return true;
    }
  };

  const handleAirportClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        setSelectedAirport(object);
        setSelectedPlane(null);
      }, 10);
      return true;
    }
  };
  function buildGrid(drapPoints) {
    // Unique sorted latitudes (north → south)
    const lats = [...new Set(drapPoints.map((d) => d[0]))].sort(
      (a, b) => b - a,
    );

    // Unique sorted longitudes (west → east)
    const lons = [...new Set(drapPoints.map((d) => d[1]))].sort(
      (a, b) => a - b,
    );

    const rows = lats.length;
    const cols = lons.length;

    // Initialize grid with null
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

    const latIndex = new Map(lats.map((lat, i) => [lat, i]));
    const lonIndex = new Map(lons.map((lon, i) => [lon, i]));

    drapPoints.forEach(([lat, lon, amp]) => {
      const row = latIndex.get(lat);
      const col = lonIndex.get(lon);
      grid[row][col] = amp;
    });

    return { grid, rows, cols, lats, lons };
  }
  function computeMinMax(drapPoints) {
    let min = Infinity;
    let max = -Infinity;

    drapPoints.forEach(([lat, lon, amp]) => {
      if (amp == null) return;
      if (amp < min) min = amp;
      if (amp > max) max = amp;
    });

    return { min, max };
  }
  function generateRaster(drapPoints) {
    const { grid, rows, cols, lats, lons } = buildGrid(drapPoints);
    const { min, max } = computeMinMax(drapPoints);

    console.log("Amplitude range:", min, max);

    const width = 1440;
    const height = 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = (x / width) * (cols - 1);
        const gy = (y / height) * (rows - 1);

        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const x1 = Math.min(x0 + 1, cols - 1);
        const y1 = Math.min(y0 + 1, rows - 1);

        const dx = gx - x0;
        const dy = gy - y0;

        const v00 = grid[y0]?.[x0];
        const v10 = grid[y0]?.[x1];
        const v01 = grid[y1]?.[x0];
        const v11 = grid[y1]?.[x1];

        if (v00 == null || v10 == null || v01 == null || v11 == null) {
          const index = (y * width + x) * 4;
          imageData.data[index + 3] = 0;
          continue;
        }

        const value =
          v00 * (1 - dx) * (1 - dy) +
          v10 * dx * (1 - dy) +
          v01 * (1 - dx) * dy +
          v11 * dx * dy;

        const normalized = (value - min) / (max - min);

        const clamped = Math.max(0, Math.min(1, normalized));

        const threshold = 0.15; // adjust 0.1–0.3

        const [r, g, b] = heatColor(clamped);

        const index = (y * width + x) * 4;
        imageData.data[index] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = 255;
        if (clamped < threshold) {
          imageData.data[index + 3] = 0; // fully transparent
          continue;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return {
      image: canvas,
      bounds: [minLon, minLat, maxLon, maxLat],
    };
  }
  function heatColor(t) {
    const gradient = [
      [0, 0, 255],
      [0, 255, 255],
      [0, 255, 0],
      [255, 255, 0],
      [255, 0, 0],
    ];

    const scaled = t * (gradient.length - 1);
    const i = Math.floor(scaled);
    const f = scaled - i;

    const c0 = gradient[i];
    const c1 = gradient[Math.min(i + 1, gradient.length - 1)];

    return [
      c0[0] + (c1[0] - c0[0]) * f,
      c0[1] + (c1[1] - c0[1]) * f,
      c0[2] + (c1[2] - c0[2]) * f,
    ];
  }
  function computeBounds(drapPoints) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    drapPoints.forEach(([lat, lon]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });

    return [minLon, minLat, maxLon, maxLat];
  }
  const raster = generateRaster(drapPoints);
  console.log(computeBounds(drapPoints));
  return [
    // DRAP Heatmap Layer
    showDRAP &&
      new BitmapLayer({
        id: "drap-raster",
        bounds: raster.bounds,
        image: raster.image,
        opacity: isZooming ? 0 : 0.1, // Hide during zoom
      }),

    // Airports Scatterplot Layer
    showAirports &&
      new ScatterplotLayer({
        id: "airports-base",
        data: airports,
        getPosition: (d) => [parseFloat(d.lon), parseFloat(d.lat)],
        getFillColor: darkMode ? [168, 168, 168, 150] : [85, 85, 85, 150],
        getRadius: (d) => (d.type === "large_airport" ? 5 : 3),
        radiusUnits: "pixels",
        lineWidthMinPixels: 1,
        stroked: true,
        getLineColor: [0, 0, 0, 100],
        pickable: true,
        onClick: handleAirportClick,
        updateTriggers: { getFillColor: darkMode },
      }),

    // Planes Icon Layer
    new IconLayer({
      id: "planes-base",
      data: filteredPlanes,
      pickable: true,
      iconAtlas: PLANE_ATLAS,
      iconMapping: {
        plane: { x: 0, y: 0, width: 128, height: 128, mask: true },
      },
      getIcon: (d) => "plane",
      getPosition: (d) => [d.lon, d.lat],
      getSize: 30,
      getAngle: (d) => -(d.heading || 0),
      getColor: (d) => {
        const color = getAltitudeColor(
          useImperial ? getAltFt(d.geo_altitude) : d.geo_altitude,
          useImperial,
        );
        // Reduce opacity to 0.1 when zooming
        return isZooming ? [color[0], color[1], color[2], 25] : color;
      },
      onClick: handlePlaneClick,
      updateTriggers: {
        getSize: selectedPlane?.icao24,
        getColor: [useImperial, isZooming],
      },
    }),

    // Selected Airport Highlight
    showAirports &&
      selectedAirport &&
      new ScatterplotLayer({
        id: "selected-airport",
        data: [selectedAirport],
        getPosition: (d) => [parseFloat(d.lon), parseFloat(d.lat)],
        getFillColor: [255, 0, 0, 255],
        getRadius: (d) => (d.type === "large_airport" ? 7 : 5),
        radiusUnits: "pixels",
        lineWidthMinPixels: 2,
        stroked: true,
        getLineColor: darkMode ? [255, 255, 255, 255] : [0, 0, 0, 255],
        updateTriggers: {
          getLineColor: darkMode,
        },
      }),

    // Selected Plane Outline
    selectedPlane &&
      filteredPlanes.includes(selectedPlane) &&
      new IconLayer({
        id: "selected-plane-outline",
        data: [selectedPlane],
        iconAtlas: PLANE_OUTLINE_ATLAS,
        iconMapping: {
          plane: { x: 0, y: 0, width: 128, height: 128, mask: true },
        },
        getIcon: (d) => "plane",
        getPosition: (d) => [d.lon, d.lat],
        getSize: 50,
        getAngle: (d) => -(d.heading || 0),
        getColor: darkMode ? [255, 255, 255] : [0, 0, 0],
        updateTriggers: {
          getColor: darkMode,
        },
      }),

    // Selected Plane Fill
    selectedPlane &&
      filteredPlanes.includes(selectedPlane) &&
      new IconLayer({
        id: "selected-plane-fill",
        data: [selectedPlane],
        iconAtlas: PLANE_ATLAS,
        iconMapping: {
          plane: { x: 0, y: 0, width: 128, height: 128, mask: true },
        },
        getIcon: (d) => "plane",
        getPosition: (d) => [d.lon, d.lat],
        getSize: 45,
        getAngle: (d) => -(d.heading || 0),
        getColor: (d) =>
          getAltitudeColor(
            useImperial ? getAltFt(d.geo_altitude) : d.geo_altitude,
            useImperial,
          ),
        updateTriggers: {
          getColor: [useImperial],
        },
      }),
  ].filter(Boolean);
};
