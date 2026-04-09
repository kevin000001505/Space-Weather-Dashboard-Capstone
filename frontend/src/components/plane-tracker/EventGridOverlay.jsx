import DrapOverlay from "./map/DrapOverlay";
import AuroraOverlay from "./map/AuroraOverlay";
import GeoElectricOverlay from "./map/GeoElectricOverlay";
import ElectricTransmissionLinesOverlay from "./map/ElectricTransmissionLinesOverlay";

const EventGridOverlay = ({ hoveredElectricTransmissionLines }) => {
  return (
    <>
      <DrapOverlay />
      <AuroraOverlay />
      <GeoElectricOverlay />
      <ElectricTransmissionLinesOverlay
        hoveredElectricTransmissionLines={hoveredElectricTransmissionLines}
      />
    </>
  );
};

export default EventGridOverlay;