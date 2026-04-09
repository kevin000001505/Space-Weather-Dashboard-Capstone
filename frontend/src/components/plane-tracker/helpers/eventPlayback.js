export const getPlaybackTimestamp = (entry) => {
  const rawTimestamp =
    entry?.playbackTime ??
    entry?.requested_time ??
    entry?.timestamp ??
    entry?.time ??
    entry?.utc_time ??
    entry?.utcTime ??
    entry?.date ??
    entry?.observed_at ??
    null;
  const timestamp = rawTimestamp ? new Date(rawTimestamp).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : NaN;
};

export const findClosestPlaybackIndex = (timestamps, targetTimestamp) => {
  if (
    !Array.isArray(timestamps) ||
    timestamps.length === 0 ||
    !Number.isFinite(targetTimestamp)
  ) {
    return -1;
  }

  let left = 0;
  let right = timestamps.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const currentTimestamp = timestamps[middle];

    if (currentTimestamp === targetTimestamp) {
      return middle;
    }

    if (currentTimestamp < targetTimestamp) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  if (right < 0) {
    return 0;
  }

  if (left >= timestamps.length) {
    return timestamps.length - 1;
  }

  return Math.abs(timestamps[left] - targetTimestamp) <
    Math.abs(timestamps[right] - targetTimestamp)
    ? left
    : right;
};

export const resolvePlaybackEntry = (
  entries,
  timestamps,
  currentPlaybackTime,
) => {
  if (!Array.isArray(entries) || entries.length === 0 || !currentPlaybackTime) {
    return null;
  }

  const targetTimestamp = new Date(currentPlaybackTime).getTime();
  const closestIndex = findClosestPlaybackIndex(timestamps, targetTimestamp);

  if (closestIndex < 0) {
    return null;
  }

  return entries[closestIndex] ?? null;
};
