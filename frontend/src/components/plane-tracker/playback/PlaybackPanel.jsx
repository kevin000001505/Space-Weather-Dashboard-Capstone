import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setDRAPPoints } from "../../../store/slices/drapSlice";
import {
  alpha,
  Button,
  IconButton,
  Paper,
  Slider,
  Stack,
  Tooltip,
} from "@mui/material";
import { setLiveStreamMode } from "../../../store/slices/playbackSlice";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import FastRewindRoundedIcon from "@mui/icons-material/FastRewindRounded";
import FastForwardRoundedIcon from "@mui/icons-material/FastForwardRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";

const PlaybackPanel = React.forwardRef(function PlaybackPanel(props, ref) {
  const dispatch = useDispatch();
  const { darkMode } = useSelector((state) => state.ui);
  const drapPlayback = useSelector((state) => state.drap.playback);

  // --- Time-based playback state ---
  // Determine time range (midnight to midnight of first data day, or today if no data)
  const getDayRange = React.useCallback(() => {
    if (drapPlayback.length > 0) {
      const first = new Date(drapPlayback[0].requested_time);
      const start = new Date(first);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return [start.getTime(), end.getTime()];
    } else {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return [start.getTime(), end.getTime()];
    }
  }, [drapPlayback]);

  const [startTime, setStartTime] = React.useState(null);
  const [endTime, setEndTime] = React.useState(null);
  const stepMs = 300 * 1000; // 5 minute step
  const [currentTime, setCurrentTime] = React.useState(null);

  // Update time range and reset currentTime if range changes
  React.useEffect(() => {
    if (drapPlayback.length > 0) {
      const [newStart, newEnd] = getDayRange();
      setStartTime((prevStart) => {
        if (prevStart !== newStart) {
          setCurrentTime(newStart);
        }
        return newStart;
      });
      setEndTime(newEnd);
    }
  }, [drapPlayback, getDayRange]);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLooping, setIsLooping] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const intervalRef = React.useRef();

  const allowedSpeeds = [0.25, 0.5, 1, 2, 4, 8];
  const handleSpeedChange = () => {
    const currentIdx = allowedSpeeds.indexOf(speed);
    const nextIdx = (currentIdx + 1) % allowedSpeeds.length;
    setSpeed(allowedSpeeds[nextIdx]);
  };

  // Playback effect: step through time
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev + stepMs <= endTime) {
          return prev + stepMs;
        } else if (isLooping) {
          return startTime;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 1000 / speed);
    intervalRef.current = interval;
    return () => clearInterval(interval);
  }, [isPlaying, speed, startTime, endTime, isLooping]);

  // Step backward/forward by stepMs
  const handleStepBackward = () => {
    setCurrentTime((prev) => Math.max(startTime, prev - stepMs));
  };
  const handleStepForward = () => {
    setCurrentTime((prev) => Math.min(endTime, prev + stepMs));
  };

  // Find closest data point to currentTime
  const findClosestIndex = (time) => {
    if (drapPlayback.length === 0) return -1;
    let lo = 0, hi = drapPlayback.length - 1, best = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const t = new Date(drapPlayback[mid].requested_time).getTime();
      if (t < time) {
        lo = mid + 1;
      } else if (t > time) {
        hi = mid - 1;
      } else {
        return mid;
      }
      if (Math.abs(t - time) < Math.abs(new Date(drapPlayback[best].requested_time).getTime() - time)) {
        best = mid;
      }
    }
    return best;
  };

  // Update DRAP points on time change
  React.useEffect(() => {
    const idx = findClosestIndex(currentTime);
    if (idx !== -1 && drapPlayback[idx]) {
      dispatch(setDRAPPoints(drapPlayback[idx].points));
    }
  }, [currentTime, drapPlayback, dispatch]);

  // Format time for display
  const formatTime = (ms) => {
    if (!ms) return "--/--/----, --:--:-- --";
    return new Date(ms).toLocaleString();
  };
  
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
    px: 0.5,
    "& .MuiSlider-rail": {
      opacity: 1,
      bgcolor: alpha(darkMode ? "#a78bfa" : "#1976d2", 0.12),
    },
    "& .MuiSlider-track": {
      border: "none",
    },
    "& .MuiSlider-thumb": {
      width: 16,
      height: 16,
      boxShadow: "none",
      border: `2px solid #fff`,
      "&:hover, &.Mui-focusVisible": {
        boxShadow: `0 0 0 6px ${alpha(darkMode ? "#a78bfa" : "#1976d2", 0.16)}`,
      },
      "&.Mui-active": {
        boxShadow: `0 0 0 8px ${alpha(darkMode ? "#a78bfa" : "#1976d2", 0.2)}`,
      },
    },
  };
  const disabled = drapPlayback.length === 0;
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
        <Stack spacing={0.2}>
          <Slider
            value={currentTime ?? 0}
            min={startTime ?? 0}
            max={endTime ?? 0}
            step={stepMs}
            onChange={(_, value) => {
              if (typeof value === "number") setCurrentTime(value);
            }}
            aria-label="Playback time"
            disabled={startTime === null || endTime === null}
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

            <Tooltip title={"Return to Live Stream Mode"} placement="top">
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
