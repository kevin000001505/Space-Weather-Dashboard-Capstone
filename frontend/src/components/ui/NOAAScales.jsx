import React, { useState } from "react";
import "./NOAAScales.css";
import { useSelector } from "react-redux";
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { IconButton } from "@mui/material";
// Helper to get color by scale
const getBoxColor = (scale, type) => {
  if (scale === null || scale === undefined || scale === "0" || scale === 0)
    return "noaa-box-green";
  if (type === "G" && scale === "2") return "noaa-box-yellow";
  if (type === "G" && scale === "3") return "noaa-box-orange";
  if (type === "G" && scale === "4") return "noaa-box-red";
  if (type === "G" && scale === "5") return "noaa-box-red";
  if (type === "R" && scale >= 3) return "noaa-box-red";
  if (type === "S" && scale >= 3) return "noaa-box-red";
  return "noaa-box-green";
};

const getPercentageColor = (percent) => {
  const p = Number(percent);
  if (isNaN(p)) return "noaa-box-green";
  if (p <= 10) return "noaa-box-green";
  if (p <= 25) return "noaa-box-yellow";
  if (p <= 50) return "noaa-box-orange";
  return "noaa-box-red";
};

const formatString = (str) => {
  if (!str) return str;
  if (typeof str === "string" && str.trim().toLowerCase() === "none")
    return "Normal";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const NOAAScales = () => {
  const noaaScales = useSelector((state) => state.sidebar.noaaScales);
  const darkMode = useSelector((state) => state.ui.darkMode);
  if (!noaaScales) return null;

  // Find keys for observed, latest
  const observed = noaaScales["-1"];
  const latest = noaaScales["0"];

  const [predictedIndex, setPredictedIndex] = useState(1);
  const predictedKeys = Object.keys(noaaScales)
    .map(Number)
    .filter((k) => k > 0)
    .sort((a, b) => a - b);
  const maxPredictedIdx = predictedKeys.length > 0 ? predictedKeys[predictedKeys.length - 1] : 1;
  const minPredictedIdx = predictedKeys.length > 0 ? predictedKeys[0] : 1;
  const predicted = noaaScales[predictedIndex]?.DateStamp ? noaaScales[predictedIndex] : noaaScales["1"];

  const handlePrev = () => {
    setPredictedIndex((prev) => (prev > minPredictedIdx ? prev - 1 : prev));
  };
  const handleNext = () => {
    setPredictedIndex((prev) => (prev < maxPredictedIdx ? prev + 1 : prev));
  };

  return (
    <div className="noaa-scales-root">
      <div className="noaa-scales-title">CURRENT SPACE WEATHER CONDITIONS</div>
      <div className="noaa-scales-section">
        <div className="noaa-scales-label">24-Hour Observed Maximums</div>
        <div className="noaa-scales-row">
          <div
            className={`noaa-simple-box ${getBoxColor(observed?.R?.Scale, "R")}`}
          >
            <div className="noaa-simple-box-label">R{observed?.R?.Scale}</div>
            <div className="noaa-simple-box-text">
              {formatString(observed?.S?.Text || "none")}
            </div>
          </div>
          <div
            className={`noaa-simple-box ${getBoxColor(observed?.S?.Scale, "S")}`}
          >
            <div className="noaa-simple-box-label">S{observed?.S?.Scale}</div>
            <div className="noaa-simple-box-text">
              {formatString(observed?.S?.Text || "none")}
            </div>
          </div>
          <div
            className={`noaa-simple-box ${getBoxColor(observed?.G?.Scale, "G")}`}
          >
            <div className="noaa-simple-box-label">G{observed?.G?.Scale}</div>
            <div className="noaa-simple-box-text">
              {formatString(observed?.G?.Text || "none")}
            </div>
          </div>
        </div>
      </div>
      <div className="noaa-scales-section">
        <div className="noaa-scales-label">Latest Observed</div>
        <div className="noaa-scales-row">
          <div
            className={`noaa-simple-box ${getBoxColor(latest?.R?.Scale, "R")}`}
          >
            <div className="noaa-simple-box-label">R{latest?.R?.Scale}</div>
            <div className="noaa-simple-box-text">
              {formatString(latest?.R?.Text || "none")}
            </div>
          </div>
          <div
            className={`noaa-simple-box ${getBoxColor(latest?.S?.Scale, "S")}`}
          >
            <div className="noaa-simple-box-label">S{latest?.S?.Scale}</div>
            <div className="noaa-simple-box-text">
              {formatString(latest?.S?.Text || "none")}
            </div>
          </div>
          <div
            className={`noaa-simple-box ${getBoxColor(latest?.G?.Scale, "G")}`}
          >
            <div className="noaa-simple-box-label">G{latest?.G?.Scale}</div>
            <div className="noaa-simple-box-text">
              {formatString(latest?.G?.Text || "none")}
            </div>
          </div>
        </div>
      </div>
      <div className="noaa-scales-section">
        <div className="noaa-scales-label">
          Predicted {predicted?.DateStamp} UTC
        </div>
        <div className={`noaa-scales-predicted ${darkMode ? "noaa-scales-dark" : ""}`} style={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handlePrev} disabled={predictedIndex <= minPredictedIdx} aria-label="Previous prediction">
            <ArrowLeftIcon fontSize="large" />
          </IconButton>
          <div>
            <div className="noaa-scales-row">
              <div className={`noaa-simple-box ${getPercentageColor(predicted?.R?.MinorProb)}`}>
                <div className="noaa-simple-box-label">R1-R2</div>
                <div className="noaa-simple-box-text">
                  {formatString(predicted?.R?.MinorProb || "none")}%
                </div>
              </div>
              <div className={`noaa-simple-box ${getPercentageColor(predicted?.R?.MajorProb)}`}>
                <div className="noaa-simple-box-label">R3-R5</div>
                <div className="noaa-simple-box-text">
                  {formatString(predicted?.R?.MajorProb || "none")}%
                </div>
              </div>
            </div>
            <div className="noaa-scales-row">
              <div className={`noaa-simple-box ${getBoxColor(predicted?.S?.Scale, "S")}`}>
                <div className="noaa-simple-box-label">S1+</div>
                <div className="noaa-simple-box-text">
                  {formatString(predicted?.S?.Prob || "none")}%
                </div>
              </div>
              <div className={`noaa-simple-box ${getBoxColor(predicted?.G?.Scale, "G")}`}>
                <div className="noaa-simple-box-label">G{predicted?.G?.Scale}</div>
                <div className="noaa-simple-box-text">
                  {formatString(predicted?.G?.Text || "none")}
                </div>
              </div>
            </div>
          </div>
          <IconButton onClick={handleNext} disabled={predictedIndex >= maxPredictedIdx} aria-label="Next prediction">
            <ArrowRightIcon fontSize="large" />
          </IconButton>
        </div>
      </div>
    </div>
  );
};
