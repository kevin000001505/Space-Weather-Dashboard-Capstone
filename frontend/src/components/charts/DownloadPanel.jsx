import React from "react";
import jsPDF from "jspdf";
import { Popover, Typography, Box, Button, Stack } from "@mui/material";
import { useSelector } from "react-redux";
import {
  downloadFile,
  printContent,
  toCSV,
  toJSON,
  toHTML,
  toXML,
  getChartName,
  formatDateString
} from "./downloadHelpers";
import { createContext, useContext } from "react";

function getFilteredData(tab, kpIndex, xrayFlux, protonFlux, customdt) {
  // Filter data by date range
  const { start, end } = customdt || {};
  const filterByDate = (arr) => {
    if (!start || !end) return arr;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return arr.filter(item => {
      const t = new Date(item.time_tag || item.timestamp || item.date || item.time);
      return t >= startDate && t <= endDate;
    });
  };
  if (tab === 0) return filterByDate(kpIndex);
  if (tab === 1) return filterByDate(xrayFlux);
  if (tab === 2) return filterByDate(protonFlux);
  return [];
}

// Add chart refs context
export const ChartRefsContext = createContext({ kp: null, xray: null, proton: null });

export default function DownloadPanel({ open, anchorEl, onClose, darkMode }) {
  // Arrow styles
  const arrowColor = darkMode ? "#23272e" : "#fff";
  const borderColor = darkMode ? "#555" : "#ccc";

  // Get Redux state for chart data and settings
  const tab = useSelector((state) => state.charts.activeTab);
  const kpIndex = useSelector((state) => state.charts.kpIndex);
  const xrayFlux = useSelector((state) => state.charts.xrayFlux);
  const protonFlux = useSelector((state) => state.charts.protonFlux);
  const customdt = useSelector((state) => state.charts.customdt);
  const selectedTimezone = useSelector((state) => state.charts.selectedTimezone);

  // Get filtered data for current chart and range
  const filteredData = getFilteredData(tab, kpIndex, xrayFlux, protonFlux, customdt);


  // Use ChartRefsContext for robust chart ref access
  const chartRefs = useContext(ChartRefsContext);
  function getChartCanvas() {
    let ref = null;
    if (tab === 0) ref = chartRefs.kp;
    if (tab === 1) ref = chartRefs.xray;
    if (tab === 2) ref = chartRefs.proton;
    // Chart.js v4: ref.current is the chart instance, chart.canvas is the canvas
    if (ref && ref.current && ref.current.canvas) return ref.current.canvas;
    return null;
  }

  function handleDownload(type) {
    let content = "";
    let mime = "text/plain";
    const chartName = getChartName(tab);
    const startStr = formatDateString(customdt?.start);
    const endStr = formatDateString(customdt?.end);
    let filename = `${startStr}-${endStr}-${chartName}`;
    if (type === "CSV") {
      content = toCSV(filteredData);
      mime = "text/csv";
      downloadFile(filename + ".csv", content, mime);
    } else if (type === "JSON") {
      content = toJSON(filteredData);
      mime = "application/json";
      downloadFile(filename + ".json", content, mime);
    } else if (type === "HTML") {
      content = toHTML(filteredData);
      mime = "text/html";
      downloadFile(filename + ".html", content, mime);
    } else if (type === "XML") {
      content = toXML(filteredData);
      mime = "application/xml";
      downloadFile(filename + ".xml", content, mime);
    } else if (type === "PNG" || type === "JPG") {
      const canvas = getChartCanvas();
      if (canvas) {
        // Create a new canvas with the correct background color
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext("2d");
        ctx.fillStyle = darkMode ? "#23272e" : "#fff";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        const ext = type === "PNG" ? "png" : "jpg";
        const mimeType = type === "PNG" ? "image/png" : "image/jpeg";
        tempCanvas.toBlob(blob => {
          downloadFile(`${filename}.${ext}`, blob, mimeType);
        }, mimeType);
      } else {
        alert("Chart image not found.");
      }
    } else if (type === "PDF") {
      const canvas = getChartCanvas();
      if (canvas) {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        // Fill background if dark mode
        if (darkMode) {
          pdf.setFillColor(35, 39, 46); // #23272e
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        }
        // Maintain aspect ratio
        let imgWidth = canvas.width;
        let imgHeight = canvas.height;
        let ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        let pdfWidth = imgWidth * ratio;
        let pdfHeight = imgHeight * ratio;
        let x = (pageWidth - pdfWidth) / 2;
        let y = (pageHeight - pdfHeight) / 2;
        pdf.addImage(imgData, "PNG", x, y, pdfWidth, pdfHeight);
        pdf.save(`${filename}.pdf`);
      } else {
        alert("Chart image not found.");
      }
    } else if (type === "PRINT") {
      const canvas = getChartCanvas();
      if (canvas) {
        let imgData;
        if (darkMode) {
          // Create a new canvas with black background and draw the chart on top
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const ctx = tempCanvas.getContext("2d");
          ctx.fillStyle = "#23272e";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.drawImage(canvas, 0, 0);
          imgData = tempCanvas.toDataURL("image/png");
        } else {
          imgData = canvas.toDataURL("image/png");
        }
        const printWindow = window.open("", "", "width=900,height=700");
        printWindow.document.write(`
          <html><head><title>Print Chart</title></head>
          <body style='margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background-color:${darkMode ? '#23272e' : '#fff'};'>
            <img id='chart-img' src='${imgData}' style='max-width:100%;max-height:100%;'/>
          </body></html>
        `);
        printWindow.document.close();
        printWindow.onload = function() {
          const img = printWindow.document.getElementById('chart-img');
          if (img) {
            img.onload = function() {
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            };
            if (img.complete) {
              img.onload();
            }
          } else {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
          }
        };
      } else {
        alert("Chart image not found.");
      }
    }
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: {
            width: "auto",
            minWidth: 0,
            maxWidth: 340,
            p: 2,
            mt: 1.5,
            backgroundColor: arrowColor,
            color: darkMode ? "#e0e0e0" : "#181a1b",
            boxShadow: "var(--ui-shadow)",
            border: `1px solid ${borderColor}`,
            borderRadius: 2,
            position: "relative",
          },
        },
      }}
    >
      <Typography variant="h6" sx={{ mb: 1, pl: 0.5 }}>
        Download As
      </Typography>
      <Box direction="row" spacing={2} sx={{ mb: 1, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#fff",
            backgroundColor: "#43a047",
            borderColor: "#388e3c",
            "&:hover": { backgroundColor: "#388e3c", borderColor: "#2e7031" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("CSV")}
        >
          CSV
        </Button>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#333",
            backgroundColor: "#ffeb3b",
            borderColor: "#fbc02d",
            "&:hover": { backgroundColor: "#fbc02d", borderColor: "#f9a825" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("JSON")}
        >
          JSON
        </Button>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#fff",
            backgroundColor: "#cc7b02",
            borderColor: "#cc7b02",
            "&:hover": { backgroundColor: "#af7012", borderColor: "#a93c01" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("HTML")}
        >
          HTML
        </Button>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#fff",
            backgroundColor: "#1976d2",
            borderColor: "#1565c0",
            "&:hover": { backgroundColor: "#1565c0", borderColor: "#0d47a1" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("XML")}
        >
          XML
        </Button>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#fff",
            backgroundColor: "#009688",
            borderColor: "#00695c",
            "&:hover": { backgroundColor: "#00695c", borderColor: "#004d40" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("PNG")}
        >
          PNG
        </Button>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#fff",
            backgroundColor: "#8e24aa",
            borderColor: "#6d1b7b",
            "&:hover": { backgroundColor: "#6d1b7b", borderColor: "#4a148c" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("JPG")}
        >
          JPG
        </Button>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#fff",
            backgroundColor: "#e15a58",
            borderColor: "#e15a58",
            "&:hover": { backgroundColor: "#b02927", borderColor: "#b74543" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("PRINT")}
        >
          PRINT
        </Button>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#fff",
            backgroundColor: "#ff2925",
            borderColor: "#b11e1c",
            "&:hover": { backgroundColor: "#ca0c09", borderColor: "#990f0d" },
            margin: 0.5,
          }}
          onClick={() => handleDownload("PDF")}
        >
          PDF
        </Button>
      </Box>
    </Popover>
  );
}
