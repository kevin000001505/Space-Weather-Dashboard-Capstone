import { IconLayer, PathLayer, TextLayer, LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import { getAltitudeColor, PLANE_ATLAS, PLANE_OUTLINE_ATLAS } from "./mapUtils";
import { fetchFlightPath, fetchAirportDetails } from "../api/api";

const svgToDataUrl = (svg) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const SHAPE_SVGS = {
  star6:
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><polygon points="64,4 76,40 116,24 88,56 124,64 88,72 116,104 76,88 64,124 52,88 12,104 40,72 4,64 40,56 12,24 52,40" fill="white"/></svg>',
  star5:
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><polygon points="64,6 78,45 119,46 86,71 98,111 64,87 30,111 42,71 9,46 50,45" fill="white"/></svg>',
  star4:
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><polygon points="64,4 80,48 124,64 80,80 64,124 48,80 4,64 48,48" fill="white"/></svg>',
  square:
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect x="8" y="8" width="112" height="112" fill="white"/></svg>',
  triangle:
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><polygon points="64,8 120,120 8,120" fill="white"/></svg>',
  circle:
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><circle cx="64" cy="64" r="60" fill="white"/></svg>',
};

const AIRPORT_ICONS = Object.fromEntries(
  Object.entries({
    large_airport: "star6",
    medium_airport: "star5",
    small_airport: "star4",
    heliport: "square",
    seaplane_base: "triangle",
    balloonport: "circle",
  }).map(([type, shape]) => [
    type,
    {
      id: shape,
      url: svgToDataUrl(SHAPE_SVGS[shape]),
      width: 128,
      height: 128,
      mask: true,
    },
  ]),
);

// Vibrant, distinct colors for overlapping runways. Red is reserved.
const RUNWAY_PALETTE = [
  [255, 140, 0],   // Orange
  [46, 204, 113],  // Green
  [52, 152, 219],  // Blue
  [155, 89, 182],  // Purple
  [241, 196, 15],  // Yellow
  [26, 188, 156],  // Teal
  [255, 105, 180]  // Pink
];

const DEFAULT_AIRPORT_ICON = AIRPORT_ICONS.small_airport;

const normalizePathCoordinates = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return coordinates;

  const normalized = [...coordinates];
  let prevLon = normalized[0][0];

  for (let i = 1; i < normalized.length; i++) {
    // Clone the coordinate array to avoid mutating Redux state
    let coord = [...normalized[i]]; 
    let lon = coord[0];

    // If the longitude jumps more than half the globe, adjust it
    if (lon - prevLon > 180) {
      lon -= 360;
    } else if (lon - prevLon < -180) {
      lon += 360;
    }

    coord[0] = lon;
    normalized[i] = coord;
    prevLon = lon; // Track the adjusted longitude for the next point
  }

  return normalized;
};

export const buildDeckLayers = ({
  filteredPlanes,
  filteredAirports,
  showAirports,
  showPlanes,
  darkMode,
  useImperial,
  selectedPlane,
  selectedAirport,
  isZooming,
  flightPath,
  setSelectedPlane,
  setSelectedAirport,
  dispatch,
  addFlightPanel,
  selectedFlightsPanels,
  addAirportPanel,
  selectedAirportsPanels,
  hoveredRunwayId,
  setHoveredRunwayId,
}) => {
  // Handlers for plane interactions
  const handlePlaneClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        const exists = selectedFlightsPanels.some(f => f.icao24 === object.icao24);
        addFlightPanel(object);
        if (exists) {
          dispatch({ type: 'flightPath/removeFlightPath', payload: object.icao24 });
        } else {
          dispatch(fetchFlightPath(object.icao24));
        }
      }, 10);
      return true;
    }
  };
  const handlePlaneHover = ({ object }) => {
    if (object) {
      setSelectedPlane(object);
      setSelectedAirport(null);
    } else {
      setSelectedPlane(null);
    }
    // Only set selection if nothing is already selected
    if (!selectedPlane && object) {
      setSelectedPlane(object);
      setSelectedAirport(null);
    } else if (!object && !selectedPlane) {
      setSelectedPlane(null);
    }
  };

  // Handlers for airport interactions
  const handleAirportClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        setSelectedAirport(object);
        setSelectedPlane(null);
        const exists = selectedAirportsPanels?.some(a => a.ident === object.ident);
        addAirportPanel(object);
        if (!exists) {
          dispatch(fetchAirportDetails(object.ident));
        }
      }, 10);
      return true;
    }
  };
  const handleAirportHover = ({ object }) => {
    if (object) {
      setSelectedAirport(object);
      setSelectedPlane(null);
    } else {
      setSelectedAirport(null);
    }
    // Only set selection if nothing is already selected
    if (!selectedAirport && object) {
      setSelectedAirport(object);
      setSelectedPlane(null);
    } else if (!object && !selectedAirport) {
      setSelectedAirport(null);
    }
  };

  // Extract all runways that have both end coordinates
  const activeRunways = selectedAirportsPanels.flatMap(a => 
    (a.runways || [])
      .filter(r => r.le_geom && r.he_geom)
      .map((r, index) => ({ ...r, colorIndex: index }))
  );

  // Extract LE and HE points to draw text labels at the ends of the runways
  const runwayLabels = activeRunways.flatMap(r => {
    const labels = [];
    if (r.le_geom && r.le_ident) {
      labels.push({ coordinates: r.le_geom.coordinates, text: r.le_ident });
    }
    if (r.he_geom && r.he_ident) {
      labels.push({ coordinates: r.he_geom.coordinates, text: r.he_ident });
    }
    return labels;
  });

  // Extract all main antennas and DME antennas into a single list of points
  const activeNavaidPoints = selectedAirportsPanels.flatMap(a => {
    const points = [];
    if (!a.navaids) return points;
    
    a.navaids.forEach(n => {
      // Add the main antenna
      if (n.geom && n.geom.coordinates) {
        points.push({ ...n, coordinates: n.geom.coordinates, isDME: false });
      }
      // Add the DME antenna if it is physically offset
      if (n.dme_geom && n.dme_geom.coordinates) {
        points.push({ ...n, coordinates: n.dme_geom.coordinates, isDME: true });
      }
    });
    return points;
  });

  return [
    // Runway Lines Layer
    showAirports && activeRunways.length > 0 &&
      new LineLayer({
        id: 'airport-runways-layer',
        data: activeRunways,
        getSourcePosition: d => d.le_geom.coordinates,
        getTargetPosition: d => d.he_geom.coordinates,
        getColor: d => {
          let baseColor;
          if (d.id === hoveredRunwayId) {
            baseColor = [255, 255, 255]; // White hover highlight
          } else if (d.closed) {
            baseColor = [255, 50, 50]; // Red
          } else {
            baseColor = RUNWAY_PALETTE[d.colorIndex % RUNWAY_PALETTE.length];
          }
          // Drop opacity to 25 when dragging the map
          return [...baseColor, isZooming ? 25 : 255];
        },
        getWidth: 8,
        widthUnits: 'pixels',
        pickable: true,
        onHover: ({ object }) => {
          setHoveredRunwayId(object ? object.id : null);
        },
        updateTriggers: {
          getWidth: [hoveredRunwayId],
          getColor: [darkMode, hoveredRunwayId],
        },
      }),

    // Runway End Text Labels
    showAirports && runwayLabels.length > 0 &&
      new TextLayer({
        id: 'airport-runways-text-layer',
        data: runwayLabels,
        getPosition: d => d.coordinates,
        getText: d => d.text,
        getSize: 14,
        getColor: darkMode ? [255, 255, 255, isZooming ? 20 : 255] : [0, 0, 0, isZooming ? 20 : 255],
        getBackgroundColor: darkMode ? [0, 0, 0, isZooming ? 20 : 200] : [255, 255, 255, isZooming ? 20 : 200],
        background: true,
        backgroundPadding: [2, 2],
        fontFamily: 'monospace',
        fontWeight: 'bold',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        pickable: false,
      }),

    // Navaid Points Layer
    showAirports && activeNavaidPoints.length > 0 &&
      new ScatterplotLayer({
        id: 'airport-navaids-layer',
        data: activeNavaidPoints,
        getPosition: d => d.coordinates,
        getFillColor: d => {
          const color = d.isDME ? [156, 39, 176] : [0, 200, 255];
          return [...color, isZooming ? 25 : 200];
        },
        getLineColor: darkMode ? [255, 255, 255, isZooming ? 25 : 255] : [0, 0, 0, isZooming ? 25 : 255],
        lineWidthMinPixels: 1,
        stroked: true,
        getRadius: 5,
        radiusUnits: 'pixels',
        pickable: true,
      }),

    // Airports Icon Layer
    showAirports &&
      new IconLayer({
        id: "airports-base",
        data: filteredAirports,
        getPosition: (d) => [parseFloat(d.lon), parseFloat(d.lat)],
        getIcon: (d) => AIRPORT_ICONS[d.type] || DEFAULT_AIRPORT_ICON,
        getSize: (d) => (selectedAirport && d === selectedAirport ? 28 : 14),
        getColor: (d) => {
          const color = getAltitudeColor(d.elevation_ft, true, useImperial);
          return isZooming ? [color[0], color[1], color[2], 25] : color;
        },
        pickable: true,
        wrapLongitude: true,
        onClick: handleAirportClick,
        onHover: handleAirportHover,
        updateTriggers: {
          getColor: [darkMode, useImperial, isZooming],
          getSize: selectedAirport,
        },
      }),

    // Flight Paths Layer
    ...Object.entries(flightPath || {}).map(([icao24, pathData]) => {
      if (!pathData || !pathData.path_points || pathData.path_points.length === 0) return null;
      // Strip epoch (3rd element) — deck.gl treats it as altitude in meters
      const deckCoords = pathData.path_points.map(([lon, lat]) => [lon, lat]);
      return new PathLayer({
        id: `flight-path-pathlayer-${icao24}`,
        data: [{ coordinates: normalizePathCoordinates(deckCoords) }],
        getPath: d => d.coordinates,
        getColor: [0, 128, 255, 200],
        getWidth: 4,
        widthMinPixels: 2,
        widthMaxPixels: 8,
        capRounded: true,
        jointRounded: true,
        pickable: false,
      });
    }).filter(Boolean),

    // Planes Icon Layer
    showPlanes &&
      new IconLayer({
        id: "planes-base",
        data: filteredPlanes,
        pickable: true,
        wrapLongitude: true,
        iconAtlas: PLANE_ATLAS,
        iconMapping: {
          plane: { x: 0, y: 0, width: 128, height: 128, mask: true },
        },
        getIcon: (d) => "plane",
        getPosition: (d) => [d.lon, d.lat],
        getSize: 30,
        getAngle: (d) => -(d.heading || 0),
        getColor: (d) => {
          const color = getAltitudeColor(d.geo_altitude, false, useImperial);
          // Reduce opacity to 0.1 when zooming
          return isZooming ? [color[0], color[1], color[2], 25] : color;
        },
        onClick: handlePlaneClick,
        onHover: handlePlaneHover,
        updateTriggers: {
          getSize: selectedPlane?.icao24,
          getColor: [useImperial, isZooming],
        },
      }),

    // Selected Plane Outline
    showPlanes &&
      selectedPlane &&
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
    showPlanes &&
      selectedPlane &&
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
        getColor: (d) => getAltitudeColor(d.geo_altitude, false, useImperial),
        updateTriggers: {
          getColor: [useImperial],
        },
      }),

      // Callsign label for selected planes
    showPlanes && selectedFlightsPanels && selectedFlightsPanels.length > 0 &&
      new TextLayer({
        id: 'selected-plane-callsign-labels',
        data: selectedFlightsPanels,
        getPosition: d => [d.lon, d.lat],
        getText: d => d.callsign ? d.callsign : d.icao24.toUpperCase(),
        getSize: () => 12,
        getColor: () => [30, 30, 30, 255],
        getAngle: () => 0,
        getTextAnchor: () => 'middle',
        getAlignmentBaseline: () => 'bottom',
        getPixelOffset: () => [0, 24], // Move label below icon
        background: true,
        backgroundPadding: [2, 2],
        getBackgroundColor: () => [255,255,255,200],
        pickable: false,
        parameters: {
          depthTest: false,
        },
      }),
  ].filter(Boolean);
};
