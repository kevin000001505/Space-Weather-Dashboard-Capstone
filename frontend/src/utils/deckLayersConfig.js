import {
  IconLayer,
  PathLayer,
  TextLayer,
  LineLayer,
  ScatterplotLayer,
  SolidPolygonLayer,
} from "@deck.gl/layers";
import {
  getAltitudeColor,
  PLANE_ATLAS,
  PLANE_OUTLINE_ATLAS,
  getAltDisplay,
  getSpeedDisplay,
  formatCoord,
  capitalizeWords,
} from "./mapUtils";
import {
  getElectricTransmissionLineColor,
  parseLineString,
} from "./electricTransmissionLines";
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
  [255, 140, 0], // Orange
  [46, 204, 113], // Green
  [52, 152, 219], // Blue
  [155, 89, 182], // Purple
  [241, 196, 15], // Yellow
  [26, 188, 156], // Teal
  [255, 105, 180], // Pink
];

const DEFAULT_AIRPORT_ICON = AIRPORT_ICONS.small_airport;

function getZoomScale(
  zoom,
  minZoom = 3,
  maxZoom = 15,
  minScale = 0.5,
  maxScale = 2,
) {
  const clamped = Math.max(minZoom, Math.min(maxZoom, zoom));
  const t = (clamped - minZoom) / (maxZoom - minZoom);
  return minScale + t * (maxScale - minScale);
}

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
  filteredElectricTransmissionLines,
  showAirports,
  showPlanes,
  showElectricTransmissionLines,
  darkMode,
  useImperial,
  selectedPlane,
  selectedAirport,
  selectedElectricTransmissionLine,
  currentZoom,
  isZooming,
  flightPath,
  setSelectedPlane,
  setSelectedAirport,
  setSelectedElectricTransmissionLine,
  dispatch,
  addFlightPanel,
  selectedFlightsPanels,
  addAirportPanel,
  selectedAirportsPanels,
  hoveredRunwayId,
  setHoveredRunwayId,
  airportIconSize,
  flightIconSize,
  globeView,
}) => {
  // Handlers for plane interactions
  const handlePlaneClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        const exists = selectedFlightsPanels.some(
          (f) => f.icao24 === object.icao24,
        );
        addFlightPanel(object);
        if (exists) {
          dispatch({
            type: "flightPath/removeFlightPath",
            payload: object.icao24,
          });
        } else {
          dispatch(fetchFlightPath(object.icao24));
        }
      }, 10);
      return true;
    }
  };
  const handlePlaneHover = ({ object }) => {
    setSelectedPlane(object || null);
    if (object) setSelectedAirport(null);
  };

  // Handlers for airport interactions
  const handleAirportClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        setSelectedAirport(object);
        setSelectedPlane(null);
        const exists = selectedAirportsPanels?.some(
          (a) => a.ident === object.ident,
        );
        addAirportPanel(object);
        if (!exists) {
          dispatch(fetchAirportDetails(object.ident));
        }
      }, 10);
      return true;
    }
  };
  const handleAirportHover = ({ object }) => {
    setSelectedAirport(object || null);
    if (object) setSelectedPlane(null);
  };

  const handleElectricTransmissionLineHover = ({ object }) => {
    setSelectedElectricTransmissionLine(object || null);
    if (object) {
      setSelectedPlane(null);
      setSelectedAirport(null);
    }
  };

  // Extract all runways that have both end coordinates
  const activeRunways = selectedAirportsPanels.flatMap((a) =>
    (a.runways || [])
      .filter((r) => r.le_geom && r.he_geom)
      .map((r, index) => ({ ...r, colorIndex: index })),
  );

  // Extract LE and HE points to draw text labels at the ends of the runways
  const runwayLabels = activeRunways.flatMap((r) => {
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
  const activeNavaidPoints = selectedAirportsPanels.flatMap((a) => {
    const points = [];
    if (!a.navaids) return points;

    a.navaids.forEach((n) => {
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

  const zoomScale = getZoomScale(currentZoom);
  const scaledAirportIconSize = airportIconSize * zoomScale;
  const scaledFlightIconSize = flightIconSize * zoomScale;

  // Highlighted airports: hovered union clicked panels, deduped by ident
  const highlightedAirports = selectedAirport
    ? [
        selectedAirport,
        ...selectedAirportsPanels.filter(
          (a) => a.ident !== selectedAirport.ident,
        ),
      ]
    : [...selectedAirportsPanels];

  // Highlighted planes: hovered union clicked panels, deduped by icao24,
  // filtered to only planes still present in the live feed
  const activePlaneIds = new Set(filteredPlanes.map((p) => p.icao24));
  const highlightedPlanes = selectedPlane
    ? [
        ...(activePlaneIds.has(selectedPlane.icao24) ? [selectedPlane] : []),
        ...selectedFlightsPanels.filter(
          (p) =>
            p.icao24 !== selectedPlane.icao24 && activePlaneIds.has(p.icao24),
        ),
      ]
    : selectedFlightsPanels.filter((p) => activePlaneIds.has(p.icao24));

  const highlightedPlaneIdents = highlightedPlanes
    .map((p) => p.icao24)
    .join(",");
  const highlightedAirportIdents = highlightedAirports
    .map((a) => a.ident)
    .join(",");
  const outlineColor = darkMode ? [255, 255, 255] : [0, 0, 0];

  return [
    //Layer to Prevent Occlusion (icons on the back side of earth appearing)
    new SolidPolygonLayer({
      id: "background-polygon",
      data: [
        [
          [-180, 90],
          [0, 90],
          [180, 90],
          [180, -90],
          [0, -90],
          [-180, -90],
        ],
      ],
      getPolygon: (d) => d,
      stroked: false,
      filled: true,
      getFillColor: [40, 40, 40, 10],
      visible: globeView,
    }),
    
    // Runway Lines Layer
    new LineLayer({
      id: "airport-runways-layer",
      data: activeRunways,
      getSourcePosition: (d) => d.le_geom.coordinates,
      getTargetPosition: (d) => d.he_geom.coordinates,
      getColor: (d) => {
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
      visible: showAirports && activeRunways.length > 0,
      getWidth: 8,
      widthUnits: "pixels",
      pickable: true,
      onHover: ({ object }) => {
        setHoveredRunwayId(object ? object.id : null);
      },
      updateTriggers: {
        getWidth: [hoveredRunwayId],
        getColor: [darkMode, hoveredRunwayId, isZooming],
      },
    }),

    // Runway End Text Labels
    new TextLayer({
      id: "airport-runways-text-layer",
      data: runwayLabels,
      getPosition: (d) => d.coordinates,
      getText: (d) => d.text,
      getSize: 14 * zoomScale,
      getColor: darkMode
        ? [255, 255, 255, isZooming ? 20 : 255]
        : [0, 0, 0, isZooming ? 20 : 255],
      getBackgroundColor: darkMode
        ? [0, 0, 0, isZooming ? 20 : 200]
        : [255, 255, 255, isZooming ? 20 : 200],
      background: true,
      visible: showAirports && runwayLabels.length > 0,
      backgroundPadding: [2, 2],
      fontFamily: "monospace",
      fontWeight: "bold",
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      pickable: false,
      updateTriggers: {
        getSize: [zoomScale],
        getColor: [darkMode, isZooming],
        getBackgroundColor: [darkMode, isZooming],
      },
    }),

    // Navaid Points Layer
    new ScatterplotLayer({
      id: "airport-navaids-layer",
      data: activeNavaidPoints,
      getPosition: (d) => d.coordinates,
      getFillColor: (d) => {
        const color = d.isDME ? [156, 39, 176] : [0, 200, 255];
        return [...color, isZooming ? 25 : 200];
      },
      getLineColor: darkMode
        ? [255, 255, 255, isZooming ? 25 : 255]
        : [0, 0, 0, isZooming ? 25 : 255],
      lineWidthMinPixels: 1,
      stroked: true,
      visible: showAirports && activeNavaidPoints.length > 0,
      getRadius: 5 * zoomScale,
      radiusUnits: "pixels",
      pickable: true,
      updateTriggers: {
        getFillColor: [isZooming],
        getLineColor: [darkMode, isZooming],
        getRadius: [zoomScale],
      },
    }),

    // Airport Highlight Outline — renders below airports-base
    new IconLayer({
      id: "airports-outline",
      data: highlightedAirports,
      getPosition: (d) => [parseFloat(d.lon), parseFloat(d.lat)],
      getIcon: (d) => AIRPORT_ICONS[d.type] || DEFAULT_AIRPORT_ICON,
      getSize: 3 * scaledAirportIconSize,
      getColor: (d) => {
        return isZooming
          ? [outlineColor[0], outlineColor[1], outlineColor[2], 25]
          : outlineColor;
      },
      visible: showAirports && highlightedAirports.length > 0,
      pickable: false,
      wrapLongitude: true,
      updateTriggers: {
        getColor: [darkMode, isZooming],
        getSize: [scaledAirportIconSize],
      },
    }),

    // Airports Icon Layer
    new IconLayer({
      id: "airports-base",
      data: filteredAirports,
      getPosition: (d) => [parseFloat(d.lon), parseFloat(d.lat)],
      getIcon: (d) => AIRPORT_ICONS[d.type] || DEFAULT_AIRPORT_ICON,
      getSize: (d) =>
        highlightedAirports.some((a) => a.ident === d.ident)
          ? 2 * scaledAirportIconSize
          : scaledAirportIconSize,
      getColor: (d) => {
        const color = getAltitudeColor(d.elevation_ft, true, useImperial);
        return isZooming ? [color[0], color[1], color[2], 25] : color;
      },
      visible: showAirports,
      pickable: true,
      wrapLongitude: true,
      getPolygonOffset: ({ layerIndex }) => [0, -layerIndex * 100],
      parameters: {
        cullMode: "none",
      },
      onClick: handleAirportClick,
      onHover: handleAirportHover,
      updateTriggers: {
        getColor: [darkMode, useImperial, isZooming],
        getSize: [scaledAirportIconSize, highlightedAirportIdents],
      },
    }),

    // Electric Transmission Lines Layer
    new PathLayer({
      id: "electric-transmission-lines",
      data: filteredElectricTransmissionLines,
      getPath: (d) => parseLineString(d.geometry),
      getColor: (d) => {
        const color = getElectricTransmissionLineColor(d.VOLTAGE);
        const opacity = d.STATUS === "IN SERVICE" ? 180 : 90;
        return isZooming ? [...color, 25] : [...color, opacity];
      },
      getWidth: 1,
      widthUnits: "pixels",
      pickable: true,
      wrapLongitude: true,
      visible:
        showElectricTransmissionLines &&
        filteredElectricTransmissionLines.length > 0,
      onHover: handleElectricTransmissionLineHover,
      updateTriggers: {
        getColor: [isZooming],
        getPath: [filteredElectricTransmissionLines.length],
        getWidth: [selectedElectricTransmissionLine],
      },
    }),

    // Flight Paths Layer
    ...Object.entries(flightPath || {})
      .map(([icao24, pathData]) => {
        if (
          !pathData ||
          !pathData.path_points ||
          pathData.path_points.length === 0
        )
          return null;
        // Strip epoch (3rd element) — deck.gl treats it as altitude in meters
        const deckCoords = pathData.path_points.map(([lon, lat]) => [lon, lat]);
        return new PathLayer({
          id: `flight-path-pathlayer-${icao24}`,
          data: [{ coordinates: normalizePathCoordinates(deckCoords) }],
          getPath: (d) => d.coordinates,
          getColor: [0, 128, 255, 200],
          getWidth: 4,
          widthMinPixels: 2,
          widthMaxPixels: 8,
          capRounded: true,
          jointRounded: true,
          pickable: false,
        });
      })
      .filter(Boolean),

    // Planes Icon Layer
    new IconLayer({
      id: "planes-base",
      data: filteredPlanes,
      pickable: true,
      wrapLongitude: true,
      iconAtlas: PLANE_ATLAS,
      iconMapping: {
        plane: { x: 0, y: 0, width: 128, height: 128, mask: true },
      },
      visible: showPlanes,
      getIcon: (d) => "plane",
      getPosition: (d) => [d.lon, d.lat],
      getSize: (d) =>
        highlightedPlanes.some((p) => p.icao24 === d.icao24)
          ? 2 * scaledFlightIconSize
          : scaledFlightIconSize,
      getAngle: (d) => -(d.heading || 0),
      getColor: (d) => {
        const color = getAltitudeColor(d.geo_altitude, false, useImperial);
        // Reduce opacity to 0.1 when zooming
        return isZooming ? [color[0], color[1], color[2], 25] : color;
      },
      parameters: {
        cullMode: "none",
      },
      onClick: handlePlaneClick,
      onHover: handlePlaneHover,
      updateTriggers: {
        getSize: [scaledFlightIconSize, highlightedPlaneIdents],
        getColor: [useImperial, isZooming],
      },
    }),

    // Plane Highlight Outline (hovered + clicked panels)
    new IconLayer({
      id: "selected-plane-outline",
      data: highlightedPlanes,
      iconAtlas: PLANE_OUTLINE_ATLAS,
      iconMapping: {
        plane: { x: 0, y: 0, width: 128, height: 128, mask: true },
      },
      getIcon: (d) => "plane",
      getPosition: (d) => [d.lon, d.lat],
      wrapLongitude: true,
      getSize: 2.15 * scaledFlightIconSize,
      visible: showPlanes && highlightedPlanes.length > 0,
      getAngle: (d) => -(d.heading || 0),
      getColor: () =>
        isZooming
          ? [outlineColor[0], outlineColor[1], outlineColor[2], 25]
          : outlineColor,
      updateTriggers: {
        getColor: [darkMode, isZooming],
        getSize: [scaledFlightIconSize],
      },
    }),

    // Callsign label for selected planes
    new TextLayer({
      id: "selected-plane-callsign-labels",
      data: selectedFlightsPanels,
      getPosition: (d) => [d.lon, d.lat],
      getText: (d) => (d.callsign ? d.callsign : d.icao24.toUpperCase()),
      getSize: 12 * zoomScale,
      getColor: () => [30, 30, 30, 255],
      getAngle: () => 0,
      getTextAnchor: () => "middle",
      getAlignmentBaseline: () => "bottom",
      getPixelOffset: () => [0, 24],
      background: true,
      visible:
        showPlanes && selectedFlightsPanels && selectedFlightsPanels.length > 0,
      backgroundPadding: [2, 2],
      getBackgroundColor: () => [255, 255, 255, 200],
      pickable: false,
      parameters: {
        depthTest: false,
      },
      updateTriggers: {
        getSize: [zoomScale],
      },
    }),
  ].filter(Boolean);
};
