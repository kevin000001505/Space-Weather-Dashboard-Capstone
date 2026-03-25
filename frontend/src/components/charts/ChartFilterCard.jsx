import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";

/**
 * ChartFilterCard - A reusable card for chart settings sliders.
 * @param {string} label - The label for the slider.
 * @param {number} value - The current value of the slider.
 * @param {function} onChange - The change handler for the slider.
 * @param {object} sliderProps - Additional props for the Slider.
 * @param {boolean} darkMode - Whether dark mode is enabled.
 * @param {string} [ariaLabel] - Optional aria-label for accessibility.
 */
const ChartFilterCard = ({
  label,
  value,
  onChange,
  sliderProps = {},
  darkMode = false,
  ariaLabel = undefined,
}) => (
  <Card
    sx={{
      backgroundColor: darkMode ? "#23272e" : "#fff",
      color: darkMode ? "#f7f7fa" : "#181a1b",
      boxShadow: darkMode ? "0 1px 4px #111" : "0 1px 4px #ccc",
      borderRadius: 2,
      mb: 1,
      p: 0,
      width: "100%",
      alignSelf: "flex-start",
    }}
  >
    <CardContent
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 1.5,
        "&:last-child": { pb: 1.5 },
        width: "100%",
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          color: darkMode ? "#b0b0b0" : "#555",
          width: "30%",
          flexShrink: 0,
          fontWeight: 500,
          fontSize: 12,
          mr: 2,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <Slider
        value={value}
        onChange={onChange}
        sx={{
          width: "100%",
          color: darkMode ? "#90caf9" : "#1976d2",
          ml: 2,
        }}
        aria-label={ariaLabel || label}
        {...sliderProps}
      />
    </CardContent>
  </Card>
);

export default ChartFilterCard;
