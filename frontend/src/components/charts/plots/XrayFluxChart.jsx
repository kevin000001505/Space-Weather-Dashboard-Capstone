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
import RefreshIcon from "@mui/icons-material/Refresh";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import { Card, CardContent, Box, CardHeader } from "@mui/material";
import { IconButton, Tooltip as MuiTooltip } from "@mui/material";
import {
  sortByTimeTag,
  getUniqueTimeTags,
  formatSciNotation,
  getFlareClass,
  getIntervalMs,
  filterLabelsByInterval,
} from "../helpers/helpers";
import persistentLabelBoxPluginFactory from "../plugins/persistentLabelBoxPlugin";
import chartBackgroundBandsPlugin from "../plugins/chartBackgroundBandsPlugin";
import { R_LEVELS } from "../helpers/constants";
import { getHelpTopicPath } from "../../help/helpers/constants";
import { useAllTimezones } from "../../../hooks/useAllTimezones";
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
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
  const xrayFlux = useSelector((state) => state.charts.xrayFlux);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const customdt = useSelector((state) => state.charts.customdt);
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const axisLabelSize = useSelector((state) => state.charts.axisLabelSize);
  const borderWidth = useSelector((state) => state.charts.borderWidth);
  const timeZones = useAllTimezones();
  const dispatch = useDispatch();

  const mousePosRef = React.useRef({ x: null, y: null, inside: false }); // Track mouse position over the canvas

  const backgroundBandsOpacity = useSelector(
    (state) => state.charts.backgroundBandsOpacity,
  );
  const radioBlackoutBackgroundPlugin = React.useMemo(
    () =>
      chartBackgroundBandsPlugin(R_LEVELS, {
        id: "radioBlackoutBackground",
        font: "bold 1rem sans-serif",
        textAlign: "right",
        labelPosition: "left",
        labelOffset: 25,
        alpha: backgroundBandsOpacity,
      }),
    [backgroundBandsOpacity],
  ); // R-levels: [min, max, color, label]

  const [chartData, xrayLabels] = React.useMemo(() => {
    const intervalMs = getIntervalMs(customdt.range);
    const intervalMap = new Map();
    const intervalLabelSet = new Set();

    for (const item of xrayFlux) {
      const date = new Date(item.time_tag);
      const intervalStart =
        Math.floor(date.getTime() / intervalMs) * intervalMs;
      const labelIso = new Date(intervalStart).toISOString();
      intervalLabelSet.add(labelIso);
      const key = `${labelIso}|${item.satellite}|${item.energy}`;
      if (!intervalMap.has(key) || item.flux > intervalMap.get(key).flux) {
        intervalMap.set(key, { flux: item.flux, time_tag: item.time_tag });
      }
    }

    let labels = Array.from(intervalLabelSet);
    labels.sort();

    labels = filterLabelsByInterval(labels, customdt.range);

    function getPeakFlux(labelIso, satellite, energy) {
      const key = `${labelIso}|${satellite}|${energy}`;
      return intervalMap.has(key) ? intervalMap.get(key).flux : null;
    }

    const goes18Long = [];
    const goes18Short = [];
    const goes19Long = [];
    const goes19Short = [];
    for (let i = 0; i < labels.length; i++) {
      const labelIso = labels[i];
      goes18Long.push(getPeakFlux(labelIso, 18, "0.1-0.8nm"));
      goes18Short.push(getPeakFlux(labelIso, 18, "0.05-0.4nm"));
      goes19Long.push(getPeakFlux(labelIso, 19, "0.1-0.8nm"));
      goes19Short.push(getPeakFlux(labelIso, 19, "0.05-0.4nm"));
    }

    const xrayChartData = {
      labels: labels,
      datasets: [
        {
          label: "GOES-18 Long (0.1-0.8 nm)",
          data: goes18Long,
          borderColor: "#ff9800",
          backgroundColor: "#ff980033",
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: borderWidth,
        },
        {
          label: "GOES-18 Short (0.05-0.4 nm)",
          data: goes18Short,
          borderColor: "#f44336",
          backgroundColor: "#f4433633",
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: borderWidth,
        },
        {
          label: "GOES-19 Long (0.1-0.8 nm)",
          data: goes19Long,
          borderColor: "#1976d2",
          backgroundColor: "#1976d233",
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: borderWidth,
        },
        {
          label: "GOES-19 Short (0.05-0.4 nm)",
          data: goes19Short,
          borderColor: "#b39ddb",
          backgroundColor: "#ede7f6",
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: borderWidth,
        },
      ],
    };

    return [xrayChartData, labels];
  }, [xrayFlux, customdt, selectedTimezone, borderWidth]);

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
            month: "long",
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
    [mousePosRef, xrayLabels],
  );

  // Chart ref for reset zoom or export
  const chartRef = externalChartRef;

  const handleResetZoom = () => {
    const chartWrapper = chartRef.current;
    const chart = chartWrapper?.chart || chartWrapper;
    if (chart && chart.resetZoom) {
      chart.resetZoom();
    }
  };

  return (
    <Card
      sx={{
        height: 500,
        backgroundColor: darkMode ? "#23272e" : "#fff",
        boxShadow: darkMode ? "0 2px 8px #111" : undefined,
      }}
    >
      <CardHeader
        title="X-RAY FLUX"
        disableTypography
        sx={{
          color: darkMode ? "#e0e0e0" : "#333",
          fontSize: "1rem",
          fontWeight: "bold",
          borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
        }}
        action={
          <>
            <MuiTooltip title="Reset Zoom">
              <IconButton
                onClick={handleResetZoom}
                size="small"
                aria-label="reset zoom"
              >
                <RefreshIcon
                  fontSize="small"
                  sx={{ color: darkMode ? "#fff" : "#000" }}
                />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Open the X-Ray Flux help article in a new tab.">
              <IconButton
                onClick={() => window.open(getHelpTopicPath("X-Ray Flux"), "_blank", "noopener,noreferrer")}
                aria-label="Help"
              >
                <InfoOutlineIcon fontSize="small" sx={{ color: "#fff" }} />
              </IconButton>
            </MuiTooltip>
          </>
        }
      />
      <CardContent
        sx={{ height: "90%", backgroundColor: darkMode ? "#23272e" : "#fff" }}
      >
        <Box
          sx={{
            height: "100%",
            backgroundColor: darkMode ? "#23272e" : "#fff",
            borderRadius: 2,
          }}
        >
          <Line
            key={`xraychart-${xrayLabels.join("-")}-${selectedTimezone}-${backgroundBandsOpacity}-${labelBoxSize}-${borderWidth}`}
            ref={chartRef}
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { size: axisLabelSize, weight: "bold" },
                  },
                  onHover: (e) => {
                    const target = e?.native?.target || e?.chart?.canvas;
                    if (target) target.style.cursor = "pointer";
                  },
                  onLeave: (e) => {
                    const target = e?.native?.target || e?.chart?.canvas;
                    if (target) target.style.cursor = "";
                  },
                },
                tooltip: {
                  enabled: false,
                },
                zoom: {
                  pan: {
                    enabled: true,
                    mode: "x",
                    modifierKey: "ctrl",
                  },
                  zoom: {
                    drag: {
                      enabled: true,
                    },
                    mode: "x",
                    wheel: {
                      enabled: true,
                    },
                    pinch: {
                      enabled: true,
                    },
                  },
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
                        timeZones.map((tz) => [tz.value, tz.label]),
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
                    text: "X-ray Flux ( W/m² )",
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
            onPointerMove={(event) => {
              const chartWrapper = chartRef.current;
              const chart = chartWrapper?.chart || chartWrapper;
              if (!chart || !chart.canvas) return;
              const rect = chart.canvas.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const y = event.clientY - rect.top;
              mousePosRef.current = { x, y, inside: true };
              chart.update("none");
            }}
            onPointerOut={() => {
              const chartWrapper = chartRef.current;
              const chart = chartWrapper?.chart || chartWrapper;
              if (!chart || !chart.canvas) return;
              mousePosRef.current = { x: null, y: null, inside: false };
              chart.update("none");
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default XrayFluxChart;
