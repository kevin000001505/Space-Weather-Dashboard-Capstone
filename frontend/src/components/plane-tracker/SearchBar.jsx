import React, { useEffect, useMemo, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { useDispatch, useSelector } from "react-redux";
import { fetchAirportDetails } from "../../api/api";
import {
  setSelectedAirport,
  setSelectedPlane,
  setViewState,
  addAirportPanel,
} from "../../store/slices/uiSlice";

const MAX_RESULTS_PER_TYPE = 50;
const LOAD_MORE_STEP = 50;

const normalizeText = (value) => (value ?? "").toString().toLowerCase().trim();

const toTitleCase = (value) =>
  stripParentheticalNoise(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const toUpperCase = (value) => stripParentheticalNoise(value).toUpperCase();

// Remove API noise from labels by stripping parenthetical fragments, leading punctuation,
// and repeated whitespace so only the readable name remains.
const stripParentheticalNoise = (value) =>
  (value ?? "")
    .toString()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/^[\s?.,!:'"“”‘’()[\]-]+/, "")
    .replace(/\s+/g, " ")
    .trim();

const buildSearchText = (fields) => fields.map((field) => normalizeText(field)).join(" ").trim();

const rankSearchHit = (text, query) => {
  if (!text || !query) return null;

  if (!text.includes(query)) return null;

  if (text.startsWith(query)) return 3;

  if (text.split(/\s+/).some((part) => part.startsWith(query))) return 2;

  return 1;
};

const compareByRank = (left, right) => {
  if (right.rank !== left.rank) return right.rank - left.rank;
  return left.label.localeCompare(right.label);
};

const SearchBar = React.forwardRef(function SearchBar(props, ref) {
  const dispatch = useDispatch();
  const planes = useSelector((state) => state.planes.data);
  const airports = useSelector((state) => state.airports.data);
  const { viewState } = useSelector((state) => state.ui);

  const [query, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [visiblePlaneLimit, setVisiblePlaneLimit] = useState(MAX_RESULTS_PER_TYPE);
  const [visibleAirportLimit, setVisibleAirportLimit] = useState(MAX_RESULTS_PER_TYPE);
  const listboxRef = useRef(null);
  const pendingScrollTopRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setVisiblePlaneLimit(MAX_RESULTS_PER_TYPE);
    setVisibleAirportLimit(MAX_RESULTS_PER_TYPE);
  }, [debouncedQuery]);

  const useImperial = useSelector((state) => state.ui.useImperial);
  const options = useMemo(() => {
    const normalizedQuery = normalizeText(debouncedQuery);
    if (normalizedQuery.length < 1) return [];

    const planeMatches = planes
      .map((plane, index) => {
        const label = toUpperCase(plane.callsign || plane.icao24 || "");
        const searchableText = buildSearchText([
          plane.callsign,
          plane.icao24,
          plane.origin_country,
          plane.registration,
        ]);
        const rank = rankSearchHit(searchableText, normalizedQuery);

        if (rank === null) return null;

        return {
          type: "plane",
          data: plane,
          key: `${plane.icao24} ${plane.callsign} ${index}`,
          label: label || toUpperCase(plane.icao24),
          rank,
        };
      })
      .filter(Boolean)
      .sort(compareByRank);

    const airportMatches = airports
      .map((airport, index) => {
        const label = stripParentheticalNoise(airport.name || airport.ident || "");
        const searchableText = buildSearchText([
          airport.ident,
          airport.name,
          airport.iata_code,
          airport.gps_code,
          airport.icao_code,
          airport.municipality,
          airport.country,
        ]);
        const rank = rankSearchHit(searchableText, normalizedQuery);

        if (rank === null) return null;

        return {
          type: "airport",
          data: airport,
          key: `${airport.ident} ${index}`,
          label: label || toTitleCase(airport.ident),
          rank,
        };
      })
      .filter(Boolean)
      .sort(compareByRank);

    const visiblePlaneMatches = planeMatches.slice(0, visiblePlaneLimit);
    const visibleAirportMatches = airportMatches.slice(0, visibleAirportLimit);
    const hiddenPlaneCount = Math.max(0, planeMatches.length - visiblePlaneMatches.length);
    const hiddenAirportCount = Math.max(
      0,
      airportMatches.length - visibleAirportMatches.length,
    );

    const hiddenCount = hiddenPlaneCount + hiddenAirportCount;

    const results = [...visiblePlaneMatches, ...visibleAirportMatches];

    if (hiddenCount > 0) {
      results.push({
        type: "load-more",
        key: "load-more-results",
        hiddenCount,
        hiddenPlaneCount,
        hiddenAirportCount,
      });
    }

    return results;
  }, [airports, debouncedQuery, planes, visibleAirportLimit, visiblePlaneLimit]);

  useEffect(() => {
    if (pendingScrollTopRef.current == null) return;

    const targetScrollTop = pendingScrollTopRef.current;
    let frameId = 0;
    let nestedFrameId = 0;

    const restoreScrollTop = () => {
      const listboxElement = listboxRef.current;
      if (listboxElement) {
        listboxElement.scrollTop = targetScrollTop;
      }
      pendingScrollTopRef.current = null;
    };

    frameId = window.requestAnimationFrame(() => {
      nestedFrameId = window.requestAnimationFrame(restoreScrollTop);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(nestedFrameId);
    };
  }, [visiblePlaneLimit, visibleAirportLimit]);

  const handleSelect = (event, item) => {
    if (!item) return;

    if (item.type === "load-more") {
      pendingScrollTopRef.current = listboxRef.current?.scrollTop ?? lastScrollTopRef.current ?? 0;
      setVisiblePlaneLimit((current) => current + LOAD_MORE_STEP);
      setVisibleAirportLimit((current) => current + LOAD_MORE_STEP);
      return;
    }

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
      ref={ref}
      style={{
        background: "rgba(34, 40, 60, 0.35)",
        backdropFilter: "blur(6px)",
        borderRadius: "8px",
        boxShadow: "var(--ui-shadow)",
        position: "absolute",
        top: "10px",
        left: "20px",
        zIndex: 1,
        fontSize: "0.875rem",
        color: "var(--ui-text)",
      }}
    >
      <Autocomplete
        freeSolo
        disableClearable
        value={null}
        options={options}
        filterOptions={(filteredOptions) => filteredOptions}
        disableCloseOnSelect
        getOptionKey={(o) => o.key}
        getOptionLabel={(option) =>
          option.type === "load-more"
            ? `${option.hiddenCount} hidden`
            : option.type === "plane"
              ? `${option.label} ${toUpperCase(option.data.icao24)}`
              : `${option.label} ${toUpperCase(option.data.iata_code || option.data.gps_code || "")}`
        }
        isOptionEqualToValue={(option, value) => option.key === value?.key}
        inputValue={query}
        onInputChange={(_, value, reason) => {
          if (reason === "input") {
            setSearchQuery(value);
          }
        }}
        blurOnSelect
        onChange={handleSelect}
        renderOption={(props, item) => {
          if (item.type === "load-more") {
            return (
              <li
                {...props}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  pendingScrollTopRef.current = listboxRef.current?.scrollTop ?? lastScrollTopRef.current ?? 0;
                  setVisiblePlaneLimit((current) => current + LOAD_MORE_STEP);
                  setVisibleAirportLimit((current) => current + LOAD_MORE_STEP);
                }}
                style={{
                  padding: 0,
                  margin: 0,
                  background: darkMode ? "#1f2430" : "#f8faff",
                  borderTop: darkMode ? "1px solid #2e2e3a" : "1px solid #d8def8",
                  boxShadow: "none",
                  minHeight: 0,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    width: "100%",
                    padding: "10px 12px",
                    color: darkMode ? "#f4f6ff" : "#20253a",
                    pointerEvents: "none",
                  }}
                >
                  <strong style={{ fontSize: "0.95em" }}>
                    {item.hiddenCount} hidden results
                  </strong>
                  <span style={{ fontSize: "0.85em", opacity: 0.85 }}>
                    {item.hiddenPlaneCount} flights and {item.hiddenAirportCount} airports hidden.
                    Optimize your search query, click to load more.
                  </span>
                </span>
              </li>
            );
          }

          return (
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
                    ? toUpperCase(item.label || item.data.callsign || item.data.icao24)
                    : toTitleCase(item.label || item.data.name)}
                </span>
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
                    {toUpperCase(item.data.iata_code || item.data.gps_code)}
                  </span>
                )}
              </span>
            </li>
          );
        }}
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
                  fontSize: "1rem",
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
            ref: listboxRef,
            onScroll: (event) => {
              lastScrollTopRef.current = event.currentTarget.scrollTop;
            },
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
});

export default SearchBar;
