import { useEffect, useState } from "react";
import { Box, IconButton, Tabs, Tab, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import DownloadIcon from "@mui/icons-material/Download";
import { useDispatch, useSelector } from "react-redux";
import {
  setCustomDateTime,
  setSelectedTimezone,
  setShowChartSettings,
} from "../../store/slices/chartsSlice";
import { fetchKpIndex, fetchProtonFlux, fetchXrayFlux } from "../../api/api";
import { getPresetDateRange } from "./helpers/helpers";
import CustomDateTime from "./ui/CustomDateTime";
import ChartSettingsPanel from "./ui/ChartSettingsPanel";
import DownloadPanel from "./ui/DownloadPanel";

const ChartsTabBar = () => {
  const [downloadAnchorEl, setDownloadAnchorEl] = useState(null);
  const dispatch = useDispatch();
  const customdt = useSelector((state) => state.charts.customdt);
  const showChartSettings = useSelector(
    (state) => state.charts.showChartSettings,
  );
  const tab = useSelector((state) => state.charts.activeTab);
  const darkMode = useSelector((state) => state.ui.darkMode);
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
      const end = new Date(now.getTime() - 5000).toISOString();
      dispatch(setCustomDateTime({ start, end, range: "3days" }));
      return; // Wait for customdt to be set before fetching
    }
    // Initial fetch for the active tab
    if (tab === 0) {
      // All Plots: fetch all three
      dispatch(fetchKpIndex({ start: customdt.start, end: customdt.end }));
      dispatch(fetchXrayFlux({ start: customdt.start, end: customdt.end }));
      dispatch(fetchProtonFlux({ start: customdt.start, end: customdt.end }));
    } else if (tab === 1) {
      dispatch(fetchKpIndex({ start: customdt.start, end: customdt.end }));
    } else if (tab === 2) {
      dispatch(fetchXrayFlux({ start: customdt.start, end: customdt.end }));
    } else if (tab === 3) {
      dispatch(fetchProtonFlux({ start: customdt.start, end: customdt.end }));
    }
    // Polling fetch for the active tab, with polling: true
    const interval = setInterval(() => {
      if (tab === 0) {
        dispatch(
          fetchKpIndex({
            start: customdt.start,
            end: customdt.end,
            polling: true,
          }),
        );
        dispatch(
          fetchXrayFlux({
            start: customdt.start,
            end: customdt.end,
            polling: true,
          }),
        );
        dispatch(
          fetchProtonFlux({
            start: customdt.start,
            end: customdt.end,
            polling: true,
          }),
        );
      } else if (tab === 1) {
        dispatch(
          fetchKpIndex({
            start: customdt.start,
            end: customdt.end,
            polling: true,
          }),
        );
      } else if (tab === 2) {
        dispatch(
          fetchXrayFlux({
            start: customdt.start,
            end: customdt.end,
            polling: true,
          }),
        );
      } else if (tab === 3) {
        dispatch(
          fetchProtonFlux({
            start: customdt.start,
            end: customdt.end,
            polling: true,
          }),
        );
      }
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [dispatch, customdt.start, customdt.end, tab]);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 68,
        left: 0,
        width: "100vw",
        zIndex: 1200,
        backgroundColor: darkMode ? "#181a1b" : "#f7f7fa",
        color: darkMode ? "#f7f7fa" : "#181a1b",
        boxShadow: darkMode ? "0 3px 8px #111" : "0 3px 8px rgba(0,0,0,0.08)",
        borderBottom: `1px solid ${darkMode ? "#333" : "#ddd"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 64,
        transition: "background-color 0.3s, color 0.3s",
        px: 4,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "100vw",
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
          <Tab label="All Plots" />
          <Tab label="Kp Index" />
          <Tab label="X-ray Flux" />
          <Tab label="Proton Flux" />
        </Tabs>
        <Typography variant="h6">ANALYTICS DASHBOARD</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, height: 48 }}>
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
              fontSize: "1.25rem",
              boxShadow: "var(--ui-shadow)",
              backdropFilter: "blur(4px)",
              color: darkMode ? "#e0e0e0" : "#333",
              backgroundColor: darkMode ? "#23272e" : "#fff",
              border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
              borderRadius: "4px",
              height: 42,
              width: 42,
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
              fontSize: "1.25rem",
              boxShadow: "var(--ui-shadow)",
              backdropFilter: "blur(4px)",
              color: darkMode ? "#e0e0e0" : "#333",
              backgroundColor: darkMode ? "#23272e" : "#fff",
              border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
              borderRadius: "4px",
              mr: 1,
              height: 42,
              width: 42,
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
  );
};

export default ChartsTabBar;
