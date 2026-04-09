import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Popup, Source, Layer } from "react-map-gl/maplibre";

import {
  getElectricTransmissionLinesGeoJSON,
  getElectricTransmissionLinesLayers,
} from "../../../utils/electricTransmissionLines";
import TransmissionLinePopup from "./TransmissionLinePopup";

const ElectricTransmissionLinesOverlay = ({
  hoveredElectricTransmissionLines,
}) => {
  const { useImperial } = useSelector(
    (state) => state.ui,
  );
  const electricTransmissionLinesState = useSelector(
    (state) => state.electricTransmissionLines,
  );

  const {
    electricTransmissionLinesGeoJson,
    electricTransmissionLinesMapLayers,
  } = useMemo(() => {
    const {
      data,
      electricTransmissionLinesVoltageRange,
      showOnlyInServiceLines,
      dontShowInferredLines,
      showACLines,
      showDCLines,
      showOverheadLines,
      showUndergroundLines,
    } = electricTransmissionLinesState;

    if (!data || !Array.isArray(data)) {
      return {
        electricTransmissionLinesGeoJson: null,
        electricTransmissionLinesMapLayers: null,
      };
    }

    if (!Array.isArray(electricTransmissionLinesVoltageRange)) {
      return {
        electricTransmissionLinesGeoJson: null,
        electricTransmissionLinesMapLayers: null,
      };
    }

    const filteredElectricTransmissionLines = data.filter((line) => {
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

    return {
      electricTransmissionLinesGeoJson: getElectricTransmissionLinesGeoJSON(
        filteredElectricTransmissionLines,
      ),
      electricTransmissionLinesMapLayers: getElectricTransmissionLinesLayers(),
    };
  }, [electricTransmissionLinesState]);

  if (
    !electricTransmissionLinesState.showElectricTransmissionLines ||
    !electricTransmissionLinesGeoJson ||
    !electricTransmissionLinesMapLayers ||
    electricTransmissionLinesGeoJson.features?.length === 0
  ) {
    return null;
  }

  return (
    <>
      <Source
        id="electric-transmission-lines"
        type="geojson"
        data={electricTransmissionLinesGeoJson}
      >
        {electricTransmissionLinesMapLayers.map((layer) => (
          <Layer key={layer.id} {...layer} />
        ))}
      </Source>

      {hoveredElectricTransmissionLines?.lngLat && hoveredElectricTransmissionLines?.feature && (
        <Popup
          longitude={hoveredElectricTransmissionLines.lngLat.lng}
          latitude={hoveredElectricTransmissionLines.lngLat.lat}
          closeButton={false}
          closeOnClick={false}
          anchor="top"
          offset={10}
        >
          <TransmissionLinePopup
            hoveredElectricTransmissionLines={hoveredElectricTransmissionLines}
            useImperial={useImperial}
          />
        </Popup>
      )}
    </>
  );
};

export default ElectricTransmissionLinesOverlay;
