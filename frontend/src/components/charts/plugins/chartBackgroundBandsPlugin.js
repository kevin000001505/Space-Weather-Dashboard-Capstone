// chartBackgroundBandsPlugin.js
// Generic Chart.js plugin for drawing background bands for G-level, S-level, and R-level charts

const chartBackgroundBandsPlugin = (bands, options = {}) => {
  const drawLabels = (chart) => {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.y) return;
    ctx.save();
    ctx.font = options.font || "bold 16px sans-serif";
    ctx.textAlign = options.textAlign || "right";
    ctx.textBaseline = "middle";
    bands.forEach(({ min, max, label, color }) => {
      const y =
        (scales.y.getPixelForValue(max) + scales.y.getPixelForValue(min)) / 2;
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = options.strokeStyle || "#23272e";
      ctx.lineWidth = 3;
      const x =
        options.labelPosition === "right"
          ? chartArea.right + (options.labelOffset || 8)
          : chartArea.left + (options.labelOffset || 20);
      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    });
    ctx.restore();
  };
  const plugin = {
    id: options.id || "backgroundBands",
    beforeDatasetsDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.y) return;
      // Draw background bands
      bands.forEach(({ min, max, color }) => {
        const y1 = scales.y.getPixelForValue(max);
        const y2 = scales.y.getPixelForValue(min);
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = options.alpha ?? 0.4;
        ctx.fillRect(
          chartArea.left,
          y1,
          chartArea.right - chartArea.left,
          y2 - y1,
        );
        ctx.restore();
      });
      // Draw labels here only if not afterDrawLabels
      if (!options.afterDrawLabels) {
        drawLabels(chart);
      }
    },
  };
  if (options.afterDrawLabels) {
    plugin.afterDraw = (chart) => {
      drawLabels(chart);
    };
  }
  return plugin;
};

export default chartBackgroundBandsPlugin;
