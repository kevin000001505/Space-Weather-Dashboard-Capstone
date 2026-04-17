import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setPlaybackTime,
  setLiveStreamMode,
  calculateOptimalInterval,
  getSegmentDurationMs,
} from "../../../store/slices/playbackSlice";
import {
  Box,
  alpha,
  Button,
  IconButton,
  Paper,
  Slider,
  Stack,
  Tooltip,
} from "@mui/material";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import FastRewindRoundedIcon from "@mui/icons-material/FastRewindRounded";
import FastForwardRoundedIcon from "@mui/icons-material/FastForwardRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import { getPlaybackTimestamp } from "../helpers/eventPlayback";

const PLAYBACK_EVENTS = ["drap", "aurora", "geoelectric"];

const createDefaultSegmentStatus = (index) => ({
  index,
  aggregate: "idle",
  progress: 0,
  hasData: false,
  events: PLAYBACK_EVENTS.reduce((accumulator, event) => {
    accumulator[event] = { status: "idle", hasData: false, count: 0 };
    return accumulator;
  }, {}),
});

const normalizeSegmentStatus = (status, index) => {
  const fallback = createDefaultSegmentStatus(index);
  if (!status || typeof status !== "object") return fallback;

  const normalized = { ...fallback, ...status, events: { ...fallback.events } };
  PLAYBACK_EVENTS.forEach((event) => {
    normalized.events[event] = {
      ...fallback.events[event],
      ...(status.events?.[event] || {}),
    };
  });
  return normalized;
};

const formatSegmentLabel = (timestamp, timezone) => {
  const tz = !timezone || timezone === "local" ? undefined : timezone;
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
};

const SegmentStatusStrip = React.memo(function SegmentStatusStrip({
  normalizedSegmentStatuses,
  playbackRangeStartTime,
  segmentDurationMs,
  darkMode,
  onSelectSegment,
  formatSegmentTooltip,
}) {
  const segmentCount = normalizedSegmentStatuses.length;
  const segmentColors = React.useMemo(
    () => ({
      idle: alpha(darkMode ? "#7c8aa0" : "#c2d0ea", 0.1),
      fetching: alpha(darkMode ? "#fbbf24" : "#f59e0b", 0.4),
      buffering: alpha(darkMode ? "#fbbf24" : "#f59e0b", 0.66),
      ready: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.92),
      error: alpha("#ef4444", 0.72),
      empty: alpha(darkMode ? "#7c8aa0" : "#c2d0ea", 0.06),
    }),
    [darkMode],
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${segmentCount}, minmax(0, 1fr))`,
        gap: "2px",
        height: 8,
        mt: 0.2,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.06),
        border: "1px solid",
        borderColor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.12),
      }}
    >
      {normalizedSegmentStatuses.map((segStatus, idx) => {
        const segStart = playbackRangeStartTime + idx * segmentDurationMs;
        const fillWidth =
          segStatus.aggregate === "empty"
            ? 0
            : Math.max(segStatus.progress, 6);
        const fillColor = segmentColors[segStatus.aggregate] || segmentColors.idle;

        return (
          <Tooltip
            key={idx}
            arrow
            placement="top"
            title={formatSegmentTooltip(segStatus, segStart)}
          >
            <Box
              onClick={() => {
                if (segStatus.hasData) onSelectSegment(segStart);
              }}
              sx={{
                position: "relative",
                height: "100%",
                minWidth: 0,
                overflow: "hidden",
                bgcolor: segmentColors[segStatus.aggregate] || segmentColors.idle,
                cursor: segStatus.hasData ? "pointer" : "default",
                boxShadow:
                  segStatus.aggregate === "fetching" ||
                  segStatus.aggregate === "buffering"
                    ? `inset 0 0 0 1px ${alpha("#fff", 0.18)}`
                    : "none",
                transition:
                  "background-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: `${fillWidth}%`,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${alpha(fillColor, 0.55)} 0%, ${fillColor} 100%)`,
                  transition: "width 350ms ease, background-color 180ms ease",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    segStatus.aggregate === "empty"
                      ? `linear-gradient(90deg, transparent 0%, ${alpha("#fff", 0.04)} 100%)`
                      : `linear-gradient(90deg, transparent 0%, ${alpha("#fff", 0.08)} 100%)`,
                  mixBlendMode: "screen",
                  pointerEvents: "none",
                }}
              />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
});

const PlaybackPanel = React.forwardRef(function PlaybackPanel(props, ref) {
  const dispatch = useDispatch();
  const { darkMode } = useSelector((state) => state.ui);
  const selectedTimezone = useSelector((state) => state.charts.selectedTimezone);
  const startDateTime = useSelector((state) => state.playback.startDateTime);
  const endDateTime = useSelector((state) => state.playback.endDateTime);
  const drapPlayback = useSelector((state) => state.drap.playback);
  const auroraPlayback = useSelector((state) => state.aurora.playback);
  const geoElectricPlayback = useSelector(
    (state) => state.geoelectric.playback,
  );
  const playbackSegmentStatuses = useSelector(
    (state) => state.playback.playbackSegmentStatuses || [],
  );

  const normalizedSegmentStatuses = React.useMemo(
    () =>
      playbackSegmentStatuses.map((status, idx) =>
        normalizeSegmentStatus(status, idx),
      ),
    [playbackSegmentStatuses],
  );

  const playbackTimes = React.useMemo(() => {
    const timestamps = [drapPlayback, auroraPlayback, geoElectricPlayback]
      .flat()
      .map((entry) => getPlaybackTimestamp(entry))
      .filter((timestamp) => Number.isFinite(timestamp));

    return Array.from(new Set(timestamps)).sort((left, right) => left - right);
  }, [drapPlayback, auroraPlayback, geoElectricPlayback]);

  // Dynamic step based on the interval for the selected range
  const baseStepMs = React.useMemo(() => {
    const interval = calculateOptimalInterval(startDateTime, endDateTime);
    return interval * 60 * 1000;
  }, [startDateTime, endDateTime]);

  const segmentDurationMs = React.useMemo(
    () => getSegmentDurationMs(startDateTime, endDateTime),
    [startDateTime, endDateTime],
  );

  const [startTime, setStartTime] = React.useState(null);
  const [endTime, setEndTime] = React.useState(null);
  const [currentTime, setCurrentTime] = React.useState(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLooping, setIsLooping] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const lastPlaybackRangeRef = React.useRef({ startTime: null, endTime: null });

  const playbackRange = React.useMemo(() => {
    if (startDateTime && endDateTime) {
      return {
        startTime: new Date(startDateTime).getTime(),
        endTime: new Date(endDateTime).getTime(),
      };
    }

    if (playbackTimes.length > 0) {
      const first = new Date(playbackTimes[0]);
      const start = new Date(first);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return {
        startTime: start.getTime(),
        endTime: end.getTime(),
      };
    }

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return {
      startTime: start.getTime(),
      endTime: end.getTime(),
    };
  }, [startDateTime, endDateTime, playbackTimes]);

  const initialPlaybackTime = React.useMemo(
    () => playbackRange.startTime,
    [playbackRange.startTime],
  );

  React.useEffect(() => {
    setStartTime(playbackRange.startTime);
    setEndTime(playbackRange.endTime);
    const rangeChanged =
      lastPlaybackRangeRef.current.startTime !== playbackRange.startTime ||
      lastPlaybackRangeRef.current.endTime !== playbackRange.endTime;
    lastPlaybackRangeRef.current = playbackRange;

    if (rangeChanged || currentTime === null) {
      setCurrentTime(initialPlaybackTime);
      dispatch(setPlaybackTime(initialPlaybackTime));
      setIsPlaying(false);
    }
  }, [playbackRange, initialPlaybackTime, currentTime, dispatch]);

  const frameSkip = Math.max(Math.round(speed), 1);

  const allowedSpeeds = [0.25, 0.5, 1, 2, 4, 8];
  const handleSpeedChange = () => {
    const currentIdx = allowedSpeeds.indexOf(speed);
    const nextIdx = (currentIdx + 1) % allowedSpeeds.length;
    setSpeed(allowedSpeeds[nextIdx]);
  };

  const handleSelectSegment = React.useCallback((segmentStart) => {
    setCurrentTime(segmentStart);
  }, []);

  const advanceFrames = React.useCallback(
    (prev, count) => {
      const current = prev ?? playbackRange.startTime;
      const stepTime = current + count * baseStepMs;

      if (stepTime >= playbackRange.endTime) {
        if (isLooping) return playbackRange.startTime;
        setIsPlaying(false);
        return playbackRange.endTime - baseStepMs;
      }

      if (stepTime < playbackRange.startTime) {
        if (isLooping) return playbackRange.endTime - baseStepMs;
        return playbackRange.startTime;
      }

      return stepTime;
    },
    [isLooping, playbackRange.startTime, playbackRange.endTime, baseStepMs],
  );

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(
      () => {
        setCurrentTime((prev) =>
          advanceFrames(prev ?? playbackRange.startTime, frameSkip),
        );
      },
      speed < 1 ? 1000 / speed : 1000,
    );
    return () => clearInterval(interval);
  }, [isPlaying, speed, frameSkip, advanceFrames, playbackRange.startTime]);

  React.useEffect(() => {
    dispatch(setPlaybackTime(currentTime));
  }, [currentTime, dispatch]);

  const handleStepBackward = () => {
    setCurrentTime((prev) => advanceFrames(prev, -1));
  };
  const handleStepForward = () => {
    setCurrentTime((prev) => advanceFrames(prev, 1));
  };

  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return "--/--/----, --:--:-- --";
    const tz = !selectedTimezone || selectedTimezone === "local" ? undefined : selectedTimezone;
    return new Date(ms).toLocaleString(undefined, { timeZone: tz });
  };

  const formatSegmentTooltip = React.useCallback(
    (segStatus, segStart) => (
      <Stack spacing={0.5} sx={{ py: 0.25 }}>
        <Box sx={{ fontWeight: 700 }}>{formatSegmentLabel(segStart, selectedTimezone)}</Box>
        <Box sx={{ fontSize: "0.8rem", opacity: 0.8 }}>
          {segStatus.aggregate === "empty"
            ? "No data for this segment"
            : `${segStatus.aggregate.toUpperCase()} • ${segStatus.progress}% complete`}
        </Box>
        {PLAYBACK_EVENTS.map((event) => {
          const eventStatus = segStatus.events?.[event] || {};
          const label =
            eventStatus.status === "ready"
              ? eventStatus.hasData
                ? "Fetched"
                : "Fetched (empty)"
              : eventStatus.status === "error"
                ? "Failed"
                : eventStatus.status;

          return (
            <Box
              key={event}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 1,
                fontSize: "0.75rem",
                opacity: eventStatus.status === "idle" ? 0.6 : 1,
              }}
            >
              <span>{event.toUpperCase()}</span>
              <span>{label}</span>
            </Box>
          );
        })}
      </Stack>
    ),
    [selectedTimezone],
  );

  // Resolution display
  const intervalMinutes = React.useMemo(
    () => calculateOptimalInterval(startDateTime, endDateTime),
    [startDateTime, endDateTime],
  );
  const resolutionLabel = intervalMinutes >= 60
    ? `${Math.round(intervalMinutes / 60)}h`
    : `${intervalMinutes}m`;

  const transportButtonSx = {
    width: 42,
    height: 42,
    borderRadius: 2.5,
    border: "1px solid",
    borderColor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.22),
    bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.8),
    color: "#fff",
    "&:hover": {
      bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.6),
      borderColor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.32),
    },
  };

  const sliderSx = {
    py: 1.25,
    "& .MuiSlider-rail": {
      bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.2),
      opacity: 1,
    },
    "& .MuiSlider-track": {
      border: "none",
      backgroundColor: "transparent",
    },
    "& .MuiSlider-thumb": {
      width: 12,
      height: 12,
      boxShadow: "none",
      border: `2px solid #fff`,
    },
  };

  const disabled = startTime === null || endTime === null;

  return (
    <Paper
      elevation={0}
      ref={ref}
      sx={{
        position: "absolute",
        bottom: "20px",
        left: "0px",
        right: "0px",
        mx: "auto",
        transform: "translateX(-50%)",
        width: "40%",
        minWidth: "342px",
        borderRadius: 4,
        p: 2,
        border: "1px solid",
        borderColor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.16),
        background: "rgba(34, 40, 60, 0.35)",
        backdropFilter: "blur(10px)",
        boxShadow: darkMode
          ? `0 16px 36px ${alpha("#000", 0.34)}`
          : `0 14px 30px ${alpha("#0F172A", 0.1)}`,
      }}
    >
      <Stack spacing={1}>
        <Stack spacing={0.5}>
          <SegmentStatusStrip
            normalizedSegmentStatuses={normalizedSegmentStatuses}
            playbackRangeStartTime={playbackRange.startTime}
            segmentDurationMs={segmentDurationMs}
            darkMode={darkMode}
            onSelectSegment={handleSelectSegment}
            formatSegmentTooltip={formatSegmentTooltip}
          />

          <Slider
            value={currentTime ?? 0}
            min={startTime ?? 0}
            max={endTime ?? 0}
            step={baseStepMs}
            onChange={(_, value) => {
              if (typeof value === "number") {
                setCurrentTime(value);
              }
            }}
            aria-label="Playback time"
            disabled={disabled}
            sx={{
              ...sliderSx,
              "& .MuiSlider-track": {
                bgcolor: darkMode ? "#a78bfa" : "#1976d2",
              },
              "& .MuiSlider-thumb": {
                ...sliderSx["& .MuiSlider-thumb"],
                bgcolor: darkMode ? "#a78bfa" : "#1976d2",
              },
            }}
          />

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{
              fontSize: "1rem",
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <Tooltip title={`Resolution: 1 frame = ${resolutionLabel}`} placement="top">
              <span
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.6,
                  alignSelf: "center",
                }}
              >
                {resolutionLabel} step
              </span>
            </Tooltip>
            <span>{formatTime(endTime)}</span>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Step backward">
              <span>
                <IconButton
                  onClick={handleStepBackward}
                  disabled={disabled}
                  sx={transportButtonSx}
                  aria-label="Step backward"
                >
                  <FastRewindRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={isPlaying ? "Pause playback" : "Start playback"}>
              <span>
                <IconButton
                  onClick={() => setIsPlaying((prev) => !prev)}
                  aria-label={isPlaying ? "Pause playback" : "Start playback"}
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: 3,
                    color: "#fff",
                    bgcolor: darkMode ? "#a78bfa" : "#1976d2",
                    boxShadow: `0 10px 22px ${alpha(darkMode ? "#a78bfa" : "#1976d2", 0.28)}`,
                    "&:hover": {
                      bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.8),
                    },
                    "&.Mui-disabled": {
                      bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.4),
                      color: alpha("#fff", 0.6),
                    },
                  }}
                  disabled={disabled}
                >
                  {isPlaying ? (
                    <PauseRoundedIcon sx={{ fontSize: 30 }} />
                  ) : (
                    <PlayArrowRoundedIcon sx={{ fontSize: 30 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Step forward">
              <span>
                <IconButton
                  onClick={handleStepForward}
                  disabled={disabled}
                  sx={transportButtonSx}
                  aria-label="Step forward"
                >
                  <FastForwardRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title={isLooping ? "Loop enabled" : "Loop disabled"}>
              <span>
                <IconButton
                  onClick={() => setIsLooping((prev) => !prev)}
                  disabled={disabled}
                  aria-label="Toggle loop"
                  sx={{
                    ...transportButtonSx,
                    color: isLooping
                      ? "#fff"
                      : alpha(darkMode ? "#a78bfa" : "#1976d2", 0.8),
                    bgcolor: isLooping
                      ? transportButtonSx.bgcolor
                      : alpha(darkMode ? "#a78bfa" : "#1976d2", 0.12),
                    borderColor: isLooping
                      ? transportButtonSx.borderColor
                      : alpha(darkMode ? "#a78bfa" : "#1976d2", 0.32),
                  }}
                >
                  <RepeatRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Button
              onClick={handleSpeedChange}
              variant="outlined"
              disabled={disabled}
              disableRipple
              sx={{
                minWidth: 42,
                height: 42,
                borderRadius: 2.5,
                fontSize: "1rem",
                fontWeight: 700,
                textTransform: "none",
                color: "#fff",
                bgcolor: darkMode ? "#a78bfa" : "#1976d2",
                boxShadow: `0 10px 22px ${alpha(darkMode ? "#a78bfa" : "#1976d2", 0.28)}`,
                "&:hover": {
                  bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.8),
                },
                "&.Mui-disabled": {
                  bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.4),
                  color: alpha("#fff", 0.6),
                },
              }}
            >
              {speed}x
            </Button>

            <Tooltip title="Return to Live Stream Mode" placement="top">
              <span>
                <IconButton
                  onClick={() => dispatch(setLiveStreamMode(true))}
                  aria-label="Return to Live"
                  sx={{
                    minWidth: 42,
                    height: 42,
                    borderRadius: 2.5,
                    fontSize: "1rem",
                    fontWeight: 700,
                    textTransform: "none",
                    color: "#fff",
                    bgcolor: "#fc6565",
                    boxShadow: `0 10px 22px ${alpha("#fc6565", 0.28)}`,
                    "&:hover": {
                      bgcolor: alpha("#fc6565", 0.8),
                    },
                    "&.Mui-disabled": {
                      bgcolor: alpha("#fc6565", 0.4),
                      color: alpha("#fff", 0.6),
                    },
                  }}
                >
                  <KeyboardReturnIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
});

export default PlaybackPanel;
