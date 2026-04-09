import { Popup } from "react-map-gl/maplibre";
import { useDispatch, useSelector } from "react-redux";

import { setSelectedAirport, setSelectedPlane } from "../../../store/slices/uiSlice";
import { getAltDisplay, getSpeedDisplay, formatCoord, capitalizeWords } from "../../../utils/mapUtils";

const SelectedEntityPopups = () => {
  const dispatch = useDispatch();
  const {
    showAirports,
    selectedAirport,
    showPlanes,
    selectedPlane,
    useImperial,
  } = useSelector((state) => state.ui);

  return (
    <>
      {showAirports && selectedAirport && (
        <Popup
          longitude={parseFloat(selectedAirport.lon)}
          latitude={parseFloat(selectedAirport.lat)}
          closeOnClick={false}
          onClose={() => dispatch(setSelectedAirport(null))}
          anchor="top"
          offset={30}
        >
          <div style={{ padding: "8px", minWidth: "150px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "0.875rem" }}>
              {selectedAirport.name}
            </h3>
            <div style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>
              <strong>Code:</strong>{" "}
              {selectedAirport.iata_code || selectedAirport.gps_code || "N/A"}
              <br />
              <strong>Type:</strong> {capitalizeWords(selectedAirport.type)}
              <br />
              <strong>Location:</strong>{" "}
              {selectedAirport.municipality || "N/A"}, {selectedAirport.country}
              <br />
              <strong>Elevation:</strong>{" "}
              {getAltDisplay(selectedAirport.elevation_ft, true, useImperial)}
              <br />
              <strong>Position:</strong> {formatCoord(selectedAirport.lat)}, {formatCoord(selectedAirport.lon)}°
            </div>
          </div>
        </Popup>
      )}

      {showPlanes && selectedPlane && (
        <Popup
          longitude={parseFloat(selectedPlane.lon)}
          latitude={parseFloat(selectedPlane.lat)}
          closeOnClick={false}
          onClose={() => dispatch(setSelectedPlane(null))}
          anchor="bottom"
          offset={30}
        >
          <div style={{ padding: "8px", minWidth: "180px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "0.875rem" }}>
              {selectedPlane.callsign || selectedPlane.icao24.toUpperCase()}
            </h3>
            <div style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>
              <strong>ICAO24:</strong> {selectedPlane.icao24.toUpperCase()}
              <br />
              <strong>Altitude:</strong>{" "}
              {getAltDisplay(selectedPlane.geo_altitude, false, useImperial)}
              <br />
              <strong>Speed:</strong>{" "}
              {getSpeedDisplay(selectedPlane.velocity, false, useImperial)}
              <br />
              <strong>Heading:</strong> {formatCoord(selectedPlane.heading)}
              <br />
              <strong>Position:</strong> {formatCoord(selectedPlane.lat)}, {formatCoord(selectedPlane.lon)}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default SelectedEntityPopups;
