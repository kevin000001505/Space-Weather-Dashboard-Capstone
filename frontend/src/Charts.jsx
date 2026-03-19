import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Popover,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

import { toggleSidebar } from "./store/slices/planesSlice";

import KpIndexChart from "./components/charts/KpIndexChart";
import XrayFluxChart from "./components/charts/XrayFluxChart";
import ProtonFluxChart from "./components/charts/ProtonFluxChart";
import ChartLoader from "./components/charts/ChartLoader";
import CustomDateTime from "./components/charts/CustomDateTime";
import ChartSettingsPanel from "./components/charts/ChartSettingsPanel";
import { getPresetDateRange } from "./components/charts/helpers";
import { MAJOR_TIMEZONES } from "./components/charts/constants";
import {
  setCustomDateTime,
  setSelectedTimezone,
  setShowChartSettings,
} from "./store/slices/chartsSlice";
import { useDispatch, useSelector } from "react-redux";
import { fetchKpIndex, fetchXrayFlux, fetchProtonFlux } from "./api/api";
import TopBar from "./components/charts/TopBar";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin,
);

import DownloadPanel, {
  ChartRefsContext,
} from "./components/charts/DownloadPanel";

export default function Charts() {
  // Chart refs for image export
  const kpChartRef = useRef();
  const xrayChartRef = useRef();
  const protonChartRef = useRef();
  // Local state for download panel anchor
  const [downloadAnchorEl, setDownloadAnchorEl] = useState(null);
  const dispatch = useDispatch();
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const customdt = useSelector((state) => state.charts.customdt);
  const showChartSettings = useSelector(
    (state) => state.charts.showChartSettings,
  );
  const tab = useSelector((state) => state.charts.activeTab);
  const loading = useSelector((state) => state.charts.loading);
  const darkMode = useSelector((state) => state.ui.darkMode);
  // Download panel state from Redux (now just boolean)
  const showDownloadPanel = useSelector(
    (state) => state.charts.showDownloadPanel,
  );

  // Only fetch data for the active tab
  useEffect(() => {
    if (!customdt.start || !customdt.end) {
      const now = new Date();
      const start = new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const end = now.toISOString();
      dispatch(setCustomDateTime({ start, end, range: "3days" }));
      return; // Wait for customdt to be set before fetching
    }
    // Initial fetch for the active tab
    if (tab === 0) {
      dispatch(fetchKpIndex({ start: customdt.start, end: customdt.end }));
    } else if (tab === 1) {
      dispatch(fetchXrayFlux({ start: customdt.start, end: customdt.end }));
    } else if (tab === 2) {
      dispatch(fetchProtonFlux({ start: customdt.start, end: customdt.end }));
    }
    // Polling fetch for the active tab, with polling: true
    const interval = setInterval(() => {
      if (tab === 0) {
        dispatch(fetchKpIndex({ start: customdt.start, end: customdt.end, polling: true }));
      } else if (tab === 1) {
        dispatch(fetchXrayFlux({ start: customdt.start, end: customdt.end, polling: true }));
      } else if (tab === 2) {
        dispatch(fetchProtonFlux({ start: customdt.start, end: customdt.end, polling: true }));
      }
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [dispatch, customdt.start, customdt.end, tab]);

  const handleSidebar = (value) => {
    dispatch(toggleSidebar(value));
  };

  const btnStyle = {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "45px",
    height: "45px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    boxShadow: "var(--ui-shadow)",
    backdropFilter: "blur(4px)",
    backgroundColor: darkMode ? "#23272e" : "#fff",
    border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
    borderRadius: "4px",
    "&:hover": {
      backgroundColor: darkMode ? "#2a2d34" : "#f0f0f0",
    },
  };
  return (
    <ChartRefsContext.Provider
      value={{ kp: kpChartRef, xray: xrayChartRef, proton: protonChartRef }}
    >
      <>
        <TopBar
          onToggleSidebar={() => handleSidebar(true)}
          onToggleDarkMode={() =>
            dispatch({ type: "ui/setDarkMode", payload: !darkMode })
          }
        />
        {/* Fixed filter bar below TopBar */}
        <Box
          sx={{
            position: "fixed",
            top: 64, // height of TopBar
            left: 0,
            width: "100vw",
            zIndex: 1200,
            backgroundColor: darkMode ? "#181a1b" : "#f7f7fa",
            color: darkMode ? "#f7f7fa" : "#181a1b",
            boxShadow: darkMode
              ? "0 3px 8px #111"
              : "0 3px 8px rgba(0,0,0,0.08)",
            borderBottom: `1px solid ${darkMode ? "#333" : "#ddd"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 72,
            transition: "background-color 0.3s, color 0.3s",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "98vw",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 56,
              position: "relative",
            }}
          >
            <Tabs
              value={tab}
              onChange={(e, v) =>
                dispatch({ type: "charts/setActiveTab", payload: v })
              }
              sx={{ color: darkMode ? "#f7f7fa" : "#181a1b" }}
              textColor={darkMode ? "inherit" : "primary"}
              indicatorColor={darkMode ? "secondary" : "primary"}
            >
              <Tab label="Kp Index" />
              <Tab label="X-ray Flux" />
              <Tab label="Proton Flux" />
            </Tabs>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 2, height: 48 }}
            >
              <FormControl
                sx={{ minWidth: 232, height: 48, justifyContent: "center" }}
                size="small"
              >
                <InputLabel
                  sx={{
                    color: darkMode ? "#e0e0e0" : "#333",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Time Zone
                </InputLabel>
                <Select
                  value={selectedTimezone}
                  label="Time Zone"
                  onChange={(e) =>
                    dispatch(setSelectedTimezone(e.target.value))
                  }
                  sx={{
                    color: darkMode ? "#e0e0e0" : "#333",
                    backgroundColor: darkMode ? "#23272e" : "#fff",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        mt: 0.5,
                        color: darkMode ? "#e0e0e0" : "#333",
                        backgroundColor: darkMode ? "#23272e" : "#fff",
                      },
                    },
                  }}
                >
                  {MAJOR_TIMEZONES.map((tz) => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <CustomDateTime
                value={customdt.range}
                darkMode={darkMode}
                onChange={(range) => {
                  const { start, end } = getPresetDateRange(range);
                  dispatch(setCustomDateTime({ start, end, range }));
                }}
              />
              <IconButton
                aria-label="download"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "20px",
                  boxShadow: "var(--ui-shadow)",
                  backdropFilter: "blur(4px)",
                  color: darkMode ? "#e0e0e0" : "#333",
                  backgroundColor: darkMode ? "#23272e" : "#fff",
                  border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
                  borderRadius: "4px",
                  height: 48,
                  width: 48,
                  "&:hover": {
                    backgroundColor: darkMode ? "#2a2d34" : "#f0f0f0",
                  },
                }}
                onClick={(e) => {
                  setDownloadAnchorEl(e.currentTarget);
                  dispatch({
                    type: "charts/setShowDownloadPanel",
                    payload: true,
                  });
                }}
                size="large"
              >
                <DownloadIcon />
              </IconButton>
              <DownloadPanel
                open={showDownloadPanel}
                anchorEl={downloadAnchorEl}
                onClose={() => {
                  setDownloadAnchorEl(null);
                  dispatch({
                    type: "charts/setShowDownloadPanel",
                    payload: false,
                  });
                }}
                darkMode={darkMode}
              />
              <IconButton
                aria-label="settings"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "20px",
                  boxShadow: "var(--ui-shadow)",
                  backdropFilter: "blur(4px)",
                  color: darkMode ? "#e0e0e0" : "#333",
                  backgroundColor: darkMode ? "#23272e" : "#fff",
                  border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
                  borderRadius: "4px",
                  mr: 1,
                  height: 48,
                  width: 48,
                  "&:hover": {
                    backgroundColor: darkMode ? "#2a2d34" : "#f0f0f0",
                  },
                }}
                onClick={() => {
                  dispatch(setShowChartSettings(!showChartSettings));
                }}
                size="large"
              >
                <SettingsIcon />
              </IconButton>
            </Box>
            <ChartSettingsPanel
              open={showChartSettings}
              onClose={() => dispatch(setShowChartSettings(false))}
            />
          </Box>
        </Box>
        <Box
          padding={6}
          sx={{
            position: "relative",
            minHeight: "100vh",
            backgroundColor: darkMode ? "#23272e" : "#fff",
            color: darkMode ? "#f7f7fa" : "#181a1b",
            transition: "background-color 0.3s, color 0.3s",
            pt: 20,
          }}
        >
          <Box>
            {loading ? (
              <ChartLoader darkMode={darkMode} />
            ) : (
              <>
                {tab === 0 && <KpIndexChart key={tab} chartRef={kpChartRef} />}
                {tab === 1 && (
                  <XrayFluxChart key={tab} chartRef={xrayChartRef} />
                )}
                {tab === 2 && (
                  <ProtonFluxChart key={tab} chartRef={protonChartRef} />
                )}
              </>
            )}
          </Box>
        </Box>
      </>
    </ChartRefsContext.Provider>
  );
}
