// Add import for datalabels plugin
import ChartDataLabels from "chartjs-plugin-datalabels";
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Card,
  CardContent,
  Box,
  CardHeader,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSelector, useDispatch } from "react-redux";
import annotationPlugin from "chartjs-plugin-annotation";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { sortByTimeTag } from "../helpers/helpers";
import persistentLabelBoxPluginFactory from "../plugins/persistentLabelBoxPlugin";
import chartBackgroundBandsPlugin from "../plugins/chartBackgroundBandsPlugin";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
Chart.register(annotationPlugin, zoomPlugin);

import { G_LEVELS, KP_COLORS } from "../helpers/constants";
import { getHelpTopicPath } from "../../help/helpers/constants";
import { useAllTimezones } from "../../../hooks/useAllTimezones";
const KpIndexChart = ({ chartRef }) => {
  const backgroundBandsOpacity = useSelector(
    (state) => state.charts.backgroundBandsOpacity,
  );
  const timeZones = useAllTimezones();

  const kpGLevelBackgroundPlugin = React.useMemo(
    () =>
      chartBackgroundBandsPlugin(G_LEVELS, {
        id: "kpGLevelBackground",
        font: "bold 16px sans-serif",
        textAlign: "right",
        labelPosition: "left",
        labelOffset: 25,
        alpha: backgroundBandsOpacity,
      }),
    [backgroundBandsOpacity],
  );
  const kpIndex = useSelector((state) => state.charts?.kpIndex);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const dispatch = useDispatch();
  const sortedKpIndex = sortByTimeTag(kpIndex);
  // Label formatting logic using helper
  let prevDateStr = null;
  // Use ISO date strings for data.labels (for time scale and label box)
  const kpLabels = sortedKpIndex.map((item) => item.time_tag);
  const kpData = sortedKpIndex.map((item) => item.kp);
  // Kp scale colors

  const kpBarColor = "#ff9800";
  const aRunningBarColor = "#1976d2";

  // Use G_LEVELS colors for bars to match background bands
  function getKpColor(kp) {
    if (kp < 5) return G_LEVELS[0].color;
    if (kp >= 5 && kp < 6) return G_LEVELS[1].color;
    if (kp >= 6 && kp < 7) return G_LEVELS[2].color;
    if (kp >= 7 && kp < 8) return G_LEVELS[3].color;
    if (kp >= 8 && kp < 9) return G_LEVELS[4].color;
    if (kp >= 9) return G_LEVELS[5].color;
    return G_LEVELS[0].color;
  }

  const kpChartData = React.useMemo(() => {
    return {
      labels: kpLabels,
      datasets: [
        {
          label: "Kp Index",
          data: kpData,
          backgroundColor: kpData.map(getKpColor),
          borderColor: kpData.map(getKpColor),
        },
      ],
    };
  }, [kpData]);

  // chartRef is now passed from parent
  // Track mouse position for persistent label box
  const mousePosRef = React.useRef({ x: null, y: null, inside: false });
  // Always create a new instance of the persistent label box plugin for this chart
  const labelBoxSize = useSelector((state) => state.charts.labelBoxSize);
  const axisLabelSize = useSelector((state) => state.charts.axisLabelSize);
  const persistentLabelBoxPlugin = React.useMemo(
    () =>
      persistentLabelBoxPluginFactory({
        mousePosRef,
        labelBoxSize,
        getLabelLines: ({ chart, nearestIndex }) => {
          // Always use the value and date from sortedKpIndex[nearestIndex]
          const point = sortedKpIndex[nearestIndex];
          let label = "";
          if (point && point.time_tag) {
            const date = new Date(point.time_tag);
            // Show date as 'Mon DD, HH:MM AM/PM' in the selected timezone
            const month = date.toLocaleString("en-US", {
              month: "long",
              timeZone:
                selectedTimezone === "local" ? undefined : selectedTimezone,
            });
            const day = date.toLocaleString("en-US", {
              day: "2-digit",
              timeZone:
                selectedTimezone === "local" ? undefined : selectedTimezone,
            });
            const time = date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone:
                selectedTimezone === "local" ? undefined : selectedTimezone,
            });
            label = `${month} ${day}, ${time}`;
          }
          const lines = [];
          lines.push({ type: "time", text: label });
          // Kp Index
          lines.push({
            type: "dataset",
            color: kpBarColor,
            label: "Kp Index",
            value:
              point && point.kp !== undefined && point.kp !== null
                ? point.kp
                : "",
            units: "",
          });
          // Ap Index
          lines.push({
            type: "dataset",
            color: aRunningBarColor,
            label: "Ap Index",
            value:
              point && point.a_running !== undefined && point.a_running !== null
                ? point.a_running
                : "",
            units: "",
          });
          return lines;
        },
      }),
    [mousePosRef, sortedKpIndex, selectedTimezone],
  );

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
        title="PLANETARY K-INDEX (Kp Index)"
        disableTypography
        sx={{
          color: darkMode ? "#e0e0e0" : "#333",
          fontSize: "1rem",
          fontWeight: "bold",
          borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
        }}
        action={
          <>
            <Tooltip title="Reset Zoom">
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
            </Tooltip>
            <Tooltip title="Open the Kp Index help article in a new tab.">
              <IconButton
                onClick={() => window.open(getHelpTopicPath("KP Index"), "_blank", "noopener,noreferrer")}
                aria-label="Help"
              >
                <InfoOutlineIcon fontSize="small" sx={{ color: "#fff" }} />
              </IconButton>
            </Tooltip>
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
          <Bar
            key={`kpchart-${kpLabels.length}-${selectedTimezone}-${backgroundBandsOpacity}-${labelBoxSize}}`}
            ref={chartRef}
            data={kpChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
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
                datalabels: {
                  anchor: "end",
                  align: "end",
                  color: darkMode ? "#e0e0e0" : "#333",
                  font: {
                    weight: "bold",
                    size: axisLabelSize - 2,
                  },
                  formatter: function (value) {
                    return value;
                  },
                },
                annotation: {
                  annotations: {
                    ...(() => {
                      const dateLines = {};
                      let prevDateStr = null;
                      kpChartData.labels.forEach((label, idx) => {
                        const date = new Date(sortedKpIndex[idx]?.time_tag);
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
                        if (
                          prevDateStr !== null &&
                          currDateStr !== prevDateStr
                        ) {
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
                },
              },
              scales: {
                x: {
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: {
                      size: axisLabelSize,
                    },
                    callback: function (value, index, ticks) {
                      // Use kpLabels[index] for correct ISO string, like XrayFluxChart
                      const iso = kpLabels[index];
                      if (!iso) return "";
                      const date = new Date(iso);
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
                  position: "left",
                  ticks: {
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: {
                      size: axisLabelSize,
                    },
                  },
                  grid: {
                    color: darkMode ? "#444" : "#e0e0e0",
                  },
                  title: {
                    display: true,
                    text: "Kp Index (0 -- 9)",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: axisLabelSize },
                  },
                  min: 0,
                  max: 10,
                },
              },
              layout: {
                padding: 10,
              },
              backgroundColor: darkMode ? "#23272e" : "#fff",
            }}
            plugins={[
              kpGLevelBackgroundPlugin,
              annotationPlugin,
              persistentLabelBoxPlugin,
              ChartDataLabels,
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

export default KpIndexChart;
