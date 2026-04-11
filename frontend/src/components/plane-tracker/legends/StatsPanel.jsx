import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import FlightIcon from "@mui/icons-material/Flight";
import { alpha } from "@mui/material";

const StarSvg = ({ points, size = 14, color }) => {
  const cx = 7,
    cy = 7,
    outerR = 6.5,
    innerR = 3;
  const coords = [];
  for (let i = 0; i < points; i++) {
    const outerAngle = (Math.PI * 2 * i) / points - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / points;
    coords.push(
      `${cx + outerR * Math.cos(outerAngle)},${cy + outerR * Math.sin(outerAngle)}`,
    );
    coords.push(
      `${cx + innerR * Math.cos(innerAngle)},${cy + innerR * Math.sin(innerAngle)}`,
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      style={{ display: "block" }}
    >
      <polygon points={coords.join(" ")} fill={color} />
    </svg>
  );
};

const AIRPORT_TYPES = [
  {
    key: "large_airport",
    label: "Large Airports",
    icon: (c) => <StarSvg points={6} color={c} />,
  },
  {
    key: "medium_airport",
    label: "Medium Airports",
    icon: (c) => <StarSvg points={5} color={c} />,
  },
  {
    key: "small_airport",
    label: "Small Airports",
    icon: (c) => <StarSvg points={4} color={c} />,
  },
  {
    key: "heliport",
    label: "Heliports",
    icon: (c) => (
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        style={{ display: "block" }}
      >
        <rect x="1" y="1" width="12" height="12" fill={c} />
      </svg>
    ),
  },
  {
    key: "seaplane_base",
    label: "Seaplane Bases",
    icon: (c) => (
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        style={{ display: "block" }}
      >
        <polygon points="7,1 13,13 1,13" fill={c} />
      </svg>
    ),
  },
  {
    key: "balloonport",
    label: "Balloonports",
    icon: (c) => (
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        style={{ display: "block" }}
      >
        <circle cx="7" cy="7" r="6" fill={c} />
      </svg>
    ),
  },
];

const StatsPanel = React.forwardRef(function StatsPanel(props, ref) {
  const [hovered, setHovered] = useState(false);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const showIconLegend = useSelector((state) => state.ui.showIconLegend);
  const planesCount = useSelector((state) => state.planes.data.length);
  const airports = useSelector((state) => state.airports.data);

  const typeCounts = useMemo(() => {
    const counts = {};
    for (const a of airports) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [airports]);

  const rowStyle = { display: "flex", alignItems: "center", gap: "6px" };
  const iconColor = "rgb(242, 114, 39)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      ref={ref}
      style={{
        position: "absolute",
        left: "20px",
        bottom: "45px",
        zIndex: 1000,
        padding: "10px",
        borderRadius: "4px",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        background: "rgba(34, 40, 60, 0.35)",
        backdropFilter: "blur(10px)",
        boxShadow: darkMode
          ? `0 16px 36px ${alpha("#000", 0.34)}`
          : `0 14px 30px ${alpha("#0F172A", 0.1)}`,
        color: "#fff",
        fontSize: "1.125rem",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <div style={{ display: "flex", gap: "0px" }}>
        {/* Labels column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={rowStyle}>
            <FlightIcon
              style={{ fontSize: "1.125rem", color: "rgb(83, 185, 235)" }}
            />
            <strong>Flights</strong>
          </div>
          {AIRPORT_TYPES.map(({ key, label, icon }) => {
            const count = typeCounts[key];
            return (
              <div key={key} style={rowStyle}>
                {icon(iconColor)}
                <strong>{label}</strong>
              </div>
            );
          })}
        </div>
        {/* Numbers column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            alignItems: "flex-end",
            justifyContent: "flex-start",
            overflow: "hidden",
            maxWidth: hovered ? "60px" : "0px",
            opacity: hovered ? 1 : 0,
            paddingLeft: hovered ? "10px" : "0px",
            transition:
              "max-width 0.3s ease, opacity 0.3s ease, padding-left 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          <span>{planesCount}</span>
          {AIRPORT_TYPES.map(({ key }) => {
            const count = typeCounts[key];
            if (!count) return null;
            return <span key={key}>{count}</span>;
          })}
        </div>
      </div>
    </div>
  );
});
export default StatsPanel;
