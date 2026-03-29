import { useDispatch, useSelector } from "react-redux";
import {
  setShowSettings,
  setSettingsTabIndex,
  setAltitudeRange,
  setAirportAltitudeRange,
  setAirportFilter,
  setDrapRegionRange,
  setAuroraRegionRange,
  setFlightIconSize,
  setAirportIconSize,
} from "../../store/slices/uiSlice";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import { useEffect, useMemo, useRef, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import { Rnd } from "react-rnd";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { setGeoElectricLogRange } from "../../store/slices/geoElectricSlice";
import ButtonsControl from "./ui/ButtonsControl";
import { Card, CardContent, CardHeader, Slide } from "@mui/material";

const PANEL_WIDTH = 450;
const SettingsPanel = () => {
  const dispatch = useDispatch();
  const {
    darkMode,
    useImperial,
    showSettings,
    settingsTabIndex,
    altitudeRange,
    airportAltitudeRange,
    airportFilter,
    drapRegionRange,
    auroraRegionRange,
    airportIconSize,
    flightIconSize,
  } = useSelector((state) => state.ui);
  const planes = useSelector((state) => state.planes.data);
  const { geoElectricLogRange } = useSelector((state) => state.geoelectric);
  const airports = useSelector((state) => state.airports.data);
  const drapPoints = useSelector((state) => state.drap.points);
  const auroraData = useSelector((state) => state.aurora.data);
  const geoelectricData = useSelector((state) => state.geoelectric.data);

  // Count filtered DRAP cells
  const filteredDRAPCount = useMemo(() => {
    if (!drapPoints || drapPoints.length === 0) return 0;
    const [min, max] = Array.isArray(drapRegionRange)
      ? drapRegionRange
      : [drapRegionRange, drapRegionRange];
    return drapPoints.filter(([lat, lon, amp]) => amp >= min && amp <= max)
      .length;
  }, [drapPoints, drapRegionRange]);

  const filteredAuroraCount = useMemo(() => {
    if (!auroraData || !auroraData.coordinates) return 0;
    const [min, max] = Array.isArray(auroraRegionRange)
      ? auroraRegionRange
      : [auroraRegionRange, auroraRegionRange];
    return auroraData.coordinates.filter(
      ([lon, lat, pct]) => pct >= min && pct <= max,
    ).length;
  }, [auroraData, auroraRegionRange]);

  const filteredGeoElectricCount = useMemo(() => {
    if (!geoelectricData || !geoelectricData.points) return 0;
    const [minLog, maxLog] = Array.isArray(geoElectricLogRange)
      ? geoElectricLogRange
      : [geoElectricLogRange, geoElectricLogRange];
    const minMag = Math.pow(10, minLog);
    const maxMag = Math.pow(10, maxLog);
    return geoelectricData.points.filter(
      ([lat, lon, magnitude, quality]) =>
        magnitude >= minMag && magnitude <= maxMag,
    ).length;
  }, [geoelectricData, geoElectricLogRange]);

  // Count filtered planes
  const filteredPlanesCount = useMemo(() => {
    return planes.filter((p) => {
      if (!p.lat || !p.lon) return false;
      const altValue = useImperial
        ? typeof p.geo_altitude === "number"
          ? p.geo_altitude * 3.28084
          : 0
        : p.geo_altitude;
      if (!altValue) return false;
      return altValue >= altitudeRange[0] && altValue <= altitudeRange[1];
    }).length;
  }, [planes, altitudeRange, useImperial]);

  // Count filtered airports
  const filteredAirportsCount = useMemo(() => {
    return airports.filter((a) => {
      if (!airportFilter.includes(a.type)) return false;
      let elevation =
        a.elevation_ft !== undefined
          ? parseFloat(a.elevation_ft)
          : a.elevation !== undefined
            ? parseFloat(a.elevation)
            : 0;
      if (isNaN(elevation)) elevation = 0;
      const altValue = useImperial ? elevation : elevation * 0.3048;
      return (
        altValue >= airportAltitudeRange[0] &&
        altValue <= airportAltitudeRange[1]
      );
    }).length;
  }, [airports, airportAltitudeRange, useImperial, airportFilter]);

  const settingsBtnRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ x: null, y: null });

  useEffect(() => {
    if (showSettings && settingsBtnRef.current) {
      const btnRect = settingsBtnRef.current.getBoundingClientRect();
      setPanelPos({
        x: btnRect.right - PANEL_WIDTH,
        y: btnRect.bottom + 8,
      });
    }
  }, [showSettings]);

  return (
    <>
      {showSettings && panelPos.x !== null && panelPos.y !== null && (
        <Rnd
          default={{
            x:
              panelPos.x !== null
                ? panelPos.x
                : window.innerWidth - PANEL_WIDTH,
            y: panelPos.y !== null ? panelPos.y : 60,
            width: PANEL_WIDTH,
            height: 400,
          }}
          minWidth={350}
          minHeight={220}
          bounds="window"
          dragHandleClassName="settings-modal-title"
          enableResizing={{
            top: true,
            right: true,
            bottom: true,
            left: true,
            topRight: true,
            bottomRight: true,
            bottomLeft: true,
            topLeft: true,
          }}
        >
          <Paper
            elevation={4}
            style={{
              paddingTop: 0,
              borderRadius: 8,
              width: "100%",
              height: "100%",
              overflowY: "hidden",
              zIndex: 3000,
              position: "fixed",
              left: 0,
              top: 0,
              fontSize: "0.92rem",
              boxSizing: "border-box",
              backgroundColor: darkMode ? "#181a1b" : "#f7f7fa",
              color: darkMode ? "#f7f7fa" : "#181a1b",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                height: "40px",
                background: darkMode ? "#181a1b" : "#f7f7fa",
                borderBottom: `1px solid ${darkMode ? "#555555" : "#cccccc"}`,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: darkMode ? "#181a1b" : "#f7f7fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 4px 0 12px",
                }}
              >
                <div
                  className="settings-modal-title"
                  style={{
                    cursor: "move",
                    margin: 0,
                    flex: 1,
                    fontSize: "1.25rem",
                    fontWeight: 600,
                  }}
                >
                  Settings
                </div>
                <IconButton
                  size="small"
                  aria-label="close"
                  onClick={() => dispatch(setShowSettings(false))}
                  sx={{
                    color: "#fff",
                    backgroundColor: "#d32f2f",
                    borderRadius: "4px",
                    "&:hover": {
                      backgroundColor: "#b71c1c",
                      border: "none",
                      outline: "none",
                    },
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
            </div>

            <Tabs
              value={settingsTabIndex}
              onChange={(e, v) => dispatch(setSettingsTabIndex(v))}
              aria-label="settings tabs"
              sx={{
                padding: "6px 6px 0px 6px",
                fontSize: "0.92rem",
                minHeight: "32px",
                color: darkMode ? "#f7f7fa" : "#181a1b",
              }}
              textColor={darkMode ? "inherit" : "primary"}
              indicatorColor={darkMode ? "secondary" : "primary"}
            >
              <Tab
                label="Aviation"
                sx={{ fontSize: "0.92rem", minHeight: "32px", py: 0 }}
              />
              <Tab
                label="Events"
                sx={{ fontSize: "0.92rem", minHeight: "32px", py: 0 }}
              />
            </Tabs>

            <div
              style={{
                marginTop: "10px",
                maxHeight: "calc(100% - 96px)",
                overflowY: "auto",
              }}
            >
              {settingsTabIndex === 0 && (
                <>
                  <Paper
                    elevation={4}
                    sx={{
                      margin: "0 16px 8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <CardHeader
                      title={
                        <span>
                          <b>Filter Airplanes</b> - Showing{" "}
                          <b>{filteredPlanesCount}</b> planes between{" "}
                          <b>{altitudeRange[0]}</b> and{" "}
                          <b>{altitudeRange[1]}</b>{" "}
                          <b>{useImperial ? "ft" : "m"}</b>
                        </span>
                      }
                      disableTypography
                      sx={{
                        zIndex: 1,
                        padding: "8px",
                        borderRadius: "8px 8px 0px 0px",
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        fontSize: "1rem",
                        borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
                      }}
                    />
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px 0px 8px 8px",
                        pr: 2.5,
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "25%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Altitude Range
                        </Typography>
                        <Slider
                          value={altitudeRange}
                          min={0}
                          max={useImperial ? 50000 : 15000}
                          step={useImperial ? 1000 : 300}
                          valueLabelDisplay="auto"
                          marks={[
                            { value: 0, label: "0" },
                            {
                              value: useImperial ? 50000 : 15000,
                              label: useImperial ? "50,000 ft" : "15,000 m",
                            },
                          ]}
                          onChange={(e, v) => dispatch(setAltitudeRange(v))}
                          sx={{
                            width: "calc(100% - 32px)",
                            "& .MuiSlider-track": {
                              background: "unset",
                              border: "none",
                              boxShadow: "none",
                            },

                            "& .MuiSlider-markLabel": {
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Paper>
                  <Paper
                    elevation={4}
                    sx={{
                      margin: "0 16px 8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <CardHeader
                      title={
                        <span>
                          <b>Filter Airports</b> - Showing{" "}
                          <b>{filteredAirportsCount}</b> airports between{" "}
                          <b>{airportAltitudeRange[0]}</b> and{" "}
                          <b>{airportAltitudeRange[1]}</b>{" "}
                          <b>{useImperial ? "ft" : "m"}</b>
                        </span>
                      }
                      disableTypography
                      sx={{
                        zIndex: 1,
                        padding: "8px",
                        borderRadius: "8px 8px 0px 0px",
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        fontSize: "1rem",
                        borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
                      }}
                    />
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px",
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "20%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Airport Types
                        </Typography>
                        <FormControl
                          fullWidth
                          variant="outlined"
                          sx={{ minWidth: 220, fontSize: "0.92rem" }}
                        >
                          <InputLabel
                            id="airport-type-select-label"
                            sx={{
                              fontSize: "0.92rem",
                              background: "white",
                              px: 0.5,
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            }}
                          >
                            ChooseAirport Types
                          </InputLabel>
                          <Select
                            labelId="airport-type-select-label"
                            multiple
                            value={airportFilter}
                            onChange={(e) =>
                              dispatch(setAirportFilter(e.target.value))
                            }
                            renderValue={(selected) => (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                }}
                              >
                                {selected.map((type) => (
                                  <Chip
                                    key={type}
                                    label={type
                                      .replace("_", " ")
                                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                                    onDelete={(event) => {
                                      event.stopPropagation();
                                      const newFilter = airportFilter.filter(
                                        (t) => t !== type,
                                      );
                                      dispatch(setAirportFilter(newFilter));
                                    }}
                                    onMouseDown={(event) => {
                                      event.stopPropagation();
                                      const newFilter = airportFilter.filter(
                                        (t) => t !== type,
                                      );
                                      dispatch(setAirportFilter(newFilter));
                                    }}
                                    size="small"
                                    color="primary"
                                    sx={{
                                      fontSize: "0.7rem",
                                      backgroundColor: "#1976d2",
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                            MenuProps={{
                              PaperProps: { sx: { minWidth: 220 } },
                            }}
                            sx={{
                              fontSize: "0.92rem",
                              py: 0,
                              color: "#fff",
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: darkMode ? "#f0f0f0" : "#333",
                              },
                              "& .MuiSvgIcon-root": {
                                color: darkMode ? "#f0f0f0" : "#333",
                              },
                            }}
                            variant="outlined"
                          >
                            {[
                              "large_airport",
                              "medium_airport",
                              "small_airport",
                              "seaplane_base",
                              "heliport",
                              "balloonport",
                            ].map((type) => (
                              <MenuItem
                                key={type}
                                value={type}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  minWidth: 180,
                                  fontSize: "0.92rem",
                                  py: 0,
                                }}
                              >
                                <Checkbox
                                  checked={airportFilter.includes(type)}
                                  sx={{ marginRight: 1, p: 0.5 }}
                                />
                                <span
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    fontSize: "0.92rem",
                                  }}
                                >
                                  {type
                                    .replace("_", " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px 0px 8px 8px",
                        pr: 2.5,
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "25%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Altitude Range
                        </Typography>
                        <Slider
                          value={airportAltitudeRange}
                          min={0}
                          max={useImperial ? 18000 : 5500}
                          step={useImperial ? 1000 : 250}
                          marks={[
                            { value: 0, label: "0" },
                            {
                              value: useImperial ? 18000 : 5500,
                              label: useImperial ? "18,000 ft" : "5,500 m",
                            },
                          ]}
                          valueLabelDisplay="auto"
                          onChange={(e, v) =>
                            dispatch(setAirportAltitudeRange(v))
                          }
                          sx={{
                            width: "calc(100% - 32px)",
                            "& .MuiSlider-track": {
                              background: "unset",
                              border: "none",
                              boxShadow: "none",
                            },

                            "& .MuiSlider-markLabel": {
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Paper>
                  <Paper
                    elevation={4}
                    sx={{
                      margin: "0 16px 8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <CardHeader
                      title={
                        <span>
                          <b>Options</b>
                        </span>
                      }
                      disableTypography
                      sx={{
                        zIndex: 1,
                        padding: "8px",
                        borderRadius: "8px 8px 0px 0px",
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        fontSize: "1rem",
                        borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
                      }}
                    />
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px",
                        pr: 2.5,
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "25%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Flight Icon Size
                        </Typography>
                        <Slider
                          value={flightIconSize}
                          min={25}
                          max={100}
                          step={1}
                          valueLabelDisplay="auto"
                          onChange={(e, v) => dispatch(setFlightIconSize(v))}
                          sx={{
                            width: "calc(100% - 32px)",
                            "& .MuiSlider-track": {
                              background: "unset",
                              border: "none",
                              boxShadow: "none",
                            },
                            "& .MuiSlider-markLabel": {
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px 0px 8px 8px",
                        pr: 2.5,
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "25%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Airport Icon Size
                        </Typography>
                        <Slider
                          value={airportIconSize}
                          min={15}
                          max={40}
                          step={1}
                          valueLabelDisplay="auto"
                          onChange={(e, v) => dispatch(setAirportIconSize(v))}
                          sx={{
                            width: "calc(100% - 32px)",
                            "& .MuiSlider-track": {
                              background: "unset",
                              border: "none",
                              boxShadow: "none",
                            },
                            "& .MuiSlider-markLabel": {
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Paper>
                </>
              )}
              {settingsTabIndex === 1 && (
                <>
                  <Paper
                    elevation={4}
                    sx={{
                      margin: "0 16px 8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <CardHeader
                      title={
                        <span>
                          <b>DRAP Region</b> - Showing{" "}
                          <b>{filteredDRAPCount}</b> DRAP Cells between{" "}
                          <b>
                            {Array.isArray(drapRegionRange)
                              ? drapRegionRange[0]
                              : drapRegionRange}
                          </b>{" "}
                          dB and{" "}
                          <b>
                            {Array.isArray(drapRegionRange)
                              ? drapRegionRange[1]
                              : drapRegionRange}
                          </b>{" "}
                          dB absorption.
                        </span>
                      }
                      disableTypography
                      sx={{
                        zIndex: 1,
                        padding: "8px",
                        borderRadius: "8px 8px 0px 0px",
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        fontSize: "1rem",
                        borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
                      }}
                    />
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px 0px 8px 8px",
                        pr: 2.5,
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "30%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Absorption Range
                        </Typography>
                        <Slider
                          value={drapRegionRange}
                          min={0}
                          max={35}
                          step={0.5}
                          marks={[
                            { value: 0, label: "0 dB" },
                            {
                              value: 35,
                              label: "35 dB",
                            },
                          ]}
                          valueLabelDisplay="auto"
                          onChange={(e, v) => dispatch(setDrapRegionRange(v))}
                          sx={{
                            width: "calc(100% - 32px)",
                            "& .MuiSlider-track": {
                              background: "unset",
                              border: "none",
                              boxShadow: "none",
                            },

                            "& .MuiSlider-markLabel": {
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Paper>
                  <Paper
                    elevation={4}
                    sx={{
                      margin: "0 16px 8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <CardHeader
                      title={
                        <span>
                          <b>Ovation Aurora</b> - Showing{" "}
                          <b>{filteredAuroraCount}</b> Aurora Cells between{" "}
                          <b>
                            {Array.isArray(auroraRegionRange)
                              ? auroraRegionRange[0]
                              : auroraRegionRange}
                          </b>
                          % and{" "}
                          <b>
                            {Array.isArray(auroraRegionRange)
                              ? auroraRegionRange[1]
                              : auroraRegionRange}
                          </b>
                          %
                        </span>
                      }
                      disableTypography
                      sx={{
                        zIndex: 1,
                        padding: "8px",
                        borderRadius: "8px 8px 0px 0px",
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        fontSize: "1rem",
                        borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
                      }}
                    />
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px 0px 8px 8px",
                        pr: 2.5,
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "30%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Possibility % Range
                        </Typography>
                        <Slider
                          value={auroraRegionRange}
                          min={0}
                          max={100}
                          step={1}
                          marks={[
                            { value: 0, label: "0%" },
                            {
                              value: 100,
                              label: "100%",
                            },
                          ]}
                          valueLabelDisplay="auto"
                          onChange={(e, v) => dispatch(setAuroraRegionRange(v))}
                          sx={{
                            width: "calc(100% - 32px)",
                            "& .MuiSlider-track": {
                              background: "unset",
                              border: "none",
                              boxShadow: "none",
                            },

                            "& .MuiSlider-markLabel": {
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Paper>
                  <Paper
                    elevation={4}
                    sx={{
                      margin: "0 16px 8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <CardHeader
                      title={
                        <span>
                          <b>Geoelectric Field</b> - Showing{" "}
                          <b>{filteredGeoElectricCount}</b> Geoelectric Cells
                          between{" "}
                          <b>
                            {Array.isArray(geoElectricLogRange)
                              ? Math.round(
                                  Math.pow(10, geoElectricLogRange[0]) * 100,
                                ) / 100
                              : geoElectricLogRange}
                          </b>
                          {""}
                          mV/km and{" "}
                          <b>
                            {Array.isArray(geoElectricLogRange)
                              ? Math.round(
                                  Math.pow(10, geoElectricLogRange[1]) * 100,
                                ) / 100
                              : geoElectricLogRange}
                          </b>{" "}
                          mV/km
                        </span>
                      }
                      disableTypography
                      sx={{
                        zIndex: 1,
                        padding: "8px",
                        borderRadius: "8px 8px 0px 0px",
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        fontSize: "1rem",
                        borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
                      }}
                    />
                    <Card
                      sx={{
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                        color: darkMode ? "#f7f7fa" : "#181a1b",
                        boxShadow: darkMode
                          ? "0 1px 4px #111"
                          : "0 1px 4px #ccc",
                        borderRadius: "0px 0px 8px 8px",
                        pr: 2.5,
                        width: "100%",
                        alignSelf: "flex-start",
                        overflow: "visible",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "8px 8px",
                          "&:last-child": { pb: 1 },
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: darkMode ? "#b0b0b0" : "#555",
                            width: "30%",
                            flexShrink: 0,
                            fontWeight: 500,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Field strength
                        </Typography>
                        <Slider
                          min={-1}
                          max={4}
                          step={0.1}
                          marks={[
                            { value: -1, label: "0" },
                            { value: 0, label: "1" },
                            { value: 1, label: "10" },
                            { value: 2, label: "100" },
                            { value: 3, label: "1000" },
                            { value: 4, label: "10000" },
                          ]}
                          value={geoElectricLogRange}
                          onChange={(e, v) =>
                            dispatch(setGeoElectricLogRange(v))
                          }
                          valueLabelDisplay="auto"
                          valueLabelFormat={(x) =>
                            Math.round(Math.pow(10, x) * 100) / 100
                          }
                          sx={{
                            width: "calc(100% - 32px)",
                            "& .MuiSlider-track": {
                              background: "unset",
                              border: "none",
                              boxShadow: "none",
                            },

                            "& .MuiSlider-markLabel": {
                              color: darkMode ? "#e0e0e0" : "#333",
                              backgroundColor: darkMode ? "#23272e" : "#fff",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Paper>
                </>
              )}
            </div>
          </Paper>
        </Rnd>
      )}
      <Slide
        direction="down"
        in={true}
        timeout={500}
        mountOnEnter
        unmountOnExit
      >
        <ButtonsControl settingsRef={settingsBtnRef} />
      </Slide>
    </>
  );
};
export default SettingsPanel;
