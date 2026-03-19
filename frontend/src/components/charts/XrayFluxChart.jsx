import React from "react";
import { debounce } from "lodash";
import { useDispatch, useSelector } from "react-redux";
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
import { Card, CardContent, Box } from "@mui/material";
import {
  sortByTimeTag,
  getUniqueTimeTags,
  formatSciNotation,
  getFlareClass,
  getIntervalMs,
  filterLabelsByInterval,
} from "./helpers";
import persistentLabelBoxPluginFactory from "./plugins/persistentLabelBoxPlugin";
import chartBackgroundBandsPlugin from "./plugins/chartBackgroundBandsPlugin";
import { R_LEVELS, MAJOR_TIMEZONES } from "./constants";

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

const XrayFluxChart = ({ chartRef: externalChartRef }) => {
  const rawXrayFlux = useSelector((state) => state.charts?.xrayFlux);
  const [xrayFlux, setXrayFlux] = React.useState(sortByTimeTag(rawXrayFlux));

  const debouncedSetXrayFlux = React.useMemo(
    () => debounce((data) => setXrayFlux(sortByTimeTag(data)), 200),
    []
  );

  React.useEffect(() => {
    debouncedSetXrayFlux(rawXrayFlux);
    return () => debouncedSetXrayFlux.cancel();
  }, [rawXrayFlux, debouncedSetXrayFlux]);

  const darkMode = useSelector((state) => state.ui.darkMode);
  const showDate = useSelector((state) => state.charts.showDate);
  const customdt = useSelector((state) => state.charts.customdt);
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const axisLabelSize = useSelector((state) => state.charts.axisLabelSize);
  const dispatch = useDispatch();

  // Track mouse position over the canvas
  const mousePosRef = React.useRef({ x: null, y: null, inside: false });

  // Persistent label box plugin (shared, now generic)

  // R-levels: [min, max, color, label]
  const backgroundBandsOpacity = useSelector(
    (state) => state.charts.backgroundBandsOpacity,
  );
  const radioBlackoutBackgroundPlugin = React.useMemo(
    () =>
      chartBackgroundBandsPlugin(R_LEVELS, {
        id: "radioBlackoutBackground",
        font: "bold 16px sans-serif",
        textAlign: "right",
        labelPosition: "left",
        labelOffset: 25,
        alpha: backgroundBandsOpacity,
      }),
    [backgroundBandsOpacity],
  );

  // Build unique time_tag list (chronological)
  const uniqueTimeTags = getUniqueTimeTags(xrayFlux);
  const xrayLabels = filterLabelsByInterval(uniqueTimeTags, customdt.range);

  function getFlux(time_tag, satellite, energy) {
    const found = xrayFlux.find(
      (item) =>
        item.time_tag === time_tag &&
        item.satellite === satellite &&
        item.energy === energy,
    );
    return found ? found.flux : null;
  }

  const goes18Long = xrayLabels.map((time_tag) =>
    getFlux(time_tag, 18, "0.1-0.8nm"),
  );
  const goes18Short = xrayLabels.map((time_tag) =>
    getFlux(time_tag, 18, "0.05-0.4nm"),
  );
  const goes19Long = xrayLabels.map((time_tag) =>
    getFlux(time_tag, 19, "0.1-0.8nm"),
  );
  const goes19Short = xrayLabels.map((time_tag) =>
    getFlux(time_tag, 19, "0.05-0.4nm"),
  );

  const labelBoxSize = useSelector((state) => state.charts.labelBoxSize);
  const persistentLabelBoxPlugin = React.useMemo(
    () =>
      persistentLabelBoxPluginFactory({
        mousePosRef,
        labelBoxSize,
        getLabelLines: ({ chart, nearestIndex }) => {
          // Format the time as 'Mon DD h:mmAM/PM'
          const labelIso = xrayLabels[nearestIndex];
          const date = new Date(labelIso);
          const month = date.toLocaleString("en-US", {
            month: "short",
            timeZone:
              selectedTimezone === "local" ? undefined : selectedTimezone,
          });
          const day = date.toLocaleString("en-US", {
            day: "numeric",
            timeZone:
              selectedTimezone === "local" ? undefined : selectedTimezone,
          });
          const time = date.toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone:
              selectedTimezone === "local" ? undefined : selectedTimezone,
          });
          const label = `${month} ${day}, ${time}`;
          const lines = [];
          lines.push({ type: "time", text: label });
          chart.data.datasets.forEach((ds) => {
            const value = ds.data[nearestIndex];
            let valueStr =
              value !== null && value !== undefined && !isNaN(value)
                ? formatSciNotation(value)
                : "N/A";
            let color = ds.borderColor;
            // For X-ray, show flare class as extra info
            let extra =
              value !== null && value !== undefined && !isNaN(value)
                ? getFlareClass(value)
                : "";
            lines.push({
              type: "dataset",
              color,
              label: ds.label,
              value: valueStr,
              units: valueStr !== "N/A" ? "W/m²" : "",
              extra: valueStr !== "N/A" ? extra : "",
            });
          });
          return lines;
        },
      }),
    [mousePosRef, xrayLabels, selectedTimezone],
  );

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
        borderColor: "#b39ddb",
        backgroundColor: "#ede7f6",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };
  // Chart ref for reset zoom or export
  const internalChartRef = React.useRef();
  const chartRef = externalChartRef || internalChartRef;

  // Track mouse position and force chart redraw on mouse move
  React.useEffect(() => {
    const chart =
      chartRef.current && chartRef.current.canvas
        ? chartRef.current
        : chartRef.current?.chartInstance || chartRef.current;
    if (!chart || !chart.canvas) return;
    const canvas = chart.canvas;
    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mousePosRef.current = { x, y, inside: true };
      chart.update("none");
    };
    const handleLeave = (e) => {
      mousePosRef.current = { x: null, y: null, inside: false };
      chart.update("none");
    };
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [xrayLabels, selectedTimezone]);

  return (
    <Card
      sx={{
        height: 600,
        backgroundColor: darkMode ? "#23272e" : "#fff",
        boxShadow: darkMode ? "0 2px 8px #111" : undefined,
      }}
    >
      <CardContent
        sx={{ height: "100%", backgroundColor: darkMode ? "#23272e" : "#fff" }}
      >
        <Box
          sx={{
            height: "100%",
            backgroundColor: darkMode ? "#23272e" : "#fff",
            borderRadius: 2,
          }}
        >
          <Line
            key={`xraychart-${xrayLabels.join("-")}-${selectedTimezone}-${backgroundBandsOpacity}-${labelBoxSize}`}
            ref={chartRef}
            data={xrayChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { size: axisLabelSize, weight: "bold" },
                  },
                },
                tooltip: {
                  enabled: false,
                },
              },
              scales: {
                x: {
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    autoSkip: true,
                    maxTicksLimit: 18,
                    font: {
                      size: axisLabelSize,
                    },
                    callback: function (value, index) {
                      const date = new Date(xrayLabels[index]);
                      if (selectedTimezone === "local") {
                        return date.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        });
                      } else {
                        return date.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: selectedTimezone,
                        });
                      }
                    },
                    includeBounds: true,
                  },
                  title: {
                    display: true,
                    text: `Time (${(() => {
                      const tzMap = Object.fromEntries(
                        MAJOR_TIMEZONES.map((tz) => [tz.value, tz.label]),
                      );
                      return tzMap[selectedTimezone] || selectedTimezone;
                    })()})`,
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: axisLabelSize },
                  },
                },
                y: {
                  type: "logarithmic",
                  position: "left",
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: {
                      size: axisLabelSize,
                    },
                    callback: function (value) {
                      const allowed = [
                        1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2,
                      ];
                      if (allowed.includes(value)) {
                        const exp = Math.log10(value);
                        return `10^${exp}`;
                      }
                      return "";
                    },
                    min: 1e-10,
                    max: 1e-1,
                    callbackContext: undefined,
                    major: {
                      enabled: true,
                    },
                    stepSize: undefined,
                  },
                  afterBuildTicks: function (axis) {
                    // Only use the allowed ticks
                    axis.ticks = [
                      1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2,
                      1e-1,
                    ].map((v) => ({ value: v }));
                  },
                  grid: {
                    color: darkMode ? "#444" : "#e0e0e0",
                  },
                  title: {
                    display: true,
                    text: "X-ray Flux (W/m²)",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: axisLabelSize },
                  },
                  min: 1e-10,
                  max: 1e-1,
                },
                flareClass: {
                  type: "logarithmic",
                  position: "right",
                  min: 1e-10,
                  max: 1e-1,
                  grid: {
                    drawOnChartArea: false,
                  },
                  afterBuildTicks: function (axis) {
                    // Align with main y-axis: only show A, B, C, M, X
                    axis.ticks = [1e-8, 1e-7, 1e-6, 1e-5, 1e-4].map((v) => ({
                      value: v,
                    }));
                  },
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    callback: function (value) {
                      if (value === 1e-8) return "A";
                      if (value === 1e-7) return "B";
                      if (value === 1e-6) return "C";
                      if (value === 1e-5) return "M";
                      if (value === 1e-4) return "X";
                      return "";
                    },
                    font: { weight: "bold", size: axisLabelSize },
                    padding: 8,
                  },
                  title: {
                    display: true,
                    text: "X-ray Flare Class",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: axisLabelSize },
                  },
                },
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
                    font: { weight: "bold", size: axisLabelSize },
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
                    font: { weight: "bold", size: axisLabelSize },
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
                    font: { weight: "bold", size: axisLabelSize },
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
                    font: { weight: "bold", size: axisLabelSize },
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
                    font: { weight: "bold", size: axisLabelSize },
                    backgroundColor: "rgba(0,0,0,0)",
                  },
                },
                // Add vertical date lines with labels above the chart area (outside plot)
                ...(() => {
                  const dateLines = {};
                  let prevDateStr = null;
                  xrayLabels.forEach((iso, idx) => {
                    const date = new Date(iso);
                    const currDateStr =
                      selectedTimezone === "local"
                        ? date.toLocaleString("en-US", {
                            month: "long",
                            day: "numeric",
                          })
                        : date.toLocaleString("en-US", {
                            month: "long",
                            day: "numeric",
                            timeZone: selectedTimezone,
                          });
                    if (prevDateStr !== null && currDateStr !== prevDateStr) {
                      dateLines[`dateLine${idx}`] = {
                        type: "line",
                        xMin: idx - 0.5,
                        xMax: idx - 0.5,
                        borderColor: darkMode ? "#90caf9" : "#1976d2",
                        borderWidth: 2,
                        borderDash: [2, 6],
                        shadowColor: darkMode
                          ? "rgba(144,202,249,0.5)"
                          : "rgba(25,118,210,0.3)",
                        shadowBlur: 8,
                        label: {
                          display: true,
                          content: currDateStr,
                          position: "end",
                          color: darkMode ? "#23272e" : "#fff",
                          font: { weight: "bold", size: axisLabelSize - 4 },
                          backgroundColor: darkMode ? "#90caf9" : "#1976d2",
                          borderRadius: 8,
                          padding: 4,
                          yAdjust: 0,
                          xAdjust: 0,
                          rotation: 0,
                          borderWidth: 0,
                        },
                      };
                    }
                    prevDateStr = currDateStr;
                  });
                  return dateLines;
                })(),
              },
            }}
            plugins={[
              zoomPlugin,
              annotationPlugin,
              radioBlackoutBackgroundPlugin,
              persistentLabelBoxPlugin,
            ]}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default XrayFluxChart;
