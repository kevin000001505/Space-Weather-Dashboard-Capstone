import { useEffect, useMemo, useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { useDispatch, useSelector } from "react-redux";
import { fetchAirportDetails } from "../../api/api";
import {
  setSearchOpen,
  setSearchResults,
  setSelectedAirport,
  setSelectedPlane,
  setViewState,
  addAirportPanel,
} from "../../store/slices/uiSlice";

const SearchBar = () => {
  const dispatch = useDispatch();
  const planes = useSelector((state) => state.planes.data);
  const airports = useSelector((state) => state.airports.data);
  const { viewState } = useSelector((state) => state.ui);

  const [query, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);
  const useImperial = useSelector((state) => state.ui.useImperial);
  const options = useMemo(() => {
    if (query.trim() === "" || query.trim().length < 3) return [];
    const lowerQuery = query.toLowerCase();
    const planeMatches = planes.map((p) => ({
      type: "plane",
      data: p,
      key: `${p.icao24} ${p.callsign}`,
    }));
    const airportMatches = airports.map((a) => ({
      type: "airport",
      data: a,
      key: a.ident,
    }));
    return [...planeMatches, ...airportMatches];
  }, [planes, airports, query]);

  const handleSelect = (event, item) => {
    if (!item) return;
    if (item.type === "plane") {
      const plane = item.data;
      if (plane.lat && plane.lon) {
        dispatch(setSelectedPlane(plane));
        dispatch(setSelectedAirport(null));
        dispatch(
          setViewState({
            ...viewState,
            longitude: plane.lon,
            latitude: plane.lat,
            zoom: 10,
            transitionDuration: 1500,
          }),
        );
      }
    } else if (item.type === "airport") {
      const airport = item.data;
      const lat = parseFloat(airport.lat);
      const lon = parseFloat(airport.lon);

      dispatch(setSelectedAirport(airport));
      dispatch(setSelectedPlane(null));
      dispatch(
        setViewState({
          ...viewState,
          longitude: lon,
          latitude: lat,
          zoom: 10,
          transitionDuration: 1500,
        }),
      );

      dispatch(addAirportPanel(airport));
      dispatch(fetchAirportDetails(airport.ident));
    }

    setSearchQuery("");
  };

  const darkMode = useSelector((state) => state.ui.darkMode);
  return (
    <div
      style={{
        background: "rgba(34, 40, 60, 0.35)",
        backdropFilter: "blur(6px)",
        borderRadius: "8px",
        boxShadow: "var(--ui-shadow)",
        position: "absolute",
        top: "10px",
        left: "20px",
        zIndex: 1,
        fontSize: "12px",
        color: "var(--ui-text)",
      }}
    >
      <Autocomplete
        freeSolo
        disableClearable
        options={options}
        disableCloseOnSelect
        getOptionKey={(o) => o.key}
        getOptionLabel={(option) =>
          option.type === "plane"
            ? `${option.data.callsign} ${option.data.icao24}`
            : `${option.key} ${option.data.name} ${option.data.iata_code} ${option.data.gps_code}`
        }
        inputValue={query}
        onInputChange={(_, value, reason) => {
          if (reason === "input") {
            setSearchQuery(value);
          }
        }}
        blurOnSelect
        onChange={handleSelect}
        renderOption={(props, item) => (
          <li
            {...props}
            style={{
              padding: 0,
              margin: 0,
              background: darkMode ? "#23272e" : "#fff",
              borderBottom: darkMode
                ? "1px solid #2e2e3a"
                : "1px solid #e3e6ff",
              boxShadow: "none",
              transition: "background 0.2s",
              minHeight: 0,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                gap: 8,
                padding: "8px 12px",
                background: "none",
              }}
            >
              <span
                style={{
                  fontSize: "1.1em",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background:
                    item.type === "plane"
                      ? darkMode
                        ? "rgba(21,101,192,0.18)"
                        : "#e3e6ff"
                      : darkMode
                        ? "rgba(46,125,50,0.18)"
                        : "#e6ffe3",
                  color:
                    item.type === "plane"
                      ? darkMode
                        ? "#7f5cff"
                        : "#1565c0"
                      : darkMode
                        ? "#55ff99"
                        : "#2e7d32",
                  marginLeft: 8,
                  fontWeight: 700,
                  minWidth: 28,
                  textAlign: "center",
                }}
              >
                {item.type === "plane" ? "✈️" : "📍"}
              </span>
              {/* Main label */}
              <span
                style={{
                  flex: 1,
                  color: darkMode ? "#fff" : "#23272e",
                  fontSize: "1em",
                  fontWeight: 600,
                  letterSpacing: 0.1,
                }}
              >
                {item.type === "plane"
                  ? item.data.callsign || item.data.icao24
                  : item.data.name}
              </span>
              {/* Altitude badge for planes */}
              {item.type === "plane" && (
                <span
                  style={{
                    background: darkMode ? "rgba(127,92,255,0.15)" : "#e3e6ff",
                    color: darkMode ? "#fff" : "#22234a",
                    border: darkMode
                      ? "1px solid #7f5cff"
                      : "1px solid #bfcaff",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    fontSize: "0.95em",
                    marginLeft: 8,
                    fontWeight: 600,
                    minWidth: 56,
                    textAlign: "center",
                    letterSpacing: 0.5,
                    boxShadow: darkMode
                      ? "0 1px 2px #0002"
                      : "0 1px 2px #bfcaff44",
                  }}
                >
                  {useImperial
                    ? `${Math.round((item.data.geo_altitude || 0) * 3.28084)} ft`
                    : `${Math.round(item.data.geo_altitude || 0)} m`}
                </span>
              )}
              {/* Airport code badge for airports */}
              {item.type === "airport" && (
                <span
                  style={{
                    background: darkMode ? "rgba(46,125,50,0.15)" : "#e6ffe3",
                    color: darkMode ? "#55ff99" : "#2e7d32",
                    padding: "2px 8px",
                    fontSize: "0.95em",
                    marginLeft: 8,
                    fontWeight: 600,
                    minWidth: 40,
                    textAlign: "center",
                    letterSpacing: 0.5,
                    boxShadow: darkMode
                      ? "0 1px 2px #0002"
                      : "0 1px 2px #bfffc944",
                  }}
                >
                  {item.data.iata_code || item.data.gps_code}
                </span>
              )}
            </span>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            fullWidth
            placeholder="Search flight or airport..."
            sx={{
              height: "46px",
              m: 0,
              width: "100%",
              backdropFilter: "blur(4px)",
              borderRadius: "8px",
              color: "#fff",
              "& .MuiInputBase-root": {
                color: "#fff",
                backdropFilter: "blur(4px)",
                borderRadius: "8px",
                fontSize: "1em",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: darkMode ? "#7f5cff" : "#1976d2",
              },
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: darkMode ? "#7f5cff" : "#1976d2",
                },
              "& .MuiInputBase-input::placeholder": {
                color: "#fff",
                opacity: 1,
              },
            }}
            slotProps={{
              htmlInput: {
                ...params.inputProps,
                style: {
                  fontSize: 14,
                  backdropFilter: "blur(4px)",
                  color: "#fff",
                  padding: "8px",
                },
                autoComplete: "off",
              },
            }}
          />
        )}
        sx={{
          width: "340px",
          color: darkMode ? "#fff" : "#222",
          boxShadow: "var(--ui-shadow)",
          borderRadius: "8px",
        }}
        slotProps={{
          listbox: {
            sx: {
              p: 0,
              "& .MuiAutocomplete-groupUl": {
                p: 0,
              },
            },
          },
        }}
      />
    </div>
  );
};

export default SearchBar;
