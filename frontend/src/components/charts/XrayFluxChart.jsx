import React from "react";
import { useDispatch } from "react-redux";
import { setSelectedTimezone } from "../../store/slices/chartsSlice";
import { Line } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  LogarithmicScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useSelector } from "react-redux";

// Register zoom plugin
Chart.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Legend,
  zoomPlugin,
  annotationPlugin,
  [Tooltip],
);

const XrayFluxChart = () => {
  const xrayFlux = useSelector((state) => state.charts?.xrayFlux);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const showDate = useSelector((state) => state.charts.showDate);
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );

  const xrayLabels = Array.from(
    new Set(xrayFlux.map((item) => item.time_tag)),
  ).map((time_tag) => {
    const date = new Date(time_tag);
    let month, dayNum, hour;
    if (selectedTimezone === "local") {
      month = date.toLocaleString("en-US", { month: "short" });
      dayNum = date.getDate();
      hour = date.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      month = date.toLocaleString("en-US", {
        month: "short",
        timeZone: selectedTimezone,
      });
      dayNum = date.toLocaleString("en-US", {
        day: "numeric",
        timeZone: selectedTimezone,
      });
      hour = date.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: selectedTimezone,
      });
    }
    return showDate ? `${month} ${dayNum}' ${hour}` : `${hour}`;
  });

  const goes18Long = xrayFlux
    .filter((item) => item.satellite === 18 && item.energy === "0.1-0.8nm")
    .map((item) => item.flux);
  const goes18Short = xrayFlux
    .filter((item) => item.satellite === 18 && item.energy === "0.05-0.4nm")
    .map((item) => item.flux);
  const goes19Long = xrayFlux
    .filter((item) => item.satellite === 19 && item.energy === "0.1-0.8nm")
    .map((item) => item.flux);
  const goes19Short = xrayFlux
    .filter((item) => item.satellite === 19 && item.energy === "0.05-0.4nm")
    .map((item) => item.flux);

  const xrayChartData = {
    labels: xrayLabels,
    datasets: [
      {
        label: "GOES-18 Long (0.1-0.8nm)",
        data: goes18Long,
        borderColor: "#ff9800",
        backgroundColor: "#ff980033",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: "GOES-18 Short (0.05-0.4nm)",
        data: goes18Short,
        borderColor: "#f44336",
        backgroundColor: "#f4433633",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: "GOES-19 Long (0.1-0.8nm)",
        data: goes19Long,
        borderColor: "#1976d2",
        backgroundColor: "#1976d233",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: "GOES-19 Short (0.05-0.4nm)",
        data: goes19Short,
        borderColor: "#673ab7",
        backgroundColor: "#673ab733",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
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
            X-RAY FLUX
          </Typography>
          {/* <Tooltip title="Reset Zoom"> */}
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
          {/* </Tooltip> */}
        </Box>
        <Box
          sx={{
            height: "80%",
            backgroundColor: darkMode ? "#23272e" : "#fff",
            borderRadius: 2,
            p: 1,
          }}
        >
          <Line
            ref={chartRef}
            data={xrayChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    color: darkMode ? "#e0e0e0" : "#333",
                  },
                },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      const value = context.parsed.y;
                      let flareClass = "";
                      if (value >= 1e-4) flareClass = "X";
                      else if (value >= 1e-5) flareClass = "M";
                      else if (value >= 1e-6) flareClass = "C";
                      else if (value >= 1e-7) flareClass = "B";
                      else if (value >= 1e-8) flareClass = "A";
                      else flareClass = "<A";

                      const sci = value ? value.toExponential(2) : value;
                      return `${context.dataset.label}: ${sci} W/m² (Flare Class: ${flareClass})`;
                    },
                  },
                },
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
                    font: { weight: "bold", size: 14 },
                  },
                },
                y: {
                  type: "logarithmic",
                  position: "left",
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    callback: function (value) {
                      if (value === 0) return "0";
                      const exp = Math.log10(value);
                      return `10^${exp.toFixed(0)}`;
                    },
                  },
                  grid: {
                    color: darkMode ? "#444" : "#e0e0e0",
                  },
                  title: {
                    display: true,
                    text: "X-ray Flux (W/m²)",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: 16 },
                  },
                  min: 1e-9,
                  max: 1e-2,
                },
                flareClass: {
                  type: "logarithmic",
                  position: "right",
                  min: 1e-9,
                  max: 1e-2,
                  grid: {
                    drawOnChartArea: false,
                  },
                  afterBuildTicks: function (axis) {
                    // Custom ticks for flare classes
                    return [1e-8, 1e-7, 1e-6, 1e-5, 1e-4];
                  },
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    callback: function (value) {
                      // Map flux to flare class
                      if (value === 1e-8) return "A";
                      if (value === 1e-7) return "B";
                      if (value === 1e-6) return "C";
                      if (value === 1e-5) return "M";
                      if (value === 1e-4) return "X";
                      return "";
                    },
                    font: { weight: "bold", size: 14 },
                    padding: 8,
                  },
                  title: {
                    display: true,
                    text: "X-ray Flare Class",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: 16 },
                  },
                },
              },
              layout: {
                padding: 10,
              },
              backgroundColor: darkMode ? "#23272e" : "#fff",
              annotations: {
                flareA: {
                  type: "line",
                  yMin: 1e-8,
                  yMax: 1e-8,
                  borderColor: "#e0e0e0",
                  borderWidth: 1,
                  borderDash: [4, 4],
                  label: {
                    display: true,
                    position: "end",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold" },
                    backgroundColor: "rgba(0,0,0,0)",
                  },
                },
                flareB: {
                  type: "line",
                  yMin: 1e-7,
                  yMax: 1e-7,
                  borderColor: "#e0e0e0",
                  borderWidth: 1,
                  borderDash: [4, 4],
                  label: {
                    display: true,
                    position: "end",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold" },
                    backgroundColor: "rgba(0,0,0,0)",
                  },
                },
                flareC: {
                  type: "line",
                  yMin: 1e-6,
                  yMax: 1e-6,
                  borderColor: "#e0e0e0",
                  borderWidth: 1,
                  borderDash: [4, 4],
                  label: {
                    display: true,
                    position: "end",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold" },
                    backgroundColor: "rgba(0,0,0,0)",
                  },
                },
                flareM: {
                  type: "line",
                  yMin: 1e-5,
                  yMax: 1e-5,
                  borderColor: "#e0e0e0",
                  borderWidth: 1,
                  borderDash: [4, 4],
                  label: {
                    display: true,
                    position: "end",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold" },
                    backgroundColor: "rgba(0,0,0,0)",
                  },
                },
                flareX: {
                  type: "line",
                  yMin: 1e-4,
                  yMax: 1e-4,
                  borderColor: "#e0e0e0",
                  borderWidth: 1,
                  borderDash: [4, 4],
                  label: {
                    display: true,
                    position: "end",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold" },
                    backgroundColor: "rgba(0,0,0,0)",
                  },
                },
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default XrayFluxChart;
