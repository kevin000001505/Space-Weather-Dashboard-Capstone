// Converts power grid CSV row objects to GeoJSON FeatureCollection of LineString features
// Expects: array of objects with geometry as WKT LINESTRING and properties (VOLTAGE, VOLT_CLASS, TYPE, STATUS, etc.)

export function parseLineString(wkt) {
  // "LINESTRING (lon1 lat1, lon2 lat2, ...)"
  const match = wkt.match(/LINESTRING \(([^)]+)\)/);
  if (!match) return [];
  return match[1].split(",").map((pair) => {
    const [lon, lat] = pair.trim().split(/\s+/).map(Number);
    return [lon, lat];
  });
}

export function getElectricTransmissionLineColor(voltage) {
  if (voltage >= 1000) return [255, 102, 0];
  if (voltage >= 700) return [255, 140, 0];
  if (voltage >= 500) return [0, 128, 255];
  if (voltage >= 400) return [0, 153, 255];
  if (voltage >= 350) return [0, 255, 255];
  if (voltage >= 300) return [0, 255, 106];
  if (voltage >= 200) return [200, 59, 255];
  return [255, 204, 0];
}

export function filterElectricTransmissionLines(
  electricTransmissionLinesRows,
  {
    electricTransmissionLinesVoltageRange,
    showOnlyInServiceLines,
    dontShowInferredLines,
    showACLines,
    showDCLines,
    showOverheadLines,
    showUndergroundLines,
  },
) {
  if (!Array.isArray(electricTransmissionLinesRows)) {
    return [];
  }

  if (!Array.isArray(electricTransmissionLinesVoltageRange)) {
    return [];
  }

  return electricTransmissionLinesRows.filter((line) => {
    if (typeof line.VOLTAGE !== "number") return false;
    if (showOnlyInServiceLines && line.STATUS !== "IN SERVICE") return false;
    if (dontShowInferredLines && line.INFERRED !== "N") return false;

    const type = String(line.TYPE ?? "").toUpperCase();
    const hasOverhead = type.includes("OVERHEAD");
    const hasUnderground = type.includes("UNDERGROUND");
    const hasAC = type.includes("AC");
    const hasDC = type.includes("DC");

    const matchesConstruction =
      (showOverheadLines && hasOverhead) ||
      (showUndergroundLines && hasUnderground);
    const matchesCurrentType = (showACLines && hasAC) || (showDCLines && hasDC);

    if (!matchesConstruction) return false;
    if (!matchesCurrentType) return false;

    return (
      line.VOLTAGE >= electricTransmissionLinesVoltageRange[0] &&
      line.VOLTAGE <= electricTransmissionLinesVoltageRange[1]
    );
  });
}

export function getElectricTransmissionLinesGeoJSON(electricTransmissionLinesRows) {
  return {
    type: "FeatureCollection",
    features: electricTransmissionLinesRows.map((row) => ({
      type: "Feature",
      properties: {
        ...row,
      },
      geometry: {
        type: "LineString",
        coordinates: parseLineString(row.geometry),
      },
    })),
  };
}
export const getElectricTransmissionLinesLayers = () => {
  return [
    {
      id: "electric-transmission-lines",
      type: "line",
      source: "electric-transmission-lines",
      paint: {
        "line-color": [
          "case",
          [">=", ["get", "VOLTAGE"], 1000],
          "rgb(255,102,0)", // >=1000kV = dark orange
          [">=", ["get", "VOLTAGE"], 700],
          "rgb(255,140,0)", // >=700kV = orange
          [">=", ["get", "VOLTAGE"], 500],
          "rgb(0, 128, 255)", // >=500kV = blue
          [">=", ["get", "VOLTAGE"], 400],
          "rgb(0, 153, 255)", // >=400kV = cyan
          [">=", ["get", "VOLTAGE"], 350],
          "rgb(0, 255, 255)", // >=350kV = teal
          [">=", ["get", "VOLTAGE"], 300],
          "rgb(0, 255, 106)", // >=300kV = green
          [">=", ["get", "VOLTAGE"], 200],
          "rgb(200, 59, 255)", // >=200kV = purple
          "rgb(255, 204, 0)", // default: yellow
        ],
        "line-width": 1,
        "line-opacity": [
          "case",
          ["==", ["get", "STATUS"], "IN SERVICE"],
          0.7,
          0.3,
        ],
      },
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      filter: ["==", ["geometry-type"], "LineString"],
    },
  ];
};
