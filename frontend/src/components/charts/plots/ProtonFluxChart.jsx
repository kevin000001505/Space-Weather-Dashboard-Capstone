import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Card, CardContent, Box, CardHeader } from "@mui/material";
import {
  formatChartLabel,
  sortByTimeTag,
  formatSciNotation,
  filterLabelsByInterval,
  getIntervalMs,
  getUniqueTimeTags,
} from "../helpers/helpers";
import persistentLabelBoxPluginFactory from "../plugins/persistentLabelBoxPlugin";
import chartBackgroundBandsPlugin from "../plugins/chartBackgroundBandsPlugin";
import { S_LEVELS } from "../helpers/constants";
import { debounce } from "lodash";
import { useAllTimezones } from "../../../hooks/useAllTimezones";

Chart.register(annotationPlugin);

const ProtonFluxChart = ({ chartRef: externalChartRef }) => {
  const axisLabelSize = useSelector((state) => state.charts.axisLabelSize);

  const backgroundBandsOpacity = useSelector(
    (state) => state.charts.backgroundBandsOpacity,
  );
  const borderWidth = useSelector((state) => state.charts.borderWidth);

  const protonSLevelBackgroundPlugin = React.useMemo(
    () =>
      chartBackgroundBandsPlugin(S_LEVELS, {
        id: "protonSLevelBackground",
        font: "bold 16px sans-serif",
        textAlign: "right",
        labelPosition: "left",
        labelOffset: 25,
        alpha: backgroundBandsOpacity,
        afterDrawLabels: true,
      }),
    [backgroundBandsOpacity],
  );

  const protonFlux = useSelector((state) => state.charts.protonFlux);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const customdt = useSelector((state) => state.charts.customdt);
  const timeZones = useAllTimezones();

  const [chartData, fluxLabels] = React.useMemo(() => {
    const intervalMs = getIntervalMs(customdt.range);
    const intervalMap = new Map();
    const intervalLabelSet = new Set();

    for (const item of protonFlux) {
      const date = new Date(item.time_tag);
      const intervalStart =
        Math.floor(date.getTime() / intervalMs) * intervalMs;
      const labelIso = new Date(intervalStart).toISOString();
      intervalLabelSet.add(labelIso);
      if (!intervalMap.has(labelIso)) {
        intervalMap.set(labelIso, {
          flux_10_mev: item.flux_10_mev,
          flux_50_mev: item.flux_50_mev,
          flux_100_mev: item.flux_100_mev,
          flux_500_mev: item.flux_500_mev,
        });
      } else {
        const prev = intervalMap.get(labelIso);
        intervalMap.set(labelIso, {
          flux_10_mev: Math.max(
            prev.flux_10_mev ?? -Infinity,
            item.flux_10_mev ?? -Infinity,
          ),
          flux_50_mev: Math.max(
            prev.flux_50_mev ?? -Infinity,
            item.flux_50_mev ?? -Infinity,
          ),
          flux_100_mev: Math.max(
            prev.flux_100_mev ?? -Infinity,
            item.flux_100_mev ?? -Infinity,
          ),
          flux_500_mev: Math.max(
            prev.flux_500_mev ?? -Infinity,
            item.flux_500_mev ?? -Infinity,
          ),
        });
      }
    }

    let labels = Array.from(intervalLabelSet);
    labels.sort();
    labels = filterLabelsByInterval(labels, customdt.range);

    const flux10Mev = [];
    const flux50Mev = [];
    const flux100Mev = [];
    const flux500Mev = [];
    for (let i = 0; i < labels.length; i++) {
      const labelIso = labels[i];
      const peak = intervalMap.get(labelIso);
      flux10Mev.push(peak ? peak.flux_10_mev : null);
      flux50Mev.push(peak ? peak.flux_50_mev : null);
      flux100Mev.push(peak ? peak.flux_100_mev : null);
      flux500Mev.push(peak ? peak.flux_500_mev : null);
    }

    const fluxChartData = {
      labels: labels,
      datasets: [
        {
          label: "Proton Flux (10 MeV)",
          data: flux10Mev,
          borderColor: "#9400D3",
          backgroundColor: "rgba(148,0,211,0.2)",
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: borderWidth,
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
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: borderWidth,
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
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: borderWidth,
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
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: borderWidth,
        },
      ],
    };

    return [fluxChartData, labels];
  }, [protonFlux, customdt, selectedTimezone, borderWidth]);

  const chartRef = externalChartRef;

  const mousePosRef = React.useRef({ x: null, y: null, inside: false });

  const labelBoxSize = useSelector((state) => state.charts.labelBoxSize);
  const persistentLabelBoxPlugin = React.useMemo(
    () =>
      persistentLabelBoxPluginFactory({
        mousePosRef,
        labelBoxSize,
        getLabelLines: ({ chart, nearestIndex }) => {
          const labelIso = fluxLabels[nearestIndex];
          const date = new Date(labelIso);
          const month = date.toLocaleString("en-US", {
            month: "short",
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
          const label = `${month} ${day}, ${time}`;
          const lines = [];
          lines.push({ type: "time", text: label });

          chart.data.datasets.forEach((ds) => {
            const value = ds.data[nearestIndex];
            let valueStr =
              value !== null && value !== undefined && !isNaN(value)
                ? formatSciNotation(value)
                : "";
            lines.push({
              type: "dataset",
              color: ds.borderColor,
              label: ds.label,
              value: valueStr,
              units: valueStr ? "pfu" : "",
            });
          });
          return lines;
        },
      }),
    [mousePosRef, protonFlux, selectedTimezone],
  );

  return (
    <Card
      sx={{
        height: 500,
        backgroundColor: darkMode ? "#23272e" : "#fff",
        boxShadow: darkMode ? "0 2px 8px #111" : undefined,
      }}
    >
      <CardHeader
        title="PROTON FLUX"
        disableTypography
        sx={{
          color: darkMode ? "#e0e0e0" : "#333",
          fontSize: "1rem",
          fontWeight: "bold",
          borderBottom: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
        }}
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
            key={`protonfluxchart-${fluxLabels.join("-")}-${selectedTimezone}-${backgroundBandsOpacity}-${labelBoxSize}-${borderWidth}`}
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
                    console.log(target);
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
                annotation: (() => {
                  const dateLines = {};
                  let prevDateStr = null;
                  fluxLabels.forEach((labelIso, idx) => {
                    const date = new Date(labelIso);
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
                  dateLines.warningThreshold = {
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
                        size: axisLabelSize - 4,
                        weight: "bold",
                      },
                      position: "middle",
                      yAdjust: 0,
                    },
                  };
                  return { annotations: dateLines };
                })(),
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
                      const date = new Date(fluxLabels[index]);
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
                  min: 1e-1 / 2,
                  max: 1e2 / 5,
                  ticks: {
                    font: {
                      size: axisLabelSize,
                    },
                    color: darkMode ? "#e0e0e0" : "#333",
                    callback: function (value) {
                      if (value === 0.01) return "-2";
                      if (value === 0.1) return "-1";
                      if (value === 1) return "1";
                      if (value === 2) return "2";
                      if (value === 3) return "3";
                      if (value === 4) return "4";
                      if (value === 5) return "5";
                      if (value === 10) return "10";
                      if (value === 100) return "20";
                      return "";
                    },
                  },
                  title: {
                    display: true,
                    text: "Proton Flux ( log₁₀(pfu) )",
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: axisLabelSize },
                  },
                },
              },
              layout: {
                padding: 10,
              },
              backgroundColor: darkMode ? "#23272e" : "#fff",
            }}
            plugins={[
              protonSLevelBackgroundPlugin,
              annotationPlugin,
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

export default ProtonFluxChart;
