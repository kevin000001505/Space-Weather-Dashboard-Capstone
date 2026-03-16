// Helper to get ISO string (UTC, no ms)
export function toIso(dt) {
  return dt.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Returns [start, end] ISO strings for given hours
export function getTimeRange(hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return [toIso(start), toIso(end)];
}
