import { createSlice } from "@reduxjs/toolkit";
import {
  fetchInitialAlerts,
  fetchMoreAlerts,
} from "../../api/api";

export const alertId = (alert) => `${alert.time}|${alert.message}`;

const sortByTimeDesc = (a, b) => {
  // reverse-chronological — newest first
  const ta = new Date(a.time).getTime();
  const tb = new Date(b.time).getTime();
  return tb - ta;
};

const initialState = {
  alerts: [],
  seenIds: {},
  unread: false,
  isHistoryOpen: false,
  currentDays: 0,
  hasMore: true,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  pendingToastIds: [],
};

const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    injectLiveAlert: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [action.payload];
      const newlyAdded = [];
      for (const raw of incoming) {
        if (!raw || !raw.time || !raw.message) continue;
        const id = alertId(raw);
        if (state.seenIds[id]) continue;
        state.seenIds[id] = true;
        state.alerts.push({ ...raw, id });
        newlyAdded.push(id);
      }
      if (newlyAdded.length > 0) {
        state.alerts.sort(sortByTimeDesc);
        state.unread = true;
        state.pendingToastIds.push(...newlyAdded);
      }
    },
    openHistory: (state) => {
      state.isHistoryOpen = true;
      state.unread = false;
    },
    closeHistory: (state) => {
      state.isHistoryOpen = false;
    },
    markAsRead: (state) => {
      state.unread = false;
    },
    consumePendingToasts: (state, action) => {
      const ids = new Set(action.payload);
      state.pendingToastIds = state.pendingToastIds.filter((id) => !ids.has(id));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInitialAlerts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInitialAlerts.fulfilled, (state, action) => {
        const { alerts, days } = action.payload;
        state.isLoading = false;
        state.currentDays = days;
        state.hasMore = days < 30;
        const merged = [];
        for (const raw of alerts) {
          if (!raw || !raw.time || !raw.message) continue;
          const id = alertId(raw);
          if (state.seenIds[id]) continue;
          state.seenIds[id] = true;
          merged.push({ ...raw, id });
        }
        state.alerts.push(...merged);
        state.alerts.sort(sortByTimeDesc);
      })
      .addCase(fetchInitialAlerts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to load alerts";
      })
      .addCase(fetchMoreAlerts.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(fetchMoreAlerts.fulfilled, (state, action) => {
        const { alerts, days } = action.payload;
        state.isLoadingMore = false;
        state.currentDays = days;
        state.hasMore = days < 30;
        const merged = [];
        for (const raw of alerts) {
          if (!raw || !raw.time || !raw.message) continue;
          const id = alertId(raw);
          if (state.seenIds[id]) continue;
          state.seenIds[id] = true;
          merged.push({ ...raw, id });
        }
        state.alerts.push(...merged);
        state.alerts.sort(sortByTimeDesc);
      })
      .addCase(fetchMoreAlerts.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.error = action.payload || "Failed to load more alerts";
      });
  },
});

export const {
  injectLiveAlert,
  openHistory,
  closeHistory,
  markAsRead,
  consumePendingToasts,
} = alertsSlice.actions;

export default alertsSlice.reducer;
