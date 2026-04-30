import React, { useEffect, useState, useRef, useCallback } from "react";
import { batch, useSelector, useDispatch } from "react-redux";
import "./styles/DateTimeViewer.css";
import "../charts/ui/mui-dark-datetime.css";
import { setSelectedTimezone } from "../../store/slices/chartsSlice";
import {
  setDate,
  setTime,
  setDateTimeRange,
  setLiveStreamMode,
  setPlaybackSegmentStatus,
  resetPlaybackSegmentStatuses,
  calculateOptimalInterval,
  getSegmentDurationMs,
  MIN_DURATION_HOURS,
  MAX_DURATION_DAYS,
} from "../../store/slices/playbackSlice";
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  Popover,
  TextField,
  Typography,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { useAllTimezones } from "../../hooks/useAllTimezones";
import {
  formatDate,
  formatTime,
  utcToZonedTime,
} from "./helpers/helper";
import { fetchHistoricalData } from "../../api/api";
import {
  setDRAPPoints,
  setDRAPPlayback,
} from "../../store/slices/drapSlice";
import {
  injectLiveGeoElectric,
  setGeoElectricPlayback,
} from "../../store/slices/geoElectricSlice";
import { injectLiveAurora, setAuroraPlayback } from "../../store/slices/auroraSlice";
import { injectLivePlanes } from "../../store/slices/planesSlice";
import { setTrackedPlanes } from "../../store/slices/playbackFlightPathsSlice";

const ICAO24_REGEX = /^[0-9A-F]{6}$/;
const MAX_TRACKED_PLANES = 30;
const PLANE_INPUT_MAX_LENGTH = 8;

const sanitizePlaneInput = (value) =>
  (value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, PLANE_INPUT_MAX_LENGTH);

const detectPlaneType = (identifier) =>
  ICAO24_REGEX.test(identifier) ? "icao24" : "callsign";

const getPlaybackTime = (item) =>
  item?.playbackTime ||
  item?.requested_time ||
  item?.observation_time ||
  item?.timestamp ||
  item?.observed_at ||
  null;

const normalizePlaybackItem = (event, item) => {
  const playbackTime = getPlaybackTime(item);
  if (!playbackTime) return null;

  if (event === "aurora") {
    return {
      ...item,
      playbackTime,
      points: Array.isArray(item.points)
        ? item.points
        : Array.isArray(item.values)
          ? item.values
          : Array.isArray(item.data)
            ? item.data
            : Array.isArray(item.coordinates)
              ? item.coordinates
              : [],
    };
  }

  if (event === "geoelectric") {
    return {
      ...item,
      playbackTime,
      points: Array.isArray(item.points)
        ? item.points
        : Array.isArray(item.values)
          ? item.values
          : Array.isArray(item.data)
            ? item.data
            : [],
    };
  }

  if (event === "drap") {
    return {
      ...item,
      playbackTime,
      points: Array.isArray(item.points)
        ? item.points
        : Array.isArray(item.values)
          ? item.values
          : Array.isArray(item.drap)
            ? item.drap
            : Array.isArray(item.data)
              ? item.data
              : [],
    };
  }

  return {
    ...item,
    playbackTime,
    points: Array.isArray(item.points) ? item.points : [],
  };
};

const normalizePlaybackChunk = (event, rawChunk) => {
  const items = Array.isArray(rawChunk)
    ? rawChunk
    : Array.isArray(rawChunk?.snapshots)
      ? rawChunk.snapshots
      : Array.isArray(rawChunk?.data)
        ? rawChunk.data
        : rawChunk
          ? [rawChunk]
          : [];

  const normalized = items
    .map((item) => normalizePlaybackItem(event, item))
    .filter(Boolean);

  const seen = new Set();
  return normalized
    .filter((item) => {
      if (seen.has(item.playbackTime)) return false;
      seen.add(item.playbackTime);
      return true;
    })
    .sort((left, right) => new Date(left.playbackTime) - new Date(right.playbackTime));
};

const DEFAULT_MIN_DURATION_MS = MIN_DURATION_HOURS * 60 * 60 * 1000;
const DEFAULT_MAX_DURATION_MS = MAX_DURATION_DAYS * 24 * 60 * 60 * 1000;

/** Format an ISO datetime string in the given timezone, with year. */
const formatRangeLabel = (isoString, timezone) => {
  if (!isoString) return "--";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "--";
  const tz = !timezone || timezone === "local" ? undefined : timezone;
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
};

// Popover with Start/End DateTimePickers, plane tracker section, and OK/Cancel
const RangePopover = React.memo(function RangePopover({
  open,
  anchorEl,
  onClose,
  onConfirm,
  startDateTime,
  endDateTime,
  maxDurationMs,
  darkMode,
  showPlaneTracker = false,
  initialTrackedPlanes = [],
}) {
  const [draftStart, setDraftStart] = useState(() =>
    startDateTime ? new Date(startDateTime) : new Date(),
  );
  const [draftEnd, setDraftEnd] = useState(() =>
    endDateTime ? new Date(endDateTime) : new Date(),
  );
  const [draftPlanes, setDraftPlanes] = useState(() => initialTrackedPlanes);
  const [planeInput, setPlaneInput] = useState("");

  const trimmedInput = planeInput.trim();
  const inputAlreadyTracked = draftPlanes.some(
    (p) => p.identifier === trimmedInput,
  );
  const canAddPlane =
    !!trimmedInput &&
    !inputAlreadyTracked &&
    draftPlanes.length < MAX_TRACKED_PLANES;

  const handleAddPlane = () => {
    if (!canAddPlane) return;
    setDraftPlanes((prev) => [
      ...prev,
      { identifier: trimmedInput, type: detectPlaneType(trimmedInput) },
    ]);
    setPlaneInput("");
  };

  const handleRemovePlane = (identifier) => {
    setDraftPlanes((prev) => prev.filter((p) => p.identifier !== identifier));
  };

  const handlePlaneInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPlane();
    }
  };

  const handleConfirm = () => {
    let finalStart = new Date(draftStart);
    let finalEnd = new Date(draftEnd);
    const now = new Date();
    if (finalEnd > now) finalEnd = now;
    if (finalEnd - finalStart < DEFAULT_MIN_DURATION_MS) {
      finalStart = new Date(finalEnd.getTime() - DEFAULT_MIN_DURATION_MS);
    }
    if (maxDurationMs && finalEnd - finalStart > maxDurationMs) {
      finalStart = new Date(finalEnd.getTime() - maxDurationMs);
    }
    onConfirm(finalStart, finalEnd, draftPlanes);
  };

  const borderColor = darkMode ? "rgba(127,92,255,0.3)" : "#ddd";
  const popperClassName = darkMode ? "mui-dark-datetime-popper" : undefined;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      slotProps={{
        paper: {
          className: darkMode ? "mui-dark-datetime" : undefined,
          sx: {
            mt: 1,
            background: darkMode ? "rgba(34, 40, 60, 0.92)" : "#fff",
            backdropFilter: darkMode ? "blur(16px) saturate(1.4)" : "none",
            border: darkMode ? "1.5px solid #7f5cff" : "1.5px solid #ccc",
            borderRadius: "12px",
            boxShadow: darkMode
              ? "0 8px 32px rgba(0,0,0,0.4), 0 0 16px #7f5cff33"
              : "0 4px 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "92vh",
          },
        },
      }}
    >
      {/* Title */}
      <div
        style={{
          fontWeight: 600,
          fontSize: "1rem",
          padding: "12px 16px 8px",
          borderBottom: `1px solid ${borderColor}`,
          color: darkMode ? "#e0e0e0" : "#333",
        }}
      >
        Select Playback Range
      </div>

      {/* Two DateTimePickers side by side */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "12px 16px",
        }}
      >
        <DateTimePicker
          label="Start Date & Time"
          value={draftStart}
          onChange={(val) => { if (val) setDraftStart(val); }}
          maxDateTime={draftEnd}
          disableFuture
          ampm={false}
          slotProps={{
            actionBar: { actions: [] },
            popper: { className: popperClassName },
          }}
        />
        <DateTimePicker
          label="End Date & Time"
          value={draftEnd}
          onChange={(val) => { if (val) setDraftEnd(val); }}
          minDateTime={draftStart}
          disableFuture
          ampm={false}
          slotProps={{
            actionBar: { actions: [] },
            popper: { className: popperClassName },
          }}
        />
      </div>

      {showPlaneTracker && (
        <Box
          sx={{
            borderTop: `1px solid ${borderColor}`,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flex: "1 1 auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              padding: "10px 16px 6px",
            }}
          >
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: "0.95rem",
                color: darkMode ? "#e0e0e0" : "#333",
              }}
            >
              Tracked Planes
            </Typography>
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: darkMode ? "#999" : "#777",
              }}
            >
              ICAO24 (6 hex) or callsign
            </Typography>
            <Chip
              label={`${draftPlanes.length}/${MAX_TRACKED_PLANES}`}
              size="small"
              sx={{
                ml: "auto",
                fontSize: "0.7rem",
                fontWeight: 600,
                height: 20,
                background: darkMode ? "#7f5cff33" : "#7f5cff22",
                color: darkMode ? "#a78bfa" : "#7c3aed",
              }}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1, padding: "0 16px 8px" }}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. ABC123 or A1B2C3"
              value={planeInput}
              onChange={(e) => setPlaneInput(sanitizePlaneInput(e.target.value))}
              onKeyDown={handlePlaneInputKeyDown}
              inputProps={{
                maxLength: PLANE_INPUT_MAX_LENGTH,
                style: { textTransform: "uppercase", fontFamily: "monospace" },
              }}
              sx={{
                "& .MuiInputBase-root": {
                  background: darkMode ? "rgba(60,60,80,0.6)" : "#f7f7fa",
                  borderRadius: 1,
                  fontSize: "0.85rem",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#222",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode
                    ? "rgba(127,92,255,0.3)"
                    : "rgba(0,0,0,0.15)",
                },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: darkMode ? "#7f5cff" : "#1976d2",
                  },
              }}
            />
            <IconButton
              onClick={handleAddPlane}
              disabled={!canAddPlane}
              size="small"
              aria-label="Add plane"
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                background: darkMode ? "rgba(127,92,255,0.18)" : "rgba(127,92,255,0.12)",
                color: darkMode ? "#a78bfa" : "#7c3aed",
                "&:hover": {
                  background: darkMode
                    ? "rgba(127,92,255,0.32)"
                    : "rgba(127,92,255,0.22)",
                },
                "&.Mui-disabled": {
                  color: darkMode ? "rgba(167,139,250,0.4)" : "rgba(124,58,237,0.4)",
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>

          <List
            dense
            sx={{
              mx: 2,
              mb: 1,
              p: 0,
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: 1,
              border: draftPlanes.length
                ? `1px solid ${borderColor}`
                : "1px dashed transparent",
            }}
          >
            {draftPlanes.length === 0 ? (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  textAlign: "center",
                  fontSize: "0.78rem",
                  color: darkMode ? "#777" : "#999",
                  fontStyle: "italic",
                }}
              >
                No planes added — playback will show no flights.
              </Box>
            ) : (
              draftPlanes.map((plane) => (
                <ListItem
                  key={plane.identifier}
                  disableGutters
                  sx={{
                    px: 1.25,
                    py: 0.25,
                    borderBottom: `1px solid ${borderColor}`,
                    "&:last-of-type": { borderBottom: "none" },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleRemovePlane(plane.identifier)}
                      aria-label={`Remove ${plane.identifier}`}
                      sx={{
                        color: darkMode ? "#f87171" : "#ef4444",
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: darkMode ? "#e0e0e0" : "#222",
                      }}
                    >
                      {plane.identifier}
                    </Typography>
                    <Chip
                      label={plane.type === "icao24" ? "ICAO24" : "CALLSIGN"}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        background:
                          plane.type === "icao24"
                            ? darkMode
                              ? "#1976d244"
                              : "#1976d222"
                            : darkMode
                              ? "#7f5cff44"
                              : "#7f5cff22",
                        color:
                          plane.type === "icao24"
                            ? darkMode
                              ? "#90caf9"
                              : "#1565c0"
                            : darkMode
                              ? "#a78bfa"
                              : "#7c3aed",
                      }}
                    />
                  </Box>
                </ListItem>
              ))
            )}
          </List>
          {draftPlanes.length >= MAX_TRACKED_PLANES && (
            <Box
              sx={{
                px: 2,
                pb: 1,
                textAlign: "center",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: darkMode ? "#f87171" : "#ef4444",
              }}
            >
              Maximum of {MAX_TRACKED_PLANES} planes reached
            </Box>
          )}
        </Box>
      )}

      {/* OK / Cancel */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          padding: "8px 16px 12px",
          borderTop: `1px solid ${borderColor}`,
        }}
      >
        <Button
          size="small"
          onClick={onClose}
          sx={{
            color: darkMode ? "#aaa" : "#666",
            fontWeight: 600,
            "&:hover": { color: darkMode ? "#fff" : "#333" },
          }}
        >
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleConfirm}
          sx={{
            background: "#7f5cff",
            fontWeight: 600,
            "&:hover": { background: "#6a4de0" },
          }}
        >
          OK
        </Button>
      </div>
    </Popover>
  );
});

/**
 * Props:
 * - playbackMode (bool): enables playback data loading and 14-day cap. Default false.
 * - maxDurationMs (number|null): override max duration. null = no limit.
 */
const DateTimeViewer = React.forwardRef(function DateTimeViewer(
  { playbackMode = false, maxDurationMs: maxDurationMsProp },
  ref,
) {
  const dispatch = useDispatch();

  const selectedTimezone = useSelector((state) => state.charts.selectedTimezone);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const liveStreamMode = useSelector((state) => state.playback.liveStreamMode);
  const startDateTime = useSelector((state) => state.playback.startDateTime);
  const endDateTime = useSelector((state) => state.playback.endDateTime);
  const date = useSelector((state) => state.playback.date);
  const time = useSelector((state) => state.playback.time);
  const trackedPlanes = useSelector(
    (state) => state.playbackFlightPaths.trackedPlanes,
  );

  // Playback mode enforces 14-day cap; chart mode has no cap unless overridden
  const maxDurationMs = maxDurationMsProp !== undefined
    ? maxDurationMsProp
    : playbackMode
      ? DEFAULT_MAX_DURATION_MS
      : null;

  const timeZones = useAllTimezones();
  const [tzSearch, setTzSearch] = useState("");
  const [debouncedTzSearch, setDebouncedTzSearch] = useState("");
  const [rangePopoverOpen, setRangePopoverOpen] = useState(false);
  const [rangeAnchorEl, setRangeAnchorEl] = useState(null);
  const [rangeConfirmed, setRangeConfirmed] = useState(false);
  const [popoverKey, setPopoverKey] = useState(0);
  const debounceTimeout = useRef();
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  // On mount, set user's timezone if selectedTimezone is 'local'
  useEffect(() => {
    if (selectedTimezone === "local" && Array.isArray(timeZones)) {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZones.some((tz) => tz.value === userTz)) {
        dispatch(setSelectedTimezone(userTz));
      }
    }
  }, [selectedTimezone, timeZones, dispatch]);

  // Debounce tzSearch
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedTzSearch(tzSearch);
    }, 250);
    return () => clearTimeout(debounceTimeout.current);
  }, [tzSearch]);

  // Reset rangeConfirmed when switching back to live mode
  useEffect(() => {
    if (liveStreamMode) setRangeConfirmed(false);
  }, [liveStreamMode]);

  // Live-mode clock
  useEffect(() => {
    if (!liveStreamMode || !selectedTimezone) return;
    const interval = setInterval(() => {
      const now = utcToZonedTime(
        new Date(),
        selectedTimezone === "local" ? undefined : selectedTimezone,
      );
      dispatch(setDate(now.toString().split("T")[0]));
      dispatch(setTime(now.toString().split("T")[1]));
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatch, liveStreamMode, selectedTimezone]);

  // --- Playback Data Loading (only after user confirms a range) ---
  useEffect(() => {
    if (!playbackMode || liveStreamMode || !startDateTime || !endDateTime || !rangeConfirmed) return;

    let isCancelled = false;
    const playbackBuffers = { drap: [], geoelectric: [], aurora: [] };

    const dedupeAndSortPlayback = (items) => {
      const seen = new Set();
      return items
        .filter((item) => {
          if (!item.playbackTime) return false;
          if (seen.has(item.playbackTime)) return false;
          seen.add(item.playbackTime);
          return true;
        })
        .sort((a, b) => new Date(a.playbackTime) - new Date(b.playbackTime));
    };

    const updatePlaybackBuffer = (event, chunk) => {
      if (isCancelled) return;
      playbackBuffers[event].push(...chunk);
      const normalized = dedupeAndSortPlayback(playbackBuffers[event]);
      if (event === "drap") dispatch(setDRAPPlayback(normalized));
      else if (event === "geoelectric") dispatch(setGeoElectricPlayback(normalized));
      else if (event === "aurora") dispatch(setAuroraPlayback(normalized));
    };

    const loadPlayback = async () => {
      batch(() => {
        dispatch(resetPlaybackSegmentStatuses());
        dispatch(setDRAPPlayback([]));
        dispatch(setAuroraPlayback([]));
        dispatch(setGeoElectricPlayback([]));
        dispatch(setDRAPPoints([]));
        dispatch(injectLiveAurora(null));
        dispatch(injectLiveGeoElectric(null));
        dispatch(injectLivePlanes({ flights: [] }));
      });

      const interval = calculateOptimalInterval(startDateTime, endDateTime);
      const segDurationMs = getSegmentDurationMs(startDateTime, endDateTime);
      const rangeStartMs = new Date(startDateTime).getTime();
      const rangeEndMs = new Date(endDateTime).getTime();
      const segmentCount = Math.ceil((rangeEndMs - rangeStartMs) / segDurationMs);

      for (let seg = 0; seg < segmentCount; seg++) {
        if (isCancelled) return;

        const segStart = new Date(rangeStartMs + seg * segDurationMs);
        const segEnd = new Date(Math.min(rangeStartMs + (seg + 1) * segDurationMs, rangeEndMs));

        batch(() => {
          ["drap", "geoelectric", "aurora"].forEach((event) => {
            dispatch(
              setPlaybackSegmentStatus({
                segment: seg,
                event,
                status: "fetching",
                hasData: false,
                count: 0,
              }),
            );
          });
        });

        const requests = ["drap", "geoelectric", "aurora"].map(async (event) => {
          try {
            const result = await dispatch(
              fetchHistoricalData({
                start: segStart.toISOString(),
                end: segEnd.toISOString(),
                event,
                interval,
              }),
            ).unwrap();

            const eventChunk = normalizePlaybackChunk(event, result?.data || result);
            batch(() => {
              updatePlaybackBuffer(event, eventChunk);
              dispatch(
                setPlaybackSegmentStatus({
                  segment: seg,
                  event,
                  status: "ready",
                  hasData: eventChunk.length > 0,
                  count: eventChunk.length,
                }),
              );
            });
            return { event, status: "fulfilled" };
          } catch (err) {
            batch(() => {
              dispatch(
                setPlaybackSegmentStatus({
                  segment: seg,
                  event,
                  status: "error",
                  hasData: false,
                  count: 0,
                }),
              );
            });
            return { event, status: "rejected", error: err };
          }
        });

        await Promise.all(requests);
      }
    };

    loadPlayback();
    return () => { isCancelled = true; };
  }, [playbackMode, startDateTime, endDateTime, liveStreamMode, rangeConfirmed, dispatch]);

  // --- Range popover handlers ---
  const openRangePopover = useCallback((e) => {
    setRangeAnchorEl(e.currentTarget);
    setRangePopoverOpen(true);
    setPopoverKey((k) => k + 1);
  }, []);

  const closeRangePopover = useCallback(() => {
    setRangePopoverOpen(false);
  }, []);

  const handleRangeConfirm = useCallback((start, end, planes) => {
    dispatch(setDateTimeRange({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    }));
    if (playbackMode) {
      dispatch(setTrackedPlanes(planes || []));
      dispatch(setLiveStreamMode(false));
    }
    setRangeConfirmed(true);
    setRangePopoverOpen(false);
  }, [dispatch, playbackMode]);

  const filteredTimeZones = React.useMemo(() => {
    if (!debouncedTzSearch.trim()) return timeZones;
    const lower = debouncedTzSearch.toLowerCase();
    return timeZones.filter(
      (tz) =>
        tz.label.toLowerCase().includes(lower) ||
        tz.zoneName.toLowerCase().includes(lower) ||
        tz.gmtOffset.toLowerCase().includes(lower) ||
        tz.value.toLowerCase().includes(lower),
    );
  }, [debouncedTzSearch, timeZones]);

  // Show live clock when in live mode
  const showClock = liveStreamMode;

  return (
    <div className="datetime-viewer split" ref={ref}>
      {showClock ? (
        <div
          className={`dtv-box dtv-date ${!darkMode ? "dtv-light" : ""}`}
          style={{ borderRadius: "32px 0 0 32px", minWidth: 240 }}
          onClick={(e) => {
            if (playbackMode) {
              dispatch(setLiveStreamMode(false));
              setRangeAnchorEl(e.currentTarget);
              setRangePopoverOpen(true);
              setPopoverKey((k) => k + 1);
            }
          }}
        >
          {formatDate(date)}&ensp;{formatTime(time, selectedTimezone)}
        </div>
      ) : (
        <div
          className={`dtv-box dtv-range ${!darkMode ? "dtv-light" : ""}`}
          style={{ cursor: "pointer", borderRadius: "32px 0 0 32px", minWidth: 260 }}
          onClick={openRangePopover}
        >
          <span className="dtv-range-value">
            {formatRangeLabel(startDateTime, selectedTimezone)}
            <span style={{ opacity: 0.5, margin: "0 6px" }}>&rarr;</span>
            {formatRangeLabel(endDateTime, selectedTimezone)}
          </span>
        </div>
      )}

      <RangePopover
        key={popoverKey}
        open={rangePopoverOpen}
        anchorEl={rangeAnchorEl}
        onClose={closeRangePopover}
        onConfirm={handleRangeConfirm}
        startDateTime={startDateTime}
        endDateTime={endDateTime}
        maxDurationMs={maxDurationMs}
        darkMode={darkMode}
        showPlaneTracker={playbackMode}
        initialTrackedPlanes={trackedPlanes}
      />

      <Button
        disableRipple
        sx={{
          minWidth: "140px",
          height: "45px",
          borderRadius: "0 32px 32px 0",
          border: "1.5px solid #7f5cff",
          background: menuAnchorEl
            ? "rgba(127, 92, 255, 0.18)"
            : "rgba(34, 40, 60, 0.35)",
          color: menuAnchorEl ? (darkMode ? "#ffd700" : "#fff") : "#fff",
          fontWeight: 600,
          letterSpacing: "1px",
          fontSize: "1em",
          fontFamily: "inherit",
          boxShadow: menuAnchorEl
            ? "0 2px 12px 0 #836cd633"
            : "4px 4px 24px 0 rgba(0,0,0,0.18), 0 0 12px 2px #00eaff22",
          padding: "0 8px",
          transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
          backdropFilter: "blur(12px) saturate(1.4)",
          WebkitBackdropFilter: "blur(12px) saturate(1.4)",
          textAlign: "center",
          justifyContent: "center",
          display: "flex",
          alignItems: "center",
          gap: 1,
          pointerEvents: "auto",
          "&:hover .MuiSvgIcon-root": {
            color: darkMode ? "#ffd700" : "#fff",
          },
          "&:hover": {
            background: "rgba(127, 92, 255, 0.18)",
            color: darkMode ? "#ffd700" : "#fff",
            border: darkMode ? "1.5px solid #ffd700" : "1.5px solid #fff",
            boxShadow: "0 2px 12px 0 #ffd700",
            textShadow: darkMode
              ? "0 0 8px #ffd700, 0 0 0px #ffd700"
              : "0 0 8px #fff, 0 0 0px #fff",
          },
          "&:focus": { outline: "none", boxShadow: "none", border: "1.5px solid #ffd700" },
          "&:active": { outline: "none", boxShadow: "none", border: "1.5px solid #ffd700" },
        }}
        onClick={(e) => setMenuAnchorEl(e.currentTarget)}
      >
        {timeZones.find((tz) => tz.value === selectedTimezone)?.label || "Select Timezone"}
        <ArrowDropDownIcon
          sx={{
            fontSize: "1.375rem",
            color: menuAnchorEl ? (darkMode ? "#7f5cff" : "#fff") : "#fff",
            transition: "transform 0.2s, color 0.2s",
            transform: menuAnchorEl ? "rotate(180deg)" : "none",
          }}
        />
      </Button>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => { setMenuAnchorEl(null); setTzSearch(""); }}
        disableAutoFocusItem
        disableRestoreFocus
        onKeyDown={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              color: darkMode ? "#e0e0e0" : "#333",
              backgroundColor: darkMode ? "#23272e" : "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 12px 0 #836cd633",
              fontWeight: 600,
              fontFamily: "inherit",
              fontSize: "1em",
              maxHeight: 400,
              minWidth: 260,
            },
          },
          list: { dense: true, sx: { p: 0 } },
        }}
      >
        <TextField
          autoFocus
          size="small"
          placeholder="Search timezone..."
          value={tzSearch}
          onChange={(e) => setTzSearch(e.target.value)}
          sx={{
            m: 1,
            width: "calc(100% - 16px)",
            "& .MuiInputBase-root": {
              color: darkMode ? "#fff" : "#222",
              background: darkMode ? "rgba(60,60,80,0.7)" : "#f7f7fa",
              borderRadius: "8px",
            },
            "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: darkMode ? "#7f5cff" : "#1976d2",
            },
            "& .MuiInputBase-input::placeholder": {
              color: darkMode ? "#fff" : "#888",
              opacity: 1,
            },
          }}
          slotProps={{
            input: {
              style: { fontSize: "0.875rem", color: darkMode ? "#fff" : "#222" },
            },
          }}
          onKeyDown={(e) => e.stopPropagation()}
        />
        {filteredTimeZones.length === 0 ? (
          <MenuItem disabled>No results</MenuItem>
        ) : (
          filteredTimeZones.map((tz) => (
            <MenuItem
              key={tz.value}
              selected={tz.value === selectedTimezone}
              onClick={() => {
                dispatch(setSelectedTimezone(tz.value));
                setMenuAnchorEl(null);
                setTzSearch("");
              }}
            >
              <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
                <span style={{ flex: 1, color: "#aaa", fontSize: "1.2em" }}>{tz.label}</span>
                {tz.zoneName && (
                  <span style={{ color: "#7f5cff", fontSize: "1.2em", marginLeft: 8 }}>
                    {tz.zoneName}
                  </span>
                )}
                {tz.gmtOffset && (
                  <span style={{ color: "#aaa", fontSize: "1.2em", marginLeft: 8 }}>
                    {tz.gmtOffset}
                  </span>
                )}
              </span>
            </MenuItem>
          ))
        )}
      </Menu>
    </div>
  );
});

export default DateTimeViewer;
