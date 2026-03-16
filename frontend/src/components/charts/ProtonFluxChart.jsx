import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Card, CardContent, Box } from "@mui/material";
import { formatChartLabel, sortByTimeTag, formatSciNotation } from "./helpers";
import persistentLabelBoxPluginFactory from "./plugins/persistentLabelBoxPlugin";
import chartBackgroundBandsPlugin from "./plugins/chartBackgroundBandsPlugin";
import { S_LEVELS, MAJOR_TIMEZONES } from "./constants";

Chart.register(annotationPlugin);

const protonSLevelBackgroundPlugin = chartBackgroundBandsPlugin(S_LEVELS, {
  id: "protonSLevelBackground",
  font: "bold 16px sans-serif",
  textAlign: "right",
  labelPosition: "left",
  labelOffset: 25,
  alpha: 0.25,
  afterDrawLabels: true,
});

const ProtonFluxChart = () => {
  const dispatch = useDispatch();

  const protonFlux = useSelector((state) => state.charts?.protonFlux);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );

  const sortedProtonFlux = sortByTimeTag(protonFlux);
  let prevDateStr = null;
  const fluxLabels = sortedProtonFlux.map((item) => {
    const date = new Date(item.time_tag);
    const { label, dateStr } = formatChartLabel(
      date,
      selectedTimezone,
      prevDateStr,
    );
    prevDateStr = dateStr;
    return label;
  });

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
        borderColor: "#9400D3",
        backgroundColor: "rgba(148,0,211,0.2)",
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

  // Persistent label box plugin
  const mousePosRef = React.useRef({ x: null, y: null, inside: false });

  const persistentLabelBoxPlugin = React.useMemo(
    () =>
      persistentLabelBoxPluginFactory({
        mousePosRef,
        getLabelLines: ({ chart, nearestIndex }) => {
          const point = sortedProtonFlux[nearestIndex];
          let label = "";
          if (point && point.time_tag) {
            const date = new Date(point.time_tag);
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
            label = `${month} ${day}, ${time}`;
          }
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
    [mousePosRef, sortedProtonFlux, selectedTimezone],
  );

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
  }, [sortedProtonFlux, selectedTimezone]);

  return (
    <Card
      sx={{
        height: 900,
        backgroundColor: darkMode ? "#23272e" : "#fff",
        boxShadow: darkMode ? "0 2px 8px #111" : undefined,
      }}
    >
      <CardContent
        sx={{ height: "100%", backgroundColor: darkMode ? "#23272e" : "#fff" }}
      >
        <Box
          sx={{
            height: "90%",
            backgroundColor: darkMode ? "#23272e" : "#fff",
            borderRadius: 2,
            p: 1,
          }}
        >
          <Line
            key={`protonfluxchart-${sortedProtonFlux.map((p) => p.time_tag).join("-")}-${selectedTimezone}`}
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
                annotation: (() => {
                  const dateLines = {};
                  let prevDateStr = null;
                  sortedProtonFlux.forEach((point, idx) => {
                    const date = new Date(point?.time_tag);
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
                          font: { weight: "bold", size: 12 },
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
                    callback: function (value, index) {
                      const iso = sortedProtonFlux[index]?.time_tag;
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
                        MAJOR_TIMEZONES.map((tz) => [tz.value, tz.label]),
                      );
                      return tzMap[selectedTimezone] || selectedTimezone;
                    })()})`,
                    color: darkMode ? "#e0e0e0" : "#333",
                    font: { weight: "bold", size: 16 },
                  },
                },
                y: {
                  type: "logarithmic",
                  min: 1e-1 / 2,
                  max: 1e2 / 5,
                  ticks: {
                    font: {
                      size: 16,
                    },
                    color: darkMode ? "#e0e0e0" : "#333",
                    callback: function (value) {
                      if (value === 0.01) return "-2";
                      if (value === 0.1) return "-1";
                      if (value === 1) return "0";
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
                    font: { weight: "bold", size: 16 },
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
            onPointerMove={undefined}
            onPointerOut={undefined}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProtonFluxChart;
