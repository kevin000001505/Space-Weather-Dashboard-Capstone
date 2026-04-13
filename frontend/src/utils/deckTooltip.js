import {
  capitalizeWords,
  formatCoord,
  getAltDisplay,
  getSpeedDisplay,
} from "./mapUtils";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const tooltipChrome = {
  background:
    "linear-gradient(180deg, rgba(16, 20, 28, 0.98) 0%, rgba(11, 14, 20, 0.96) 100%)",
  color: "var(--ui-text)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  boxShadow:
    "0 22px 55px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(14px) saturate(1.25)",
  borderRadius: "18px",
  padding: "0",
  minWidth: "280px",
  maxWidth: "400px",
  overflow: "hidden",
};

const badgeStyles = {
  flight:
    "display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; background: rgba(255, 77, 141, 0.16); color: #ff8ab6; border: 1px solid rgba(255, 77, 141, 0.38); font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform: uppercase; white-space: nowrap;",
  airport:
    "display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; background: rgba(47, 128, 237, 0.16); color: #8fc0ff; border: 1px solid rgba(47, 128, 237, 0.38); font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform: uppercase; white-space: nowrap;",
  transmission:
    "display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; background: rgba(31, 107, 78, 0.22); color: #9fe5c4; border: 1px solid rgba(31, 107, 78, 0.5); font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform: uppercase; white-space: nowrap;",
};

const headerStyle =
  "display:flex; align-items:center; justify-content:space-between; gap:16px; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));";

const titleStyle =
  "margin:0; font-size:1.25rem; line-height:1.25; letter-spacing:0.02em; font-weight:700; color:#fff; text-align:left; overflow-wrap:anywhere;";

const sectionStyle = "padding: 12px;";

const bodyStyle =
  "font-size:1rem; line-height:1.6; color:rgba(255, 255, 255, 0.9);";

const rowStyle =
  "display:grid; grid-template-columns:minmax(60px, 0.5fr) minmax(0, 1.5fr); column-gap:8px; align-items:start; margin:0 0 8px 0;";

const labelStyle =
  "color:rgba(255, 255, 255, 0.68); font-weight:500; letter-spacing:0.03em; text-align:left;";

const valueStyle = "text-align:left; overflow-wrap:anywhere;font-weight:600;letter-spacing:0.03em;";

const renderRows = (rows) =>
  rows
    .map(
      ([label, value]) => `
        <div style="${rowStyle}">
          <div style="${labelStyle}">${escapeHtml(label)}</div>
          <div style="${valueStyle}">${value}</div>
        </div>
      `,
    )
    .join("");

const buildTooltipCard = ({ badge, badgeTone = "flight", title, rows }) => ({
  estimatedWidth: badgeTone === "transmission" ? 380 : 280,
  estimatedHeight: 96 + rows.length * 28,
  html: `
    <div style="${headerStyle}">
      <h3 style="${titleStyle}">${escapeHtml(title)}</h3>
      <div style="${badgeStyles[badgeTone] || badgeStyles.flight}">${escapeHtml(badge)}</div>
    </div>
    <div style="${sectionStyle}">
      <div style="${bodyStyle}">${renderRows(rows)}</div>
    </div>
  `,
  className: "deck-tooltip plane-tracker-tooltip",
  style: {
    ...tooltipChrome,
  },
});

export const buildDeckTooltip = ({ info, useImperial }) => {
  if (!info?.object || !info?.layer?.id) return null;

  if (info.layer.id === "planes-base") {
    const plane = info.object;
    const title =
      plane.callsign || plane.icao24?.toUpperCase() || "Unknown flight";

    return buildTooltipCard({
      badge: "Flight",
      badgeTone: "flight",
      title,
      rows: [
        ["ICAO24", escapeHtml(plane.icao24?.toUpperCase() || "N/A")],
        [
          "Altitude",
          escapeHtml(getAltDisplay(plane.geo_altitude, false, useImperial)),
        ],
        [
          "Speed",
          escapeHtml(getSpeedDisplay(plane.velocity, false, useImperial)),
        ],
        ["Heading", escapeHtml(formatCoord(plane.heading))],
        [
          "Position",
          `${escapeHtml(formatCoord(plane.lat))}, ${escapeHtml(formatCoord(plane.lon))}`,
        ],
      ],
    });
  }

  if (info.layer.id === "airports-base") {
    const airport = info.object;

    return buildTooltipCard({
      badge: "Airport",
      badgeTone: "airport",
      title: airport.name,
      rows: [
        ["Code", escapeHtml(airport.iata_code || airport.gps_code || "N/A")],
        ["Type", escapeHtml(capitalizeWords(airport.type))],
        [
          "Location",
          `${escapeHtml(airport.municipality || "N/A")}, ${escapeHtml(airport.country)}`,
        ],
        [
          "Elevation",
          escapeHtml(getAltDisplay(airport.elevation_ft, true, useImperial)),
        ],
        [
          "Position",
          `${escapeHtml(formatCoord(airport.lat))}, ${escapeHtml(formatCoord(airport.lon))}°`,
        ],
      ],
    });
  }

  if (info.layer.id === "electric-transmission-lines") {
    const line = info.object;

    return buildTooltipCard({
      badge: "Transmission Line",
      badgeTone: "transmission",
      title: line.OWNER ?? line.SUB_1 ?? line.SUB_2,
      rows: [
        ["Voltage Level", `${escapeHtml(line.VOLTAGE)} kV`],
        ["Type", escapeHtml(line.TYPE)],
        ["Status", escapeHtml(line.STATUS)],
        [
          "Source",
          escapeHtml(
            line.SOURCE && line.SOURCE.length > 30
              ? `${line.SOURCE.slice(0, 30)}...`
              : line.SOURCE,
          ),
        ],
        ["Voltage Source", line.INFERRED === "Y" ? "Estimated" : "Reported"],
        ["From Substation", escapeHtml(line.SUB_1)],
        ["To Substation", escapeHtml(line.SUB_2)],
        [
          "Length",
          escapeHtml(
            useImperial
              ? `${(line.SHAPE__Len * 0.000621371).toFixed(2)} mi`
              : `${(line.SHAPE__Len / 1000).toFixed(2)} km`,
          ),
        ],
      ],
    });
  }

  return null;
};
