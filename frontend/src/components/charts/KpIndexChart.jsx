// Add import for datalabels plugin
import ChartDataLabels from "chartjs-plugin-datalabels";
import React from "react";
import { Bar } from "react-chartjs-2";
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
  Tooltip,
} from "@mui/material";
import { useSelector } from "react-redux";

import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

import { useDispatch } from "react-redux";
import { setSelectedTimezone } from "../../store/slices/chartsSlice";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

Chart.register(zoomPlugin);
const KpIndexChart = () => {
  const kpIndex = useSelector((state) => state.charts?.kpIndex);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const showDate = useSelector((state) => state.charts.showDate);
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const dispatch = useDispatch();
  let prevDay = null;
  let dayChangeIndices = [];
  const sortedKpIndex = kpIndex
    ? [...kpIndex].sort((a, b) => new Date(a.time_tag) - new Date(b.time_tag))
    : [];
  const kpLabels = sortedKpIndex.map((item, idx) => {
    const date = new Date(item.time_tag);
    const day = date.getDate();
    if (prevDay !== null && day !== prevDay) {
      dayChangeIndices.push(idx);
    }
    prevDay = day;
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
  const kpData = sortedKpIndex.map((item) => item.kp);
  // Kp scale colors
  const kpColors = [
    "#8bc34a", // Kp < 5
    "#ffeb3b", // Kp = 5 (G1)
    "#ffc107", // Kp = 6 (G2)
    "#ff9800", // Kp = 7 (G3)
    "#f44336", // Kp = 8, 9 (G4)
    "#b71c1c", // Kp = 9o (G5)
  ];

  function getKpColor(kp) {
    if (kp < 5) return kpColors[0];
    if (kp === 5) return kpColors[1];
    if (kp === 6) return kpColors[2];
    if (kp === 7) return kpColors[3];
    if (kp === 8 || kp === 9) return kpColors[4];
    if (kp >= 9.0) return kpColors[5];
    return kpColors[0];
  }

  const barColors = kpData.map(getKpColor);

  const kpChartData = {
    labels: kpLabels,
    datasets: [
      {
        label: "Kp Index",
        data: kpData,
        backgroundColor: barColors,
        borderColor: barColors,
        borderWidth: 1,
      },
    ],
    plugins: {
      annotation: {
        annotations: dayChangeIndices.map((idx) => ({
          type: "line",
          scaleID: "x",
          value: kpLabels[idx],
          borderColor: darkMode ? "#ff5252" : "red",
          borderWidth: 2,
          label: {
            display: true,
            content: "Day Change",
            color: darkMode ? "#b71c1c" : "red",
            position: "start",
          },
        })),
      },
    },
  };

  const chartRef = React.useRef();
  return (
  // Chart ref for reset zoom
    <Card
      sx={{
        height: 540,
        backgroundColor: darkMode ? "#23272e" : "#fff",
        boxShadow: darkMode ? "0 2px 8px #111" : undefined,
      }}
    >
      <CardContent
        sx={{ height: "100%", backgroundColor: darkMode ? "#23272e" : "#fff" }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: darkMode ? "#e0e0e0" : "#333" }}
          >
            PLANETARY K-INDEX
          </Typography>
          <Tooltip title="Reset Zoom">
            <IconButton
              aria-label="reset zoom"
              onClick={() => {
                if (chartRef.current) {
                  chartRef.current.resetZoom();
                }
              }}
              sx={{ color: darkMode ? '#e0e0e0' : '#333' }}
            >
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          sx={{
            height: "80%",
            backgroundColor: darkMode ? "#23272e" : "#fff",
            borderRadius: 2,
            p: 1,
        }}
        >
          <Bar
            ref={chartRef}
            data={kpChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    color: darkMode ? "#e0e0e0" : "#333",
                  },
                },
                datalabels: {
                  anchor: "end",
                  align: "end",
                  color: darkMode ? "#e0e0e0" : "#333",
                  font: {
                    weight: "bold",
                  },
                  formatter: function (value) {
                    return value;
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
                        'local': 'Local Time',
                        'UTC': 'UTC (GMT+0)',
                        'America/New_York': 'US/Eastern (GMT-5)',
                        'America/Chicago': 'US/Central (GMT-6)',
                        'America/Denver': 'US/Mountain (GMT-7)',
                        'America/Los_Angeles': 'US/Pacific (GMT-8)',
                        'Europe/London': 'Europe/London (GMT+0)',
                        'Europe/Paris': 'Europe/Paris (GMT+1)',
                        'Asia/Tokyo': 'Asia/Tokyo (GMT+9)',
                        'Australia/Sydney': 'Australia/Sydney (GMT+10)',
                      };
                      return tzMap[selectedTimezone] || selectedTimezone;
                    })()})`,
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: 16 },
                  },
                },
                y: {
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                  },
                  grid: {
                    color: darkMode ? "#444" : "#e0e0e0",
                  },
                  title: {
                    display: true,
                    text: "Kp Index (0 -- 9)",
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
            plugins={[ChartDataLabels]}
          />
        </Box>
        {/* Kp Scale Legend */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 2,
          }}
        >
          {/* Kp < 5 */}
          <Box
            sx={{
              width: 100,
              height: 40,
              backgroundColor: "#8bc34a",
              border: "1px solid #888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{ color: "#333", fontWeight: "bold", fontSize: 14 }}
            >
              Kp &lt; 5
            </Typography>
          </Box>
          {/* Kp = 5 (G1) */}
          <Box
            sx={{
              width: 100,
              height: 40,
              backgroundColor: "#ffeb3b",
              border: "1px solid #888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{ color: "#333", fontWeight: "bold", fontSize: 14 }}
            >
              Kp = 5 (G1)
            </Typography>
          </Box>
          {/* Kp = 6 (G2) */}
          <Box
            sx={{
              width: 100,
              height: 40,
              backgroundColor: "#ffc107",
              border: "1px solid #888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{ color: "#333", fontWeight: "bold", fontSize: 14 }}
            >
              Kp = 6 (G2)
            </Typography>
          </Box>
          {/* Kp = 7 (G3) */}
          <Box
            sx={{
              width: 100,
              height: 40,
              backgroundColor: "#ff9800",
              border: "1px solid #888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{ color: "#333", fontWeight: "bold", fontSize: 14 }}
            >
              Kp = 7 (G3)
            </Typography>
          </Box>
          {/* Kp = 8, 9 (G4) */}
          <Box
            sx={{
              width: 100,
              height: 40,
              backgroundColor: "#f44336",
              border: "1px solid #888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{ color: "#333", fontWeight: "bold", fontSize: 14 }}
            >
              Kp = 8, 9 (G4)
            </Typography>
          </Box>
          {/* Kp = 9o (G5) */}
          <Box
            sx={{
              width: 100,
              height: 40,
              backgroundColor: "#b71c1c",
              border: "1px solid #888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}
            >
              Kp = 9<sub>o</sub> (G5)
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default KpIndexChart;
