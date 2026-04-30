/**
 * Resolve flight positions from playback flight path data at a given timestamp.
 *
 * The V2 flight-path API returns parallel arrays from each gap-filled time bucket:
 *   { requested_time: [...], time: [...], points: [...] }
 * where `requested_time[i]`, `time[i]`, and `points[i]` all come from the same row.
 *
 * The playback clock advances on minute-aligned `requested_time` boundaries, while
 * `time` / `time_pos` are the actual observation timestamps (off by seconds), so we
 * key the lookup off `requested_time` to keep frames in sync with the slider.
 */
export const resolveFlightPositions = (flightDataMap, playbackTime) => {
  if (!playbackTime || !flightDataMap || Object.keys(flightDataMap).length === 0) {
    return [];
  }

  const targetTime = new Date(playbackTime).getTime();
  if (!Number.isFinite(targetTime)) return [];

  const positions = [];

  for (const [identifier, data] of Object.entries(flightDataMap)) {
    if (
      !data ||
      !Array.isArray(data.points) ||
      !Array.isArray(data.requested_time)
    ) {
      continue;
    }

    const requested = data.requested_time;
    const points = data.points;
    const len = Math.min(requested.length, points.length);
    if (len === 0) continue;

    // Find the latest requested_time bucket <= playbackTime
    let bucketMs = null;
    for (let i = 0; i < len; i++) {
      const t = new Date(requested[i]).getTime();
      if (!Number.isFinite(t)) continue;
      if (t <= targetTime) {
        bucketMs = t;
      } else {
        break;
      }
    }
    if (bucketMs === null) continue;

    // Collect every point that belongs to that bucket (parallel-array index match)
    for (let i = 0; i < len; i++) {
      const t = new Date(requested[i]).getTime();
      if (!Number.isFinite(t) || t !== bucketMs) continue;

      const point = points[i];
      if (!point) continue;
      if (point.on_ground === true || point.on_ground === "true") continue;
      if (point.lat == null || point.lon == null) continue;

      const headingValue =
        point.heading == null || point.heading === ""
          ? 0
          : parseFloat(point.heading);
      positions.push({
        icao24: point.icao24 || identifier,
        callsign: point.callsign || identifier,
        lon: parseFloat(point.lon),
        lat: parseFloat(point.lat),
        geo_altitude: parseFloat(point.geo_altitude) || 0,
        on_ground: false,
        heading: Number.isFinite(headingValue) ? headingValue : 0,
      });
    }
  }

  return positions;
};
