// -- Map-related utility functions --

// Safe number formatting helper
export const formatNumber = (val, decimals = 0, suffix = '') => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${parseFloat(val).toFixed(decimals)}${suffix}`;
};

// Helper for coordinates
export const formatCoord = (val) => {
  if (val === null || val === undefined) return 'N/A';
  return formatNumber(val, 4, '°');
};

// Metric to Imperial
export const m2ft = (m) => (m !== null && m !== undefined ? m * 3.28084 : null);
export const ms2kts = (ms) => (ms !== null && ms !== undefined ? ms * 1.94384 : null);

// Imperial to Metric
export const ft2m = (ft) => (ft !== null && ft !== undefined ? ft / 3.28084 : null);
export const kts2ms = (kts) => (kts !== null && kts !== undefined ? kts / 1.94384 : null);

export const getAltDisplay = (alt, isImperial, useImperial) => {
  if (alt === null || alt === undefined) return 'N/A';
  let altValue = alt;
  if (isImperial && !useImperial) {
    altValue = ft2m(alt);
  }
  else if (!isImperial && useImperial) {
    altValue = m2ft(alt);
  }
  const suffix = useImperial ? ' ft' : ' m';
  return formatNumber(altValue, 0, suffix);
}

export const getSpeedDisplay = (speed, isImperial, useImperial) => {
  if (speed === null || speed === undefined) return 'N/A';
  let speedValue = speed;
  if (isImperial && !useImperial) {
    speedValue = kts2ms(speed);
  }
  else if (!isImperial && useImperial) {
    speedValue = ms2kts(speed);
  }
  const suffix = useImperial ? ' kts' : ' m/s';
  return formatNumber(speedValue, 0, suffix);
}

export const capitalizeWords = (str) => {
  if (!str) return 'N/A';
  return str.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
// Helper to convert [r,g,b] to hex string
export const rgbToHex = ([r, g, b]) => {
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
// Defines the exact breakpoints for the gradient colors
export const getStops = (useImperial) => {
  if (useImperial) {
    return [
      { val: 0, color: [242, 114, 39] },
      { val: 10000, color: [104, 202, 85] },
      { val: 20000, color: [83, 185, 235] },
      { val: 30000, color: [82, 86, 236] },
      { val: 40000, color: [194, 53, 221] },
      { val: 50000, color: [194, 53, 221] } 
    ];
  } else {
    // Metric equivalents
    return [
      { val: 0, color: [242, 114, 39] },
      { val: 3000, color: [104, 202, 85] },
      { val: 6000, color: [83, 185, 235] },
      { val: 9000, color: [82, 86, 236] },
      { val: 12000, color: [194, 53, 221] },
      { val: 15000, color: [194, 53, 221] } 
    ];
  }
};

// Interpolates the color based on the active unit's stops
export const getAltitudeColor = (alt, isImperial, useImperial) => {
  if (alt === null || alt === undefined) return [150, 150, 150];
  
  const stops = getStops(useImperial);
  
  let altValue = alt;
  if (isImperial && !useImperial) {
    altValue = ft2m(alt);
  }
  else if (!isImperial && useImperial) {
    altValue = m2ft(alt);
  }
  if (altValue <= stops[0].val) return stops[0].color;
  if (altValue >= stops[stops.length - 1].val) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    if (altValue >= stops[i].val && altValue <= stops[i+1].val) {
      const t = (altValue - stops[i].val) / (stops[i+1].val - stops[i].val);
      const c1 = stops[i].color;
      const c2 = stops[i+1].color;
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t)
      ];
    }
  }
  return [150, 150, 150];
};

const fillSvgString = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24"><path fill="#ffffff" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
export const PLANE_ATLAS = `data:image/svg+xml;base64,${btoa(fillSvgString)}`;

const outlineSvgString = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" shape-rendering="geometricPrecision"><path fill="none" stroke="#ffffff" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
export const PLANE_OUTLINE_ATLAS = `data:image/svg+xml;base64,${btoa(outlineSvgString)}`;
