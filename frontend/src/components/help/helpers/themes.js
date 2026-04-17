import { alpha } from "@mui/material/styles";

export const paletteDarkMode = {
  mode: "dark",
  primary: { main: "#a78bfa" },
  background: {
    default: "#0f1117",
    paper: "#151922",
  },
  text: {
    primary: "#a78bfa",
    secondary: alpha("#fff", 0.8),
    disabled: alpha("#fff", 0.4),
  },
  divider: alpha("#a78bfa", 0.25),
  action: {
    hover: alpha("#a78bfa", 0.08),
    selected: alpha("#a78bfa", 0.12),
  },
};

export const paletteLightMode = {
  mode: "light",
  primary: { main: "#1976d2" },
  background: {
    default: "#ffffff",
    paper: "#fbfbfd",
  },
  text: {
    primary: "#1b1f23",
    secondary: alpha("#1b1f23", 0.7),
    disabled: alpha("#1b1f23", 0.38),
  },
  divider: "rgba(0, 0, 0, 0.08)",
  action: {
    hover: "rgba(25, 118, 210, 0.05)",
    selected: "rgba(25, 118, 210, 0.08)",
  },
};

export const typographyTheme = {
  fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  h1: { fontSize: "2rem", fontWeight: 700, letterSpacing: "+0.01em" },
  h2: {
    fontSize: "1.75rem",
    fontWeight: 700,
    letterSpacing: "-0.00em",
  },
  h3: { fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" },
  body1: { fontSize: "1.25rem", lineHeight: 1.8 },
  body2: { fontSize: "1.5rem", lineHeight: 1.7 },
  overline: { fontSize: "1.25rem", lineHeight: 1.7 },
};
