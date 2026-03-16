// persistentLabelBoxPlugin.js
// Chart.js plugin for persistent label box, extracted for reuse

// Helper functions must be passed in as arguments or imported in the chart file
// Optionally accept labelDates (parallel ISO array) for robust date/time display
export default function persistentLabelBoxPlugin({
  mousePosRef,
  getLabelLines,
}) {
  return {
    id: "persistentLabelBox",
    afterDraw: (chart) => {
      const { ctx, chartArea, scales, data } = chart;
      if (!chartArea) return;
      const { x: mouseX, y: mouseY, inside } = mousePosRef.current;
      if (!inside || mouseX == null || mouseY == null) return;
      if (
        mouseX < chartArea.left ||
        mouseX > chartArea.right ||
        mouseY < chartArea.top ||
        mouseY > chartArea.bottom
      )
        return;
      // Find nearest x index
      const xScale = scales.x;
      let minDist = Infinity,
        nearestIndex = 0;
      xScale.getPixelForValue =
        xScale.getPixelForValue || xScale.getPixelForTick;
      data.labels.forEach((label, i) => {
        const px = xScale.getPixelForValue
          ? xScale.getPixelForValue(i)
          : xScale.getPixelForTick(i);
        const dist = Math.abs(mouseX - px);
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = i;
        }
      });
      const x = xScale.getPixelForValue
        ? xScale.getPixelForValue(nearestIndex)
        : xScale.getPixelForTick(nearestIndex);
      const y = mouseY;
      // Get label lines from chart-specific callback
      const lines = getLabelLines({ chart, nearestIndex });
      // Box dimensions
      ctx.save();
      const fontTime = "bold 14px sans-serif";
      const fontDataset = "14px sans-serif";
      const paddingX = 14;
      const paddingY = 12;
      const lineHeight = 18;
      const colorBoxSize = 12;
      let maxWidth = 0;
      lines.forEach((line) => {
        if (line.type === "time") {
          ctx.font = fontTime;
          const w = ctx.measureText(line.text).width;
          if (w > maxWidth) maxWidth = w;
        } else {
          ctx.font = fontDataset;
          let labelText = line.label + ": ";
          let valueText = line.value;
          if (line.units) valueText += " " + line.units;
          let valueWidth = ctx.measureText(labelText + valueText).width;
          let extraWidth = 0;
          if (line.extra) {
            ctx.font = "bold 10px sans-serif";
            extraWidth = ctx.measureText(` (${line.extra})`).width + 8;
            ctx.font = fontDataset;
          }
          const w = colorBoxSize + 6 + valueWidth + extraWidth;
          if (w > maxWidth) maxWidth = w;
        }
      });
      ctx.font = fontTime;
      const boxWidth = maxWidth + 2 * paddingX;
      const boxHeight = lines.length * lineHeight + 2 * paddingY - 6;
      let boxX = x + 12;
      let boxY = y - boxHeight / 2;
      if (boxX + boxWidth > chartArea.right) boxX = x - boxWidth - 12;
      if (boxY < chartArea.top) boxY = chartArea.top + 4;
      if (boxY + boxHeight > chartArea.bottom)
        boxY = chartArea.bottom - boxHeight - 4;
      // Draw vertical line at nearest x
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "#fff";
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
      // Draw box background
      ctx.beginPath();
      ctx.globalAlpha = 1;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      // Draw text
      let textY = boxY + paddingY + 1;
      lines.forEach((line, i) => {
        if (line.type === "time") {
          ctx.font = fontTime;
          ctx.fillStyle = "#fff";
          ctx.fillText(line.text, boxX + paddingX, textY);
        } else {
          ctx.font = fontDataset;
          // Draw color box
          ctx.save();
          ctx.beginPath();
          ctx.fillStyle = line.color;
          ctx.strokeStyle = "#fff";
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = 1;
          ctx.roundRect(
            boxX + paddingX,
            textY - colorBoxSize + 4,
            colorBoxSize,
            colorBoxSize,
            2,
          );
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.stroke();
          ctx.restore();
          // Draw label, value, units, and extra info
          ctx.fillStyle = "#fff";
          let labelText = line.label + ": ";
          ctx.fillText(
            labelText,
            boxX + paddingX + colorBoxSize + 6,
            textY + 1,
          );
          let valueText = line.value;
          if (line.units) valueText += " " + line.units;
          ctx.fillStyle = "#b3e5fc";
          ctx.fillText(
            valueText,
            boxX +
              paddingX +
              colorBoxSize +
              6 +
              ctx.measureText(labelText).width,
            textY + 1,
          );
          if (line.extra) {
            const extraX =
              boxX +
              paddingX +
              colorBoxSize +
              6 +
              ctx.measureText(labelText + valueText).width +
              8;
            ctx.font = "bold 14px sans-serif";
            ctx.fillStyle = "#e0e0e0";
            ctx.fillText(`(${line.extra})`, extraX, textY + 1);
            ctx.font = fontDataset;
          }
        }
        textY += lineHeight;
      });
      ctx.restore();
    },
  };
}
