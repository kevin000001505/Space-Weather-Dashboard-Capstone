import React from "react";
import { Rnd } from "react-rnd";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import ChartFilterCard from "./ChartFilterCard";
import { useSelector, useDispatch } from "react-redux";
import {
  setBackgroundBandsOpacity,
  setLabelBoxSize,
  setAxisLabelSize,
  setBorderWidth,
} from "../../store/slices/chartsSlice";

const SETTINGS_WIDTH = 800;
const SETTINGS_HEIGHT = 600;

const ChartSettingsPanel = ({ open, onClose }) => {
  const darkMode = useSelector((state) => state.ui.darkMode);
  const dispatch = useDispatch();
  const backgroundBandsOpacity = useSelector((state) => state.charts.backgroundBandsOpacity);
  const labelBoxSize = useSelector((state) => state.charts.labelBoxSize);
  const axisLabelSize = useSelector((state) => state.charts.axisLabelSize);
  const borderWidth = useSelector((state) => state.charts.borderWidth);

  if (!open) return null;
  // Centered modal position helper
  const getCenteredPosition = () => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const width = SETTINGS_WIDTH;
    const height = SETTINGS_HEIGHT;
    const x = Math.max((window.innerWidth - width) / 2, 0);
    const y = Math.max((window.innerHeight - height) / 2, 0) + window.scrollY;
    return { x, y };
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 3000,
        pointerEvents: "none",
      }}
    >
      <Rnd
        style={{ pointerEvents: "auto" }}
        default={{
          ...getCenteredPosition(),
          width: SETTINGS_WIDTH,
          height: SETTINGS_HEIGHT,
        }}
        minWidth={400}
        minHeight={300}
        bounds="parent"
        dragHandleClassName="chart-settings-modal-title"
        enableResizing={{
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
      >
        <Paper
          elevation={4}
          style={{
            padding: 12,
            borderRadius: 8,
            width: "100%",
            height: "100%",
            overflowY: "auto",
            zIndex: 3000,
            fontSize: "0.8rem",
            boxSizing: "border-box",
            backgroundColor: darkMode ? "#181a1b" : "#f7f7fa",
            color: darkMode ? "#f7f7fa" : "#181a1b",
          }}
        >
          <IconButton
            size="small"
            aria-label="close"
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 4,
              right: 6,
              zIndex: 4000,
              color: "#fff",
              backgroundColor: "#d32f2f",
              border: "1px solid #d32f2f",
              "&:hover": {
                backgroundColor: "#b71c1c",
              },
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Typography
            className="chart-settings-modal-title"
            variant="h6"
            sx={{
              cursor: "move",
              margin: 0,
              marginBottom: 1,
              borderBottom: "1px solid #ccc",
              paddingBottom: 1,
              fontSize: "1rem",
            }}
          >
            Chart Settings
          </Typography>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <ChartFilterCard
              label="Background Bands Opacity"
              value={backgroundBandsOpacity}
              onChange={(_, value) => dispatch(setBackgroundBandsOpacity(value))}
              sliderProps={{ min: 0, max: 1, step: 0.01 }}
              darkMode={darkMode}
              ariaLabel="Background Bands Opacity"
            />
            <ChartFilterCard
              label="Label Box Size"
              value={labelBoxSize}
              onChange={(_, value) => dispatch(setLabelBoxSize(value))}
              sliderProps={{ min: 0.7, max: 1.5, step: 0.01 }}
              darkMode={darkMode}
              ariaLabel="Label Box Size"
            />
            <ChartFilterCard
              label="Axis Label Size"
              value={axisLabelSize}
              onChange={(_, value) => dispatch(setAxisLabelSize(value))}
              sliderProps={{ min: 10, max: 32, step: 1 }}
              darkMode={darkMode}
              ariaLabel="Axis Label Size"
            />
            <ChartFilterCard
              label="Line Thickness"
              value={borderWidth}
              onChange={(_, value) => dispatch(setBorderWidth(value))}
              sliderProps={{ min: 1, max: 6, step: 1 }}
              darkMode={darkMode}
              ariaLabel="Line Thickness"
            />
          </div>
        </Paper>
      </Rnd>
    </div>
  );
};

export default ChartSettingsPanel;
