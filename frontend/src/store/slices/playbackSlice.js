import { createSlice } from "@reduxjs/toolkit";

const PLAYBACK_EVENTS = ["drap", "aurora", "geoelectric"];

const createPlaybackEventStatus = () => ({
  status: "idle",
  hasData: false,
  count: 0,
});

const createPlaybackHourStatus = (hour) => ({
  hour,
  aggregate: "idle",
  progress: 0,
  hasData: false,
  events: PLAYBACK_EVENTS.reduce((accumulator, event) => {
    accumulator[event] = createPlaybackEventStatus();
    return accumulator;
  }, {}),
});

const getPlaybackHourSummary = (hourStatus) => {
  const eventStatuses = Object.values(hourStatus.events || {});
  const completedEvents = eventStatuses.filter(
    (eventStatus) => eventStatus.status === "ready" || eventStatus.status === "error",
  ).length;
  const hasAnyReadyData = eventStatuses.some((eventStatus) => eventStatus.hasData);
  const hasAnyError = eventStatuses.some(
    (eventStatus) => eventStatus.status === "error",
  );

  hourStatus.progress = Math.round(
    (completedEvents / Math.max(eventStatuses.length, 1)) * 100,
  );
  hourStatus.hasData = hasAnyReadyData;

  if (completedEvents === 0) {
    hourStatus.aggregate = "fetching";
  } else if (completedEvents < eventStatuses.length) {
    hourStatus.aggregate = "buffering";
  } else if (hasAnyReadyData) {
    hourStatus.aggregate = "ready";
  } else if (hasAnyError) {
    hourStatus.aggregate = "error";
  } else {
    hourStatus.aggregate = "empty";
  }

  return hourStatus;
};

const drapSlice = createSlice({
  name: "drap",
  initialState: {
    liveStreamMode: true,
    date: "",
    time: "",
    currentPlaybackTime: null,
    playbackHourStatuses: Array.from({ length: 24 }, (_, hour) =>
      createPlaybackHourStatus(hour),
    ),
  },
  reducers: {
    setDate: (state, action) => {
      state.date = action.payload;
    },
    setTime: (state, action) => {
      state.time = action.payload;
    },
    setLiveStreamMode: (state, action) => {
      state.liveStreamMode = action.payload;
      state.currentPlaybackTime = null;
      state.playbackHourStatuses = Array.from({ length: 24 }, (_, hour) =>
        createPlaybackHourStatus(hour),
      );
    },
    setPlaybackTime: (state, action) => {
      state.currentPlaybackTime = action.payload;
    },
    setPlaybackHourStatus: (state, action) => {
      const { hour, event, status, hasData, count } = action.payload || {};
      if (Number.isInteger(hour) && hour >= 0 && hour < 24) {
        if (!state.playbackHourStatuses[hour]) {
          state.playbackHourStatuses[hour] = createPlaybackHourStatus(hour);
        }

        if (event && PLAYBACK_EVENTS.includes(event)) {
          const eventStatus = state.playbackHourStatuses[hour].events[event];
          if (typeof status === "string") {
            eventStatus.status = status;
          }
          if (typeof hasData === "boolean") {
            eventStatus.hasData = hasData;
          }
          if (Number.isFinite(count)) {
            eventStatus.count = count;
          }
          getPlaybackHourSummary(state.playbackHourStatuses[hour]);
        }
      }
    },
    resetPlaybackHourStatuses: (state) => {
      state.playbackHourStatuses = Array.from({ length: 24 }, (_, hour) =>
        createPlaybackHourStatus(hour),
      );
    },
  },
  extraReducers: (builder) => {},
});

export const {
  setDate,
  setTime,
  setLiveStreamMode,
  setPlaybackTime,
  setPlaybackHourStatus,
  resetPlaybackHourStatuses,
} = drapSlice.actions;
export default drapSlice.reducer;
