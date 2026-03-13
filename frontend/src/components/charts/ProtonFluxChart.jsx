import React from "react";
import { useDispatch } from "react-redux";
import { setShowProtonWarningThreshold } from "../../store/slices/chartsSlice";
import { Switch, FormControlLabel, FormControl } from "@mui/material";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useSelector } from "react-redux";

// Register zoom plugin
Chart.register(zoomPlugin);

const ProtonFluxChart = () => {
  const protonFlux = useSelector((state) => state.charts?.protonFlux);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const showDate = useSelector((state) => state.charts.showDate);
  const showWarning = useSelector(
    (state) => state.charts.showProtonWarningThreshold,
  );
  const dispatch = useDispatch();
  const sortedProtonFlux = protonFlux
    ? [...protonFlux].sort(
        (a, b) => new Date(a.time_tag) - new Date(b.time_tag),
      )
    : [];
  const fluxLabels = sortedProtonFlux.map((item) => {
    const date = new Date(item.time_tag);
    const month = date.toLocaleString("en-US", { month: "short" });
    const dayNum = date.getDate();
    const hour = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return showDate ? `${month} ${dayNum}' ${hour}` : `${hour}`;
  });
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const flux10Mev = sortedProtonFlux.map((item) => item.flux_10_mev);
  const flux50Mev = sortedProtonFlux.map((item) => item.flux_50_mev);
  const flux100Mev = sortedProtonFlux.map((item) => item.flux_100_mev);
  const flux500Mev = sortedProtonFlux.map((item) => item.flux_500_mev);
  const fluxChartData = {
    labels: fluxLabels,
    datasets: [
      {
        label: "Proton Flux (10 MeV)",
        data: flux10Mev,
        borderColor: darkMode ? "#1b5e20" : "#43a047",
        backgroundColor: darkMode
          ? "rgba(27,94,32,0.5)"
          : "rgba(67,160,71,0.2)",
        fill: false,
        tension: 0.4,
      },
      {
        label: "Proton Flux (50 MeV)",
        data: flux50Mev,
        borderColor: darkMode ? "#0d47a1" : "#1976d2",
        backgroundColor: darkMode
          ? "rgba(13,71,161,0.5)"
          : "rgba(25,118,210,0.2)",
        fill: false,
        tension: 0.4,
      },
      {
        label: "Proton Flux (100 MeV)",
        data: flux100Mev,
        borderColor: darkMode ? "#ff6f00" : "#ff9800",
        backgroundColor: darkMode
          ? "rgba(255,111,0,0.5)"
          : "rgba(255,152,0,0.2)",
        fill: false,
        tension: 0.4,
      },
      {
        label: "Proton Flux (500 MeV)",
        data: flux500Mev,
        borderColor: darkMode ? "#b71c1c" : "#d32f2f",
        backgroundColor: darkMode
          ? "rgba(183,28,28,0.5)"
          : "rgba(211,47,47,0.2)",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  // Chart ref for reset zoom
  const chartRef = React.useRef();

  return (
    <Card
      sx={{
        height: 500,
        backgroundColor: darkMode ? "#23272e" : "#fff",
        boxShadow: darkMode ? "0 2px 8px #111" : undefined,
      }}
    >
      <CardContent
        sx={{ height: "100%", backgroundColor: darkMode ? "#23272e" : "#fff" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: darkMode ? "#e0e0e0" : "#333" }}
          >
            PROTON FLUX
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showWarning}
                  onChange={() =>
                    dispatch(setShowProtonWarningThreshold(!showWarning))
                  }
                  color="primary"
                />
              }
              label="Show Warning Threshold"
              sx={{ color: darkMode ? "#e0e0e0" : "#333" }}
            />
            <Tooltip title="Reset Zoom/Pan">
              <IconButton
                aria-label="reset zoom"
                onClick={() => {
                  if (chartRef.current) {
                    chartRef.current.resetZoom();
                  }
                }}
                sx={{ color: darkMode ? "#e0e0e0" : "#333" }}
              >
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box
          sx={{
            height: "90%",
            backgroundColor: darkMode ? "#23272e" : "#fff",
            borderRadius: 2,
            p: 1,
          }}
        >
          <Line
            ref={chartRef}
            data={fluxChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    color: darkMode ? "#e0e0e0" : "#333",
                  },
                },
                annotation: showWarning
                  ? {
                      annotations: {
                        warningThreshold: {
                          type: "line",
                          mode: "horizontal",
                          scaleID: "y",
                          value: 10,
                          borderColor: "red",
                          borderWidth: 2,
                          borderDash: [6, 6],
                          label: {
                            display: true,
                            content: "SWPC 10 MeV Warning Threshold",
                            color: "red",
                            font: {
                              weight: "bold",
                            },
                            position: "start",
                            yAdjust: -15,
                          },
                        },
                      },
                    }
                  : undefined,
                zoom: {
                  pan: {
                    enabled: true,
                    mode: "xy",
                  },
                  zoom: {
                    wheel: {
                      enabled: true,
                    },
                    pinch: {
                      enabled: true,
                    },
                    mode: "xy",
                  },
                },
              },
              scales: {
                x: {
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                  },
                  grid: {
                    color: darkMode ? "#444" : "#e0e0e0",
                  },
                  title: {
                    display: true,
                    text: `Time (${(() => {
                      const tzMap = {
                        local: "Local Time",
                        UTC: "UTC (GMT+0)",
                        "America/New_York": "US/Eastern (GMT-5)",
                        "America/Chicago": "US/Central (GMT-6)",
                        "America/Denver": "US/Mountain (GMT-7)",
                        "America/Los_Angeles": "US/Pacific (GMT-8)",
                        "Europe/London": "Europe/London (GMT+0)",
                        "Europe/Paris": "Europe/Paris (GMT+1)",
                        "Asia/Tokyo": "Asia/Tokyo (GMT+9)",
                        "Australia/Sydney": "Australia/Sydney (GMT+10)",
                      };
                      return tzMap[selectedTimezone] || selectedTimezone;
                    })()})`,
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: 16 },
                  },
                },
                y: {
                  max: showWarning ? 12 : undefined,
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                  },
                  grid: {
                    color: darkMode ? "#444" : "#e0e0e0",
                  },
                  title: {
                    display: true,
                    text: "Proton Flux (pfu)",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: 16 },
                  },
                },
              },
              layout: {
                padding: 10,
              },
              backgroundColor: darkMode ? "#23272e" : "#fff",
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProtonFluxChart;
