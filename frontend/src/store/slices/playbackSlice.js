import { createSlice } from "@reduxjs/toolkit";

const PLAYBACK_EVENTS = ["drap", "aurora", "geoelectric"];
const TARGET_SNAPSHOTS = 300;
const MIN_INTERVAL = 1; // 1 minute minimum resolution
const MIN_DURATION_HOURS = 1; // minimum 1-hour range
const MAX_DURATION_DAYS = 14; // maximum 14-day range

/**
 * Calculate the optimal fetch interval (in minutes) for a given time range,
 * keeping total snapshots near TARGET_SNAPSHOTS.
 */
export const calculateOptimalInterval = (startDateTime, endDateTime) => {
  if (!startDateTime || !endDateTime) return 5;
  const durationMs = new Date(endDateTime) - new Date(startDateTime);
  const durationMinutes = durationMs / (1000 * 60);
  if (durationMinutes <= 0) return MIN_INTERVAL;
  const raw = durationMinutes / TARGET_SNAPSHOTS;
  return Math.max(MIN_INTERVAL, Math.round(raw));
};

const createPlaybackEventStatus = () => ({
  status: "idle",
  hasData: false,
  count: 0,
});

const createPlaybackSegmentStatus = (index) => ({
  index,
  aggregate: "idle",
  progress: 0,
  hasData: false,
  events: PLAYBACK_EVENTS.reduce((accumulator, event) => {
    accumulator[event] = createPlaybackEventStatus();
    return accumulator;
  }, {}),
});

const getPlaybackSegmentSummary = (segmentStatus) => {
  const eventStatuses = Object.values(segmentStatus.events || {});
  const completedEvents = eventStatuses.filter(
    (eventStatus) => eventStatus.status === "ready" || eventStatus.status === "error",
  ).length;
  const hasAnyReadyData = eventStatuses.some((eventStatus) => eventStatus.hasData);
  const hasAnyError = eventStatuses.some(
    (eventStatus) => eventStatus.status === "error",
  );

  segmentStatus.progress = Math.round(
    (completedEvents / Math.max(eventStatuses.length, 1)) * 100,
  );
  segmentStatus.hasData = hasAnyReadyData;

  if (completedEvents === 0) {
    segmentStatus.aggregate = "fetching";
  } else if (completedEvents < eventStatuses.length) {
    segmentStatus.aggregate = "buffering";
  } else if (hasAnyReadyData) {
    segmentStatus.aggregate = "ready";
  } else if (hasAnyError) {
    segmentStatus.aggregate = "error";
  } else {
    segmentStatus.aggregate = "empty";
  }

  return segmentStatus;
};

// "Nice" segment durations in minutes, ascending.
// The algorithm picks the smallest one that keeps segment count <= MAX_SEGMENTS.
const NICE_SEGMENT_DURATIONS = [5, 10, 15, 30, 60, 120, 180, 360, 720];
const MIN_SEGMENTS = 12;
const MAX_SEGMENTS = 48;

/**
 * Compute how many segments the status strip should have.
 * Picks a "nice" segment duration that keeps count in [12, 48].
 * Each segment maps 1:1 to a fetch batch for progress tracking.
 */
const computeSegmentCount = (startDateTime, endDateTime) => {
  if (!startDateTime || !endDateTime) return 24;
  const durationMs = new Date(endDateTime) - new Date(startDateTime);
  const durationMinutes = durationMs / (1000 * 60);
  if (durationMinutes <= 0) return MIN_SEGMENTS;

  for (const segDur of NICE_SEGMENT_DURATIONS) {
    const count = Math.ceil(durationMinutes / segDur);
    if (count <= MAX_SEGMENTS) {
      return Math.max(count, MIN_SEGMENTS);
    }
  }
  // Fallback for extremely long ranges: use largest nice duration
  const largest = NICE_SEGMENT_DURATIONS[NICE_SEGMENT_DURATIONS.length - 1];
  return Math.max(Math.ceil(durationMinutes / largest), MIN_SEGMENTS);
};

/**
 * Get the segment duration in ms for a given range.
 * Exported so DateTimeViewer can chunk fetches to match strip segments.
 */
export const getSegmentDurationMs = (startDateTime, endDateTime) => {
  if (!startDateTime || !endDateTime) return 60 * 60 * 1000; // 1h default
  const durationMs = new Date(endDateTime) - new Date(startDateTime);
  const durationMinutes = durationMs / (1000 * 60);
  if (durationMinutes <= 0) return 60 * 60 * 1000;

  for (const segDur of NICE_SEGMENT_DURATIONS) {
    const count = Math.ceil(durationMinutes / segDur);
    if (count <= MAX_SEGMENTS) {
      return segDur * 60 * 1000;
    }
  }
  return NICE_SEGMENT_DURATIONS[NICE_SEGMENT_DURATIONS.length - 1] * 60 * 1000;
};

const buildSegmentStatuses = (count) =>
  Array.from({ length: count }, (_, i) => createPlaybackSegmentStatus(i));

const getDefaultStartDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
};

const getDefaultEndDateTime = () => {
  return new Date().toISOString();
};

const playbackSlice = createSlice({
  name: "playback",
  initialState: {
    liveStreamMode: true,
    // New range-based state
    startDateTime: getDefaultStartDateTime(),
    endDateTime: getDefaultEndDateTime(),
    // Legacy compat: still used by live-mode clock display
    date: "",
    time: "",
    currentPlaybackTime: null,
    playbackSegmentStatuses: buildSegmentStatuses(24),
  },
  reducers: {
    setStartDateTime: (state, action) => {
      state.startDateTime = action.payload;
      const count = computeSegmentCount(state.startDateTime, state.endDateTime);
      state.playbackSegmentStatuses = buildSegmentStatuses(count);
    },
    setEndDateTime: (state, action) => {
      state.endDateTime = action.payload;
      const count = computeSegmentCount(state.startDateTime, state.endDateTime);
      state.playbackSegmentStatuses = buildSegmentStatuses(count);
    },
    setDateTimeRange: (state, action) => {
      const { startDateTime, endDateTime } = action.payload;
      state.startDateTime = startDateTime;
      state.endDateTime = endDateTime;
      const count = computeSegmentCount(startDateTime, endDateTime);
      state.playbackSegmentStatuses = buildSegmentStatuses(count);
    },
    // Keep date/time for live-mode clock display
    setDate: (state, action) => {
      state.date = action.payload;
    },
    setTime: (state, action) => {
      state.time = action.payload;
    },
    setLiveStreamMode: (state, action) => {
      state.liveStreamMode = action.payload;
      state.currentPlaybackTime = null;
      const count = computeSegmentCount(state.startDateTime, state.endDateTime);
      state.playbackSegmentStatuses = buildSegmentStatuses(count);
    },
    setPlaybackTime: (state, action) => {
      state.currentPlaybackTime = action.payload;
    },
    setPlaybackSegmentStatus: (state, action) => {
      const { segment, event, status, hasData, count } = action.payload || {};
      const segCount = state.playbackSegmentStatuses.length;
      if (Number.isInteger(segment) && segment >= 0 && segment < segCount) {
        if (!state.playbackSegmentStatuses[segment]) {
          state.playbackSegmentStatuses[segment] = createPlaybackSegmentStatus(segment);
        }

        if (event && PLAYBACK_EVENTS.includes(event)) {
          const eventStatus = state.playbackSegmentStatuses[segment].events[event];
          if (typeof status === "string") {
            eventStatus.status = status;
          }
          if (typeof hasData === "boolean") {
            eventStatus.hasData = hasData;
          }
          if (Number.isFinite(count)) {
            eventStatus.count = count;
          }
          getPlaybackSegmentSummary(state.playbackSegmentStatuses[segment]);
        }
      }
    },
    resetPlaybackSegmentStatuses: (state) => {
      const count = computeSegmentCount(state.startDateTime, state.endDateTime);
      state.playbackSegmentStatuses = buildSegmentStatuses(count);
    },
  },
});

export const {
  setStartDateTime,
  setEndDateTime,
  setDateTimeRange,
  setDate,
  setTime,
  setLiveStreamMode,
  setPlaybackTime,
  setPlaybackSegmentStatus,
  resetPlaybackSegmentStatuses,
} = playbackSlice.actions;

export { TARGET_SNAPSHOTS, MIN_INTERVAL, MIN_DURATION_HOURS, MAX_DURATION_DAYS, PLAYBACK_EVENTS };
export default playbackSlice.reducer;
