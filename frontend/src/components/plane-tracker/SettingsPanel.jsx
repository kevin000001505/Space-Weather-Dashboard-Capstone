import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../store/slices/sidebarSlice";
import {
  setDarkMode,
  setShowAltitudeLegend,
  setShowIconLegend,
  setShowSettings,
  setUseImperial,
  setSettingsTabIndex,
  setAltitudeRange,
  setAirportAltitudeRange,
  setAirportFilter,
  setShowAirports,
  setShowDRAP,
  setShowAurora,
  setShowPlanes,
  setDrapRegionRange,
  setAuroraRegionRange,
} from "../../store/slices/uiSlice";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import { useMemo } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import { Rnd } from "react-rnd";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { toggleIsolateMode } from "../../store/slices/uiSlice";
import Tooltip from "@mui/material/Tooltip";

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
    showAirports,
    showPlanes,
    showDRAP,
    drapRegionRange,
    showAltitudeLegend,
    showIconLegend,
    showAurora,
    auroraRegionRange,
  } = useSelector((state) => state.ui);
  const planes = useSelector((state) => state.planes.data);
  const airports = useSelector((state) => state.airports.data);
  const drapPoints = useSelector((state) => state.drap.points);

  // Count filtered DRAP cells
  const filteredDRAPCount = useMemo(() => {
    if (!drapPoints || drapPoints.length === 0) return 0;
    const [min, max] = Array.isArray(drapRegionRange)
      ? drapRegionRange
      : [drapRegionRange, drapRegionRange];
    return drapPoints.filter(([lat, lon, amp]) => amp >= min && amp <= max)
      .length;
  }, [drapPoints, drapRegionRange]);

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

  const handleSidebar = (value) => {
    dispatch(toggleSidebar(value));
  };

  const btnStyle = {
    width: "45px",
    height: "45px",
    border: "1px solid var(--ui-border)",
    borderRadius: "4px",
    backgroundColor: "var(--ui-bg)",
    color: "var(--ui-text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    boxShadow: "var(--ui-shadow)",
    backdropFilter: "blur(4px)",
  };

  // Helper to get centered modal position
  const getCenteredPosition = () => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const width = 450;
    const height = 400;
    const x = Math.max((window.innerWidth - width) / 2, 0);
    const y = Math.max((window.innerHeight - height) / 2, 0);
    return { x, y };
  };

  return (
    <>
      {showSettings && (
        <Rnd
          default={{
            ...getCenteredPosition(),
            width: 450,
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
              padding: 12,
              borderRadius: 8,
              width: "100%",
              height: "100%",
              overflowY: "auto",
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
            <IconButton
              size="small"
              aria-label="close"
              onClick={() => dispatch(setShowSettings(false))}
              sx={{
                position: "absolute",
                top: 4,
                right: 6,
                zIndex: 4000,
                color: "#fff",
                backgroundColor: "#d32f2f",
                border: "1px solid #d32f2f",
                "&:hover": {
                  backgroundColor: "#b71c1c",
                },
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <h4
              className="settings-modal-title"
              style={{
                cursor: "move",
                margin: 0,
                marginBottom: 6,
                borderBottom: "1px solid var(--ui-border)",
                paddingBottom: 3,
                fontSize: "1rem",
              }}
            >
              Settings
            </h4>
            <Tabs
              value={settingsTabIndex}
              onChange={(e, v) => dispatch(setSettingsTabIndex(v))}
              aria-label="settings tabs"
              sx={{
                fontSize: "0.92rem",
                minHeight: "32px",
                color: darkMode ? "#f7f7fa" : "#181a1b",
              }}
              textColor={darkMode ? "inherit" : "primary"}
              indicatorColor={darkMode ? "secondary" : "primary"}
            >
              <Tab
                label="General"
                sx={{ fontSize: "0.92rem", minHeight: "32px", py: 0 }}
              />
              <Tab
                label="Airplanes"
                sx={{ fontSize: "0.92rem", minHeight: "32px", py: 0 }}
              />
              <Tab
                label="Airport"
                sx={{ fontSize: "0.92rem", minHeight: "32px", py: 0 }}
              />
              <Tab
                label="Events"
                sx={{ fontSize: "0.92rem", minHeight: "32px", py: 0 }}
              />
            </Tabs>
            <div style={{ marginTop: "10px" }}>
              {settingsTabIndex === 0 && (
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    mb: 2,
                    fontSize: "0.92rem",
                    color: darkMode ? "#e0e0e0" : "#333",
                    backgroundColor: darkMode ? "#23272e" : "#fff",
                    boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontSize: "1rem" }}>
                    General Settings
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useImperial}
                        onChange={() => {
                          const newImperial = !useImperial;
                          dispatch(setUseImperial(newImperial));
                          // Set altitude range to match new units
                          if (newImperial) {
                            dispatch(setAltitudeRange([0, 50000]));
                          } else {
                            dispatch(setAltitudeRange([0, 15000]));
                          }
                        }}
                        sx={{ p: 0.5 }}
                      />
                    }
                    label={
                      <span style={{ fontSize: "0.92rem" }}>
                        Use Imperial Units{" "}
                        {useImperial ? "(ft, knots)" : "(m, m/s)"}
                      </span>
                    }
                    sx={{ mb: 0.5 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showAltitudeLegend}
                        onChange={() =>
                          dispatch(setShowAltitudeLegend(!showAltitudeLegend))
                        }
                        sx={{ p: 0.5 }}
                      />
                    }
                    label={
                      <span style={{ fontSize: "0.92rem" }}>
                        Show Altitude Legend
                      </span>
                    }
                    sx={{ mb: 0.5 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showIconLegend}
                        onChange={() =>
                          dispatch(setShowIconLegend(!showIconLegend))
                        }
                        sx={{ p: 0.5 }}
                      />
                    }
                    label={
                      <span style={{ fontSize: "0.92rem" }}>
                        Show Icon Legend
                      </span>
                    }
                    sx={{ mb: 0.5 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={darkMode}
                        onChange={() => dispatch(setDarkMode(!darkMode))}
                        color="primary"
                      />
                    }
                    label={
                      <span style={{ fontSize: "0.92rem" }}>Dark Mode</span>
                    }
                    sx={{ mb: 1 }}
                  />
                </Paper>
              )}
              {settingsTabIndex === 1 && (
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 1,
                    fontSize: "0.92rem",
                    color: darkMode ? "#e0e0e0" : "#333",
                    backgroundColor: darkMode ? "#23272e" : "#fff",
                    boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontSize: "1rem" }}>
                    Filter Airports
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showPlanes}
                        onChange={(e) =>
                          dispatch(setShowPlanes(e.target.checked))
                        }
                        sx={{ p: 0.5 }}
                      />
                    }
                    label={
                      <span style={{ fontSize: "0.92rem" }}>Show Planes</span>
                    }
                    sx={{ mb: 0.5, p: 0.5 }}
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontSize: "1rem" }}
                  >
                    <b>Altitude</b> - Showing <b>{filteredPlanesCount}</b>{" "}
                    planes between <b>{altitudeRange[0]}</b> and{" "}
                    <b>{altitudeRange[1]}</b> {useImperial ? "ft" : "m"}.
                  </Typography>
                  <Slider
                    value={altitudeRange}
                    min={0}
                    max={useImperial ? 50000 : 15000}
                    step={useImperial ? 1000 : 300}
                    marks={[
                      { value: 0, label: "0" },
                      {
                        value: useImperial ? 50000 : 15000,
                        label: useImperial ? "50,000 ft" : "15,000 m",
                      },
                    ]}
                    valueLabelDisplay="auto"
                    onChange={(e, v) => dispatch(setAltitudeRange(v))}
                    sx={{
                      mt: 0.5,
                      mb: 0.5,
                      width: "calc(100% - 32px)",
                      mx: 2,
                      "& .MuiSlider-track": {
                        background: "unset",
                        border: "none",
                        boxShadow: "none",
                      },
                      "& .MuiSlider-rail": {
                        background:
                          "linear-gradient(90deg, #ff0000 0%, #ff8000 14%, #ffff00 28%, #55ff00 43%, #00ffff 57%, #0000ff 71%, #7700ff 85%, #000000 100%)",
                      },
                      "& .MuiSlider-markLabel": {
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                      },
                    }}
                  />
                </Paper>
              )}
              {settingsTabIndex === 2 && (
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 1,
                    fontSize: "0.92rem",
                    color: darkMode ? "#e0e0e0" : "#333",
                    backgroundColor: darkMode ? "#23272e" : "#fff",
                    boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontSize: "1rem" }}>
                    Filter Airports
                  </Typography>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showAirports}
                        onChange={(e) =>
                          dispatch(setShowAirports(e.target.checked))
                        }
                        sx={{ p: 0.5 }}
                      />
                    }
                    label={
                      <span style={{ fontSize: "0.92rem" }}>Show Airports</span>
                    }
                    sx={{ mb: 0.5, px: 1, py: 0.5 }}
                  />

                  <FormControl
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 1, minWidth: 220, fontSize: "0.92rem" }}
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
                      Airport Types
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
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
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
                                fontSize: "0.92rem",
                                backgroundColor: "#1976d2",
                                color: "#fff",
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      MenuProps={{ PaperProps: { sx: { minWidth: 220 } } }}
                      sx={{ fontSize: "0.92rem", py: 0 }}
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

                  <Typography
                    variant="subtitle1"
                    sx={{ mt: 1, mb: 0.5, fontSize: "0.92rem" }}
                  >
                    <b>Altitude</b> - Showing <b>{filteredAirportsCount}</b>{" "}
                    airports between <b>{airportAltitudeRange[0]}</b> and{" "}
                    <b>{airportAltitudeRange[1]}</b> {useImperial ? "ft" : "m"}.
                  </Typography>
                  <Slider
                    value={airportAltitudeRange}
                    min={0}
                    max={useImperial ? 10000 : 3000}
                    step={useImperial ? 1000 : 300}
                    marks={[
                      { value: 0, label: "0" },
                      {
                        value: useImperial ? 10000 : 3000,
                        label: useImperial ? "10,000 ft" : "3,000 m",
                      },
                    ]}
                    valueLabelDisplay="auto"
                    onChange={(e, v) => dispatch(setAirportAltitudeRange(v))}
                    sx={{
                      mt: 0.5,
                      mb: 0.5,
                      width: "calc(100% - 40px)",
                      mx: 2,
                      "& .MuiSlider-track": {
                        background: "unset",
                        border: "none",
                        boxShadow: "none",
                      },
                      "& .MuiSlider-rail": {
                        background: (() => {
                          // Use getStops to get legend stops
                          const stops = [
                            { val: 0, color: [242, 114, 39] },
                            { val: 2000, color: [245, 145, 40] },
                            { val: 4000, color: [242, 197, 49] },
                            { val: 10000, color: [104, 202, 85] },
                          ];
                          const percent = (v) => (v / 10000) * 100;
                          return `linear-gradient(90deg, ${stops
                            .map((s, i) => {
                              const rgb = `rgb(${s.color.join(",")})`;
                              return `${rgb} ${percent(s.val)}%`;
                            })
                            .join(", ")})`;
                        })(),
                      },
                      "& .MuiSlider-markLabel": {
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                      },
                    }}
                  />
                </Paper>
              )}
              {settingsTabIndex === 3 && (
                <div>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      mb: 1,
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 1, fontSize: "1rem" }}>
                      DRAP Region
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ mt: 1, mb: 0.5, fontSize: "0.92rem" }}
                    >
                      <b>Amplitude</b> - Showing <b>{filteredDRAPCount}</b> DRAP
                      cells between{" "}
                      <b>
                        {Array.isArray(drapRegionRange)
                          ? drapRegionRange[0]
                          : drapRegionRange}
                      </b>
                      dB and{" "}
                      <b>
                        {Array.isArray(drapRegionRange)
                          ? drapRegionRange[1]
                          : drapRegionRange}
                      </b>
                      dB absorption.
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={showDRAP}
                          onChange={(e) =>
                            dispatch(setShowDRAP(e.target.checked))
                          }
                          sx={{ p: 0.5 }}
                        />
                      }
                      label={
                        <span style={{ fontSize: "0.92rem" }}>Show DRAP</span>
                      }
                      sx={{ mb: 0.5, px: 1.5 }}
                    />
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
                        mt: 0.5,
                        mb: 0.5,
                        width: "calc(100% - 40px)",
                        mx: 2,
                        "& .MuiSlider-track": {
                          background: "unset",
                          border: "none",
                          boxShadow: "none",
                        },
                        "& .MuiSlider-rail": {
                          background:
                            "linear-gradient(90deg, #000000 0%, #7700ff 14%, #0000ff 28%, #00ffff 43%, #55ff00 57%, #ffff00 71%, #ff8000 85%, #ff0000 100%)",
                        },
                        "& .MuiSlider-markLabel": {
                          color: darkMode ? "#e0e0e0" : "#333",
                          backgroundColor: darkMode ? "#23272e" : "#fff",
                        },
                      }}
                    />
                  </Paper>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      mb: 1,
                      fontSize: "0.92rem",
                      color: darkMode ? "#e0e0e0" : "#333",
                      backgroundColor: darkMode ? "#23272e" : "#fff",
                      boxShadow: darkMode ? "0 2px 8px #111" : undefined,
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 1, fontSize: "1rem" }}>
                      Ovation Aurora Region
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ mt: 1, mb: 0.5, fontSize: "0.92rem" }}
                    >
                      <b>Amplitude</b> - Showing <b>{filteredDRAPCount}</b>{" "}
                      Aurora cells between{" "}
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
                      % probability.
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={showAurora}
                          onChange={(e) =>
                            dispatch(setShowAurora(e.target.checked))
                          }
                          sx={{ p: 0.5 }}
                        />
                      }
                      label={
                        <span style={{ fontSize: "0.92rem" }}>
                          Show Ovation Aurora
                        </span>
                      }
                      sx={{ mb: 0.5, px: 1.5 }}
                    />
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
                        mt: 0.5,
                        mb: 0.5,
                        width: "calc(100% - 40px)",
                        mx: 2,
                        "& .MuiSlider-track": {
                          background: "unset",
                          border: "none",
                          boxShadow: "none",
                        },
                        "& .MuiSlider-rail": {
                          background:
                            "linear-gradient(90deg, #000000 0%, #1eff00 10%, #fff700 50%, #ff0000 100%)",
                        },
                        "& .MuiSlider-markLabel": {
                          color: darkMode ? "#e0e0e0" : "#333",
                          backgroundColor: darkMode ? "#23272e" : "#fff",
                        },
                      }}
                    />
                  </Paper>
                </div>
              )}
            </div>
          </Paper>
        </Rnd>
      )}
      <div
        style={{
          position: "absolute",
          right: "10px",
          top: "10px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "5px" }}>
          <Tooltip
            title="Show Only Selected Planes and their Path"
            placement="bottom"
          >
            <IconButton
              onClick={() => dispatch(toggleIsolateMode())}
              style={btnStyle}
              aria-label="Isolate Mode"
            >
              I
            </IconButton>
          </Tooltip>
          <button
            onClick={() => dispatch(setShowSettings(!showSettings))}
            style={btnStyle}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => handleSidebar(true)}
            style={btnStyle}
            title="Toggle Filters"
          >
            ☰
          </button>
        </div>
      </div>
    </>
  );
};
export default SettingsPanel;
