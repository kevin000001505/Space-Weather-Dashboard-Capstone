import React, { useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

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
import CustomDateTime from "./components/charts/CustomDateTime";
import { getPresetDateRange } from "./components/charts/helpers";
import { MAJOR_TIMEZONES } from "./components/charts/constants";
import {
  setCustomDateTime,
  setSelectedTimezone,
} from "./store/slices/chartsSlice";
import { Tabs, Tab } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchKpIndex, fetchXrayFlux, fetchProtonFlux } from "./api/api";

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

export default function Charts() {
  const dispatch = useDispatch();
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const customdt = useSelector((state) => state.charts.customdt);
  useEffect(() => {
    if (!customdt.start || !customdt.end) {
      const now = new Date();
      const start = new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const end = now.toISOString();
      dispatch(setCustomDateTime({ start, end, range: "3days" }));
    }
    dispatch(fetchKpIndex({ start: customdt.start, end: customdt.end }));
    dispatch(fetchXrayFlux({ start: customdt.start, end: customdt.end }));
    dispatch(fetchProtonFlux({ start: customdt.start, end: customdt.end }));
    const interval = setInterval(() => {
      dispatch(fetchKpIndex({ start: customdt.start, end: customdt.end }));
      dispatch(fetchXrayFlux({ start: customdt.start, end: customdt.end }));
      dispatch(fetchProtonFlux({ start: customdt.start, end: customdt.end }));
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [dispatch, customdt.start, customdt.end]);

  const handleSidebar = (value) => {
    dispatch(toggleSidebar(value));
  };

  const btnStyle = {
    position: "fixed",
    top: "20px",
    right: "20px",
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

  const tab = useSelector((state) => state.charts.activeTab);
  const dispatchTab = useDispatch();
  const darkMode = useSelector((state) => state.ui.darkMode);
  const dispatchUi = useDispatch();
  return (
    <Box
      padding={6}
      sx={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: darkMode ? "#181a1b" : "#f7f7fa",
        color: darkMode ? "#f7f7fa" : "#181a1b",
        transition: "background-color 0.3s, color 0.3s",
      }}
    >
      <button
        onClick={() => handleSidebar(true)}
        style={{
          ...btnStyle,
          backgroundColor: darkMode ? "#23272f" : "#e0e0e0",
        }}
        title="Toggle Filters"
      >
        ☰
      </button>
      <button
        onClick={() =>
          dispatchUi({ type: "ui/setDarkMode", payload: !darkMode })
        }
        style={{
          ...btnStyle,
          right: "75px",
          backgroundColor: darkMode ? "#23272f" : "#e0e0e0",
          color: darkMode ? "#f7f7fa" : "#181a1b",
        }}
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {darkMode ? "🌙" : "☀️"}
      </button>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ color: darkMode ? "#f7f7fa" : "#181a1b" }}
      >
        Analytics Dashboard
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Tabs
          value={tab}
          onChange={(e, v) =>
            dispatchTab({ type: "charts/setActiveTab", payload: v })
          }
          sx={{ color: darkMode ? "#f7f7fa" : "#181a1b" }}
          textColor={darkMode ? "inherit" : "primary"}
          indicatorColor={darkMode ? "secondary" : "primary"}
        >
          <Tab label="Kp Index" />
          <Tab label="X-ray Flux" />
          <Tab label="Proton Flux" />
        </Tabs>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel sx={{ color: darkMode ? "#e0e0e0" : "#333" }}>
              Time Zone
            </InputLabel>
            <Select
              value={selectedTimezone}
              label="Time Zone"
              onChange={(e) => dispatch(setSelectedTimezone(e.target.value))}
              sx={{
                color: darkMode ? "#e0e0e0" : "#333",
                backgroundColor: darkMode ? "#23272e" : "#fff",
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
        </Box>
      </Box>
      <Box>
        {tab === 0 && <KpIndexChart key={tab} />}
        {tab === 1 && <XrayFluxChart key={tab} />}
        {tab === 2 && <ProtonFluxChart key={tab} />}
      </Box>
    </Box>
  );
}
