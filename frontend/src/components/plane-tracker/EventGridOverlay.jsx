import DrapOverlay from "./map/DrapOverlay";
import AuroraOverlay from "./map/AuroraOverlay";
import GeoElectricOverlay from "./map/GeoElectricOverlay";
import ElectricTransmissionLinesOverlay from "./map/ElectricTransmissionLinesOverlay";

const EventGridOverlay = () => {
  return (
    <>
      <DrapOverlay />
      <AuroraOverlay />
      <GeoElectricOverlay />
    </>
  );
};

export default EventGridOverlay;