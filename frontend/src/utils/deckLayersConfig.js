import { ScatterplotLayer, IconLayer, LineLayer, PathLayer, TextLayer } from "@deck.gl/layers";
import { getAltitudeColor, PLANE_ATLAS, PLANE_OUTLINE_ATLAS } from "./mapUtils";
import { fetchFlightPath } from "../api/api";

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

const DEFAULT_AIRPORT_ICON = AIRPORT_ICONS.small_airport;

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
}) => {
  const handlePlaneClick = ({ object }) => {
    if (object) {
      addFlightPanel(object);
      // Optionally fetch flight path or set selection
        dispatch(fetchFlightPath(object.icao24));
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

  const handleAirportClick = ({ object }) => {
    if (object) {
      setTimeout(() => {
        setSelectedAirport(object);
        setSelectedPlane(null);
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

  return [

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
        onClick: handleAirportClick,
        onHover: handleAirportHover,
        updateTriggers: {
          getColor: [darkMode, useImperial, isZooming],
          getSize: selectedAirport,
        },
      }),
    ...Object.entries(flightPath || {}).map(([icao24, pathData]) => (
      pathData && pathData.path_geojson && pathData.path_geojson.coordinates &&
      new PathLayer({
        id: `flight-path-pathlayer-${icao24}`,
        data: [pathData.path_geojson],
        getPath: d => d.coordinates,
        getColor: [0, 128, 255, 200],
        getWidth: 4,
        widthMinPixels: 2,
        widthMaxPixels: 8,
        rounded: true,
        capRounded: true,
        jointRounded: true,
        pickable: false,
      })
    )).filter(Boolean),
    // Planes Icon Layer
    showPlanes &&
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

    // Removed Selected Airport Highlight

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
        backgroundColor: [255,255,255,200],
        pickable: false,
        parameters: {
          depthTest: false,
        },
      }),
  ].filter(Boolean);
};
