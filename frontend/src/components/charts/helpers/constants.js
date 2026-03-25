// Dynamically generate all IANA timezones for dropdowns, with Local/UTC at the top
export function getAllTimezones() {
  function getGmtOffset(tzValue) {
    if (tzValue === "local") return "";
    if (tzValue === "UTC") return "GMT+00:00";
    try {
      const now = new Date();
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tzValue,
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
      const parts = dtf.formatToParts(now);
      const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      if (match) {
        const sign = match[1];
        const hour = match[2].padStart(2, '0');
        const min = match[3] ? match[3] : '00';
        return `GMT${sign}${hour}:${min}`;
      }
      if (tzName === 'UTC') return 'GMT+00:00';
      return '';
    } catch {
      return '';
    }
  }

  const topZones = [
    { label: "Local Time", value: "local", gmtOffset: "" },
    { label: "UTC (GMT+0)", value: "UTC", gmtOffset: "GMT+00" },
  ];
  let tzList = [];
  if (typeof Intl.supportedValuesOf === "function") {
    tzList = Intl.supportedValuesOf("timeZone").map((tz) => ({
      label: tz,
      value: tz,
      gmtOffset: getGmtOffset(tz),
    }));
  } else {
    tzList = [
      { label: "America/New_York", value: "America/New_York", gmtOffset: getGmtOffset("America/New_York") },
      { label: "Europe/London", value: "Europe/London", gmtOffset: getGmtOffset("Europe/London") },
    ];
  }
  return [...topZones, ...tzList];
}
// Kp Index G-levels
export const G_LEVELS = [
  { min: 0, max: 4.99, color: "#40cc47", label: "G0" },
  { min: 5, max: 5.99, color: "#81f200", label: "G1" },
  { min: 6, max: 6.99, color: "#fbfb00", label: "G2" },
  { min: 7, max: 7.99, color: "#ffaf02", label: "G3" },
  { min: 8, max: 8.99, color: "#ff6803", label: "G4" },
  { min: 9, max: 10, color: "#ff0000", label: "G5" },
];

export const KP_COLORS = [
  "#40cc47", // Kp < 5
  "#81f200", // Kp = 5 (G1)
  "#fbfb00", // Kp = 6 (G2)
  "#ffaf02", // Kp = 7 (G3)
  "#ff6803", // Kp = 8, 9 (G4)
  "#ff0000", // Kp = 9 (G5)
];

// Proton Flux S-levels
export const S_LEVELS = [
  { min: 0, max: 0.999, color: "#40cc47", label: "S0" },
  { min: 1, max: 1.999, color: "#81f200", label: "S1" },
  { min: 2, max: 2.999, color: "#fbfb00", label: "S2" },
  { min: 3, max: 3.999, color: "#ffaf02", label: "S3" },
  { min: 4, max: 4.999, color: "#ff6803", label: "S4" },
  { min: 5, max: 20, color: "#ff0000", label: "S5" },
];

// X-ray Flux R-levels
export const R_LEVELS = [
  { min: 0, max: 1e-5, color: "#40cc47", label: "R0" },
  { min: 1e-5, max: 5e-5, color: "#81f200", label: "R1" },
  { min: 5e-5, max: 1e-4, color: "#fbfb00", label: "R2" },
  { min: 1e-4, max: 1e-3, color: "#ffaf02", label: "R3" },
  { min: 1e-3, max: 2e-3, color: "#ff6803", label: "R4" },
  { min: 2e-3, max: 1e-1, color: "#ff0000", label: "R5" },
];

