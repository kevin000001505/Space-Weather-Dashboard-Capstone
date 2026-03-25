// timezoneUtils.js

import React from "react";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatTimezoneLabel(tzValue) {
  return tzValue.replace(/_/g, " ");
}

function normalizeOffsetLabel(raw) {
  if (!raw) return null;

  const value = raw.trim().replace(/^UTC/, "GMT");

  if (value === "GMT") return "GMT+00:00";

  const match = value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return null;

  const [, sign, hours, minutes = "00"] = match;
  return `GMT${sign}${pad2(hours)}:${pad2(minutes)}`;
}

function getOffsetFromTimeZoneName(tzValue, date, timeZoneName) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tzValue,
      timeZoneName,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const raw = parts.find((part) => part.type === "timeZoneName")?.value || "";
    return normalizeOffsetLabel(raw);
  } catch {
    return null;
  }
}

function getOffsetByPartsFallback(tzValue, date) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tzValue,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const parts = dtf.formatToParts(date);
    const map = {};

    for (const part of parts) {
      if (part.type !== "literal") map[part.type] = part.value;
    }

    const hasAllParts =
      map.year && map.month && map.day && map.hour && map.minute && map.second;

    if (!hasAllParts) return null;

    const asUTC = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second),
    );

    const diffMinutes = Math.round((asUTC - date.getTime()) / 60000);

    if (!Number.isFinite(diffMinutes)) return null;

    const sign = diffMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(diffMinutes);
    const hours = Math.floor(abs / 60);
    const minutes = abs % 60;

    return `GMT${sign}${pad2(hours)}:${pad2(minutes)}`;
  } catch {
    return null;
  }
}

export function getGmtOffset(tzValue, date = new Date()) {
  if (!tzValue || tzValue === "local") return "";
  if (tzValue === "UTC") return "GMT+00:00";

  return (
    getOffsetFromTimeZoneName(tzValue, date, "longOffset") ||
    getOffsetFromTimeZoneName(tzValue, date, "shortOffset") ||
    getOffsetByPartsFallback(tzValue, date)
  );
}

function getZoneLongName(tzValue, date = new Date()) {
  if (!tzValue || tzValue === "local") return "Local Time";
  if (tzValue === "UTC") return "Coordinated Universal Time";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tzValue,
      timeZoneName: "longGeneric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    return parts.find((part) => part.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

export function getAllTimezones() {
  const topZones = popularZones.filter(
    (z) => z.value === "local" || z.gmtOffset,
  );

  const topZoneValues = new Set(topZones.map((z) => z.value));

  let tzList = [];

  try {
    const zones =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [];

    tzList = zones
      .filter((tz) => !topZoneValues.has(tz))
      .map((tz) => {
        const gmtOffset = getGmtOffset(tz);
        const zone = getZoneLongName(tz);
        if (!gmtOffset) return null;

        return {
          label: tz.replace(/_/g, " "),
          value: tz,
          gmtOffset,
          zoneName: zone || "",
        };
      })
      .filter(Boolean);
  } catch {
    tzList = [];
  }

  return [...topZones, ...tzList];
}

export const useAllTimezones = () => React.useMemo(() => getAllTimezones(), []);

const popularZones = [
  { label: "UTC", value: "UTC", gmtOffset: "GMT+00:00", zoneName: "Coordinated Universal Time" },
  { label: "America/New York", value: "America/New_York", gmtOffset: getGmtOffset("America/New_York"), zoneName: getZoneLongName("America/New_York") },
  { label: "America/Chicago", value: "America/Chicago", gmtOffset: getGmtOffset("America/Chicago"), zoneName: getZoneLongName("America/Chicago") },
  { label: "America/Denver", value: "America/Denver", gmtOffset: getGmtOffset("America/Denver"), zoneName: getZoneLongName("America/Denver") },
  { label: "America/Phoenix", value: "America/Phoenix", gmtOffset: getGmtOffset("America/Phoenix"), zoneName: getZoneLongName("America/Phoenix") },
  { label: "America/Los Angeles", value: "America/Los_Angeles", gmtOffset: getGmtOffset("America/Los_Angeles"), zoneName: getZoneLongName("America/Los_Angeles") },
  { label: "America/Anchorage", value: "America/Anchorage", gmtOffset: getGmtOffset("America/Anchorage"), zoneName: getZoneLongName("America/Anchorage") },
  { label: "Pacific/Honolulu", value: "Pacific/Honolulu", gmtOffset: getGmtOffset("Pacific/Honolulu"), zoneName: getZoneLongName("Pacific/Honolulu") },

  { label: "America/Toronto", value: "America/Toronto", gmtOffset: getGmtOffset("America/Toronto"), zoneName: getZoneLongName("America/Toronto") },
  { label: "America/Mexico City", value: "America/Mexico_City", gmtOffset: getGmtOffset("America/Mexico_City"), zoneName: getZoneLongName("America/Mexico_City") },
  { label: "America/Sao Paulo", value: "America/Sao_Paulo", gmtOffset: getGmtOffset("America/Sao_Paulo"), zoneName: getZoneLongName("America/Sao_Paulo") },
  { label: "America/Buenos Aires", value: "America/Argentina/Buenos_Aires", gmtOffset: getGmtOffset("America/Argentina/Buenos_Aires"), zoneName: getZoneLongName("America/Argentina/Buenos_Aires") },

  { label: "Europe/London", value: "Europe/London", gmtOffset: getGmtOffset("Europe/London"), zoneName: getZoneLongName("Europe/London") },
  { label: "Europe/Paris", value: "Europe/Paris", gmtOffset: getGmtOffset("Europe/Paris"), zoneName: getZoneLongName("Europe/Paris") },
  { label: "Europe/Berlin", value: "Europe/Berlin", gmtOffset: getGmtOffset("Europe/Berlin"), zoneName: getZoneLongName("Europe/Berlin") },
  { label: "Europe/Athens", value: "Europe/Athens", gmtOffset: getGmtOffset("Europe/Athens"), zoneName: getZoneLongName("Europe/Athens") },

  { label: "Africa/Johannesburg", value: "Africa/Johannesburg", gmtOffset: getGmtOffset("Africa/Johannesburg"), zoneName: getZoneLongName("Africa/Johannesburg") },

  { label: "Asia/Dubai", value: "Asia/Dubai", gmtOffset: getGmtOffset("Asia/Dubai"), zoneName: getZoneLongName("Asia/Dubai") },
  { label: "Asia/Kolkata", value: "Asia/Kolkata", gmtOffset: getGmtOffset("Asia/Kolkata"), zoneName: getZoneLongName("Asia/Kolkata") },
  { label: "Asia/Singapore", value: "Asia/Singapore", gmtOffset: getGmtOffset("Asia/Singapore"), zoneName: getZoneLongName("Asia/Singapore") },
  { label: "Asia/Shanghai", value: "Asia/Shanghai", gmtOffset: getGmtOffset("Asia/Shanghai"), zoneName: getZoneLongName("Asia/Shanghai") },
  { label: "Asia/Tokyo", value: "Asia/Tokyo", gmtOffset: getGmtOffset("Asia/Tokyo"), zoneName: getZoneLongName("Asia/Tokyo") },
  { label: "Asia/Seoul", value: "Asia/Seoul", gmtOffset: getGmtOffset("Asia/Seoul"), zoneName: getZoneLongName("Asia/Seoul") },

  { label: "Australia/Sydney", value: "Australia/Sydney", gmtOffset: getGmtOffset("Australia/Sydney"), zoneName: getZoneLongName("Australia/Sydney") },
].filter((z) => z.value === "local" || z.gmtOffset);
