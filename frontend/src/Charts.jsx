import React, { useEffect } from "react";
import { Box, Typography, Grid, Card, CardContent, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

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
import { Switch, FormControlLabel } from "@mui/material";
import { setSelectedTimezone, setShowDate } from "./store/slices/chartsSlice";
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

const options = {
  responsive: true,
  maintainAspectRatio: false,
};

export default function Charts() {
  const dispatch = useDispatch();
  const kpIndex = useSelector((state) => state.charts?.kpIndex);
  const xrayFlux = useSelector((state) => state.charts?.xrayFlux);
  const protonFlux = useSelector((state) => state.charts?.protonFlux);
  const selectedTimezone = useSelector((state) => state.charts.selectedTimezone);
  useEffect(() => {
    dispatch(fetchKpIndex());
    dispatch(fetchXrayFlux());
    dispatch(fetchProtonFlux());
    const interval = setInterval(() => {
      dispatch(fetchKpIndex());
      dispatch(fetchXrayFlux());
      dispatch(fetchProtonFlux());
    }, 60000); // 5 minutes
    return () => clearInterval(interval);
  }, [dispatch]);

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

  const MAJOR_TIMEZONES = [
    { label: "Local Time", value: "local" },
    { label: "UTC (GMT+0)", value: "UTC" },
    { label: "US/Eastern (GMT-5)", value: "America/New_York" },
    { label: "US/Central (GMT-6)", value: "America/Chicago" },
    { label: "US/Mountain (GMT-7)", value: "America/Denver" },
    { label: "US/Pacific (GMT-8)", value: "America/Los_Angeles" },
    { label: "Europe/London (GMT+0)", value: "Europe/London" },
    { label: "Europe/Paris (GMT+1)", value: "Europe/Paris" },
    { label: "Asia/Tokyo (GMT+9)", value: "Asia/Tokyo" },
    { label: "Australia/Sydney (GMT+10)", value: "Australia/Sydney" },
  ];
  const ChartCard = ({ title, children }) => (
    <Card sx={{ height: 350 }}>
      <CardContent sx={{ height: "100%" }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ height: "85%" }}>{children}</Box>
      </CardContent>
    </Card>
  );

  const tab = useSelector((state) => state.charts.activeTab);
  const dispatchTab = useDispatch();
  const darkMode = useSelector((state) => state.ui.darkMode);
  const dispatchUi = useDispatch();
  const showDate = useSelector((state) => state.charts.showDate);
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
        <Box>
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
          <FormControlLabel
            control={
              <Switch
                checked={showDate}
                onChange={() => dispatchTab(setShowDate(!showDate))}
                color="primary"
              />
            }
            label="Show Date"
            sx={{ ml: 2 }}
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
