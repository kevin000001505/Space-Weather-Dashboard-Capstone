import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getStops, rgbToHex } from "../../../utils/mapUtils";
import "./styles/ColorLegend.css";

const DRAP_STOPS = [
  { val: 0, color: "#000000" },
  { val: 5, color: "#7700ff" },
  { val: 15, color: "#00ffff" },
  { val: 20, color: "#55ff00" },
  { val: 30, color: "#ff8000" },
  { val: 35, color: "#ff0000" },
];

const GEOELECTRIC_STOPS = [
  { val: 1, color: "#0074D9" },
  { val: 10, color: "#7FDBFF" },
  { val: 100, color: "#2E0854" },
  { val: 10000, color: "#E040FB" },
];

const AURORA_STOPS = [
  { val: 0, color: "#00000000" },
  { val: 10, color: "#1eff00" },
  { val: 50, color: "#fff700" },
  { val: 80, color: "#ff0000" },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getRange = (stops = []) => {
  if (!stops.length) return { min: 0, max: 100 };
  return {
    min: stops[0].val,
    max: stops[stops.length - 1].val,
  };
};

// Equidistant percent for N stops: 0%, (1/(N-1))*100%, ..., 100%
const getEquidistantPercent = (index, total) => {
  if (total <= 1) return 0;
  return (index / (total - 1)) * 100;
};

const buildGradient = (stops = []) => {
  if (!stops.length) {
    return "linear-gradient(to top, #334155 0%, #94a3b8 100%)";
  }
  const total = stops.length;
  const parts = stops.map((stop, i) => {
    const pct = getEquidistantPercent(i, total);
    return `${stop.color} ${pct}%`;
  });
  return `linear-gradient(to top, ${parts.join(", ")})`;
};

const trimNumber = (value) => {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const formatAltitudeLabel = (value, useImperial) => {
  if (useImperial) {
    if (Math.abs(value) >= 1000) {
      return `${trimNumber(value / 1000)}k ft`;
    }
    return `${value} ft`;
  }

  if (Math.abs(value) >= 1000) {
    return `${trimNumber(value / 1000)} km`;
  }
  return `${value} m`;
};

const formatPlainLabel = (value, suffix = "") => {
  return suffix ? `${value}${suffix}` : `${value}`;
};

const LegendTicks = ({ stops, formatter }) => {
  const total = stops.length;
  return (
    <div className="colorLegend-ticks" aria-hidden="true">
      {stops.map((stop, index) => {
        const pct = getEquidistantPercent(index, total);
        return (
          <div
            key={`${stop.val}-${index}`}
            className="colorLegend-tick"
            style={{ bottom: `${pct}%` }}
          >
            <span className="colorLegend-tickLabel">{formatter(stop.val)}</span>
            <span className="colorLegend-tickLine" />
          </div>
        );
      })}
    </div>
  );
};

const LegendSection = ({ section, index }) => {
  const gradient = buildGradient(section.stops);
  const width = 180;
  const height = 210;
  return (
    <div
      className={`colorLegend-section stack-${index}`}
      style={{
        width,
        minHeight: height,
      }}
    >
      <div className="colorLegend-inner">
        <div className="colorLegend-header">
          <div className="colorLegend-titleWrap">
            <div className="colorLegend-title">{section.title}</div>
            <div className="colorLegend-subtitle">{section.subtitle}</div>
          </div>
        </div>

        <>
          <div className="colorLegend-scale">
            <LegendTicks stops={section.stops} formatter={section.formatter} />
            <div className="colorLegend-barWrap">
              <div
                className="colorLegend-bar"
                style={{ background: gradient }}
                aria-hidden="true"
              />
            </div>
          </div>
        </>
      </div>
    </div>
  );
};

const ColorLegend = React.forwardRef(function ColorLegend(props, ref) {
  const useImperial = useSelector((state) => state.ui.useImperial);

  const sections = useMemo(() => {
    const altitudeStops =
      getStops(useImperial).map(({ val, color }) => ({
        val,
        color: rgbToHex(color),
      })) || [];

    return [
      {
        key: "altitude",
        title: "Flights & Airports",
        subtitle: `Altitude | ${useImperial ? "Feet" : "Meters"}`,
        stops: altitudeStops,
        available: true,
        formatter: (value) => formatAltitudeLabel(value, useImperial),
      },
      {
        key: "drap",
        title: "DRAP",
        subtitle: "Absorption | dB",
        stops: DRAP_STOPS,
        available: true,
        formatter: (value) => formatPlainLabel(value),
      },
      {
        key: "aurora",
        title: "Aurora",
        subtitle: "Percentage | %",
        stops: AURORA_STOPS,
        available: false,
        formatter: (value) => formatPlainLabel(value),
      },
      {
        key: "geoelectric",
        title: "Geoelectric Field",
        subtitle: "Amplitude | V/km",
        stops: GEOELECTRIC_STOPS,
        available: false,
        formatter: (value) => formatPlainLabel(value),
      },
    ];
  }, [useImperial]);

  return (
    <div className="colorLegend-root" ref={ref}>
      {sections.map((section, index) => {
        return (
          <LegendSection key={section.key} section={section} index={index} />
        );
      })}
    </div>
  );
});

export default ColorLegend;
