import { ScatterplotLayer, IconLayer } from "@deck.gl/layers";
import {
  getAltitudeColor,
  PLANE_ATLAS,
  PLANE_OUTLINE_ATLAS,
} from "./mapUtils";

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

  return [
    // Airports Scatterplot Layer
    showAirports &&
      new ScatterplotLayer({
        id: "airports-base",
        data: filteredAirports,
        getPosition: (d) => [parseFloat(d.lon), parseFloat(d.lat)],
        getFillColor: (d) => {
          return getAltitudeColor(d.elevation_ft, true, useImperial);
        },
        getRadius: 5,
        radiusUnits: "pixels",
        lineWidthMinPixels: 1,
        stroked: true,
        getLineColor: [0, 0, 0, 100],
        pickable: true,
        onClick: handleAirportClick,
        opacity: isZooming ? 0.05 : 1,
        updateTriggers: { getFillColor: darkMode },
      }),

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
        getRadius: 7,
        radiusUnits: "pixels",
        lineWidthMinPixels: 2,
        stroked: true,
        getLineColor: darkMode ? [255, 255, 255, 255] : [0, 0, 0, 255],
        updateTriggers: {
          getLineColor: darkMode,
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
  ].filter(Boolean);
};
