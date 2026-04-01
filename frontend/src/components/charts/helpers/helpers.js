// Filters labels by interval for a given range
export function filterLabelsByInterval(labels, range) {
  if (!labels.length) return labels;
  const interval = getIntervalMs(range);
  const first = new Date(labels[0]).getTime();
  return labels.filter((iso) => {
    const t = new Date(iso).getTime();
    return (t - first) % interval === 0;
  });
}
// Returns interval in ms for a given range string
export function getIntervalMs(range) {
  if (range === "1week") return 15 * 60 * 1000; // 15 min
  if (range === "3days") return 10 * 60 * 1000; // 10 min
  if (range === "24hours") return 5 * 60 * 1000; // 5 min
  if (range === "6hours") return 2 * 60 * 1000; // 2 min
  return 30 * 60 * 1000; // default 15 min
}
// Format a number as scientific notation like '5 × 10⁻⁷'
export function formatSciNotation(val) {
  if (typeof val !== "number" || isNaN(val)) return val;
  if (val === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(val)));
  const coeff = val / Math.pow(10, exp);
  // Use 2 significant digits for coeff
  const coeffStr =
    Math.abs(coeff) >= 10
      ? coeff.toFixed(0)
      : coeff.toFixed(2).replace(/\.00$/, "");
  // Use unicode superscript for exponent
  const expStr =
    exp === 0
      ? ""
      : "× 10" +
        (exp < 0
          ? "⁻" +
            String(Math.abs(exp))
              .split("")
              .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d])
              .join("")
          : "⁺" +
            String(exp)
              .split("")
              .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d])
              .join(""));
  return `${coeffStr} ${expStr}`.trim();
}

// Get the X-ray flare class for a value
export function getFlareClass(value) {
  if (typeof value !== "number" || isNaN(value)) return "";
  if (value >= 1e-4) return "X";
  if (value >= 1e-5) return "M";
  if (value >= 1e-6) return "C";
  if (value >= 1e-7) return "B";
  if (value >= 1e-8) return "A";
  return "A";
}
// helpers.js for chart components
// Shared utility functions for date/time formatting, label generation, and date range calculation

/**
 * Format a date label for chart x-axis, showing date+time when date changes, otherwise just time.
 * @param {Date} date - JS Date object
 * @param {string} selectedTimezone - Timezone string (e.g., 'local', 'UTC', 'America/New_York')
 * @param {string|null} prevDateStr - Previous date string for comparison
 * @returns {{label: string, dateStr: string}} - Formatted label and current dateStr
 */
export function formatChartLabel(date, selectedTimezone, prevDateStr) {
  let month, dayNum, hour, dateStr;
  if (selectedTimezone === "local") {
    month = date.toLocaleString("en-US", { month: "short" });
    dayNum = date.getDate();
    hour = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    dateStr = `${month} ${dayNum}`;
  } else {
    month = date.toLocaleString("en-US", {
      month: "short",
      timeZone: selectedTimezone,
    });
    dayNum = date.toLocaleString("en-US", {
      day: "numeric",
      timeZone: selectedTimezone,
    });
    hour = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: selectedTimezone,
    });
    dateStr = `${month} ${dayNum}`;
  }
  let label;
  if (prevDateStr !== dateStr) {
    label = `${dateStr} ${hour}`;
  } else {
    label = hour;
  }
  return { label, dateStr };
}

/**
 * Calculate start and end ISO strings for a given preset range.
 * @param {string} range - One of '1week', '3days', '24hours', '6hours'
 * @returns {{start: string, end: string}}
 */
export function getPresetDateRange(range) {
  const now = new Date();
  let start = "",
    end = "";
  if (range === "1week") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    end = now.toISOString();
  } else if (range === "3days") {
    start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    end = now.toISOString();
  } else if (range === "24hours") {
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    end = now.toISOString();
  } else if (range === "6hours") {
    start = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
    end = now.toISOString();
  }
  return { start, end };
}

/**
 * Sort an array of objects by a time_tag property (ascending).
 * @param {Array} arr - Array of objects with time_tag property
 * @returns {Array}
 */
export function sortByTimeTag(arr) {
  return Array.isArray(arr)
    ? [...arr].sort((a, b) => new Date(a.time_tag) - new Date(b.time_tag))
    : [];
}

/**
 * Get a list of unique time_tag values from an array (sorted ascending).
 * @param {Array} arr - Array of objects with time_tag property
 * @returns {Array<string>}
 */
export function getUniqueTimeTags(arr) {
  return Array.from(new Set(arr.map((item) => item.time_tag))).sort(
    (a, b) => new Date(a) - new Date(b),
  );
}
