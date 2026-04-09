const TransmissionLinePopup = ({ hoveredElectricTransmissionLines, useImperial }) => {
  if (!hoveredElectricTransmissionLines?.lngLat || !hoveredElectricTransmissionLines?.feature) {
    return null;
  }

  return (
    <div style={{ padding: "8px", minWidth: "150px" }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: "0.875rem" }}>
        {hoveredElectricTransmissionLines.feature.properties.OWNER ??
          hoveredElectricTransmissionLines.feature.properties.SUB_1 ??
          hoveredElectricTransmissionLines.feature.properties.SUB_2}
      </h3>
      <div style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>
        <strong>Voltage Level:</strong>{" "}
        {hoveredElectricTransmissionLines.feature.properties.VOLTAGE} kV
        <br />
        <strong>Type:</strong>{" "}
        {hoveredElectricTransmissionLines.feature.properties.TYPE}
        <br />
        <strong>Status:</strong>{" "}
        {hoveredElectricTransmissionLines.feature.properties.STATUS}
        <br />
        <strong>Source:</strong>{" "}
        {hoveredElectricTransmissionLines.feature.properties.SOURCE &&
        hoveredElectricTransmissionLines.feature.properties.SOURCE.length > 30
          ? hoveredElectricTransmissionLines.feature.properties.SOURCE.slice(
              0,
              30,
            ) + "..."
          : hoveredElectricTransmissionLines.feature.properties.SOURCE}
        <br />
        <strong>Voltage Source:</strong>{" "}
        {hoveredElectricTransmissionLines.feature.properties.INFERRED === "Y"
          ? "Estimated"
          : "Reported"}
        <br />
        <strong>From Substation:</strong>{" "}
        {hoveredElectricTransmissionLines.feature.properties.SUB_1}
        <br />
        <strong>To Substation:</strong>{" "}
        {hoveredElectricTransmissionLines.feature.properties.SUB_2}
        <br />
        <strong>Length:</strong>{" "}
        {useImperial
          ? (
              hoveredElectricTransmissionLines.feature.properties.SHAPE__Len * 0.000621371
            ).toFixed(2) + " mi"
          : (
              hoveredElectricTransmissionLines.feature.properties.SHAPE__Len / 1000
            ).toFixed(2) + " km"}
      </div>
    </div>
  );
};

export default TransmissionLinePopup;
