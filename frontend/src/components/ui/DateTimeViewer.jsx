import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import "./styles/DateTimeViewer.css";
import { setSelectedTimezone } from "../../store/slices/chartsSlice";
import {
  setDate,
  setTime,
  setLiveStreamMode,
} from "../../store/slices/playbackSlice";
import { Button, Menu, MenuItem, TextField } from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useAllTimezones } from "../../hooks/useAllTimezones";
import {
  createDate,
  formatDate,
  formatTime,
  utcToZonedTime,
} from "./helpers/helper";
import { fetchHistoricalDRAP } from "../../api/api";
import { setDRAPPlayback } from "../../store/slices/drapSlice";

// Memoized DateBox
const DateBox = React.memo(function DateBox({ date, selectedTimezone, darkMode, onOpen, dateBoxRef, onChange, open }) {
  return (
    <div style={{ position: "relative" }}>
      <div
        className={`dtv-box dtv-date ${!darkMode ? "dtv-light" : ""}`}
        style={{ cursor: "pointer" }}
        onClick={onOpen}
        ref={dateBoxRef}
      >
        {formatDate(date, selectedTimezone)}
      </div>
      <DatePicker
        open={open}
        onClose={() => onChange(null)}
        value={date ? createDate(date) : null}
        onChange={onChange}
        slotProps={{
          textField: {
            size: "small",
            sx: { display: "none" },
          },
          desktopPaper: {
            sx: {
              background: "rgba(34, 40, 60, 0.35) !important",
              backdropFilter: "blur(12px) saturate(1.4) !important",
              color: "#e0e0e0 !important",
              fontWeight: 600,
            },
          },
          popper: {
            sx: { zIndex: 1500 },
            anchorEl: dateBoxRef.current,
            placement: "bottom",
            modifiers: [
              { name: "offset", options: { offset: [0, 8] } },
              { name: "flip", enabled: true },
              { name: "preventOverflow", enabled: true },
              { name: "computeStyles", options: { gpuAcceleration: false } },
            ],
          },
        }}
        disableFuture
        disableHighlightToday
        slotPropsPopper={{ placement: "bottom-start" }}
      />
    </div>
  );
});

// Memoized TimeBox
const TimeBox = React.memo(function TimeBox({ date, time, darkMode, onOpen, timeBoxRef, onChange, open }) {
  return (
    <div style={{ position: "relative" }}>
      <div
        className={`dtv-box dtv-time ${!darkMode ? "dtv-light" : ""}`}
        style={{ cursor: "pointer" }}
        onClick={onOpen}
        ref={timeBoxRef}
      >
        {time}
      </div>
      <TimePicker
        open={open}
        onClose={() => onChange(null)}
        value={time ? createDate(`${date}T${time}`) : null}
        onChange={onChange}
        slotProps={{
          textField: {
            size: "small",
            sx: { display: "none" },
          },
          actionBar: {
            actions: [],
          },
          popper: {
            sx: { zIndex: 1500 },
            anchorEl: timeBoxRef?.current,
            placement: "bottom",
            modifiers: [
              { name: "offset", options: { offset: [0, 8] } },
              { name: "flip", enabled: true },
              { name: "preventOverflow", enabled: true },
              { name: "computeStyles", options: { gpuAcceleration: false } },
            ],
          },
        }}
        ampm={false}
        minutesStep={1}
        slotPropsPopper={{ placement: "bottom-start" }}
      />
    </div>
  );
});

const DateTimeViewer = React.forwardRef(function DateTimeViewer(props, ref) {
  const dispatch = useDispatch();

  const selectedTimezone = useSelector((state) => state.charts.selectedTimezone);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const date = useSelector((state) => state.playback.date);
  const time = useSelector((state) => state.playback.time);
  const liveStreamMode = useSelector((state) => state.playback.liveStreamMode);
  const timeZones = useAllTimezones();
  const [tzSearch, setTzSearch] = useState("");
  const [debouncedTzSearch, setDebouncedTzSearch] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const debounceTimeout = useRef();
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const dateBoxRef = useRef(null);
  const timeBoxRef = useRef(null);

  // On mount, set user's timezone if selectedTimezone is 'local' and detected timezone is available
  useEffect(() => {
    if (selectedTimezone === "local" && Array.isArray(timeZones)) {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Only set if user's timezone is in the list
      if (timeZones.some((tz) => tz.value === userTz)) {
        dispatch(setSelectedTimezone(userTz));
      }
    }
  }, [selectedTimezone, timeZones, dispatch]);

  // Debounce tzSearch input
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedTzSearch(tzSearch);
    }, 250);
    return () => clearTimeout(debounceTimeout.current);
  }, [tzSearch]);

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

  useEffect(() => {
    if (!date || liveStreamMode) return;
    // Parse the selected date (YYYY-MM-DD)
    const [year, month, day] = date.split("-").map(Number);
    const fetchAllHours = async () => {
      const promises = [];
      for (let hour = 0; hour < 24; hour++) {
        const start = new Date(year, month - 1, day, hour, 0, 0, 0);
        const end = new Date(year, month - 1, day, hour + 1, 0, 0, 0);
        promises.push(
          dispatch(
            fetchHistoricalDRAP({
              start: start.toISOString(),
              end: end.toISOString(),
              event: "drap",
              interval: 5,
            })
          ).unwrap()
        );
      }
      try {
        const results = await Promise.allSettled(promises);
        // Flatten, filter fulfilled, and merge all data arrays
        const merged = results
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value.data || r.value);

        // Sort by requested_time ascending and filter out duplicates
        const seen = new Set();
        const allData = merged
          .filter(item => {
            if (!item.requested_time) return false;
            if (seen.has(item.requested_time)) return false;
            seen.add(item.requested_time);
            return true;
          })
          .sort((a, b) => new Date(a.requested_time) - new Date(b.requested_time));

        dispatch(setDRAPPlayback(allData));
      } catch (err) {
        console.log(err)
      }
    };
    fetchAllHours();
  }, [date, time, selectedTimezone]);

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

  // Handlers for date/time pickers
  const handleDatePickerOpen = useCallback(() => setDatePickerOpen(true), []);
  const handleTimePickerOpen = useCallback(() => setTimePickerOpen(true), []);
  const handleDateChange = useCallback((newValue) => {
    if (newValue) {
      const iso = newValue.toISOString().split("T")[0];
      dispatch(setLiveStreamMode(false));
      dispatch(setDate(iso));
      dispatch(setTime("00:00:00"));
    }
    setDatePickerOpen(false);
  }, [dispatch]);
  const handleTimeChange = useCallback((newValue) => {
    if (newValue) {
      const t = newValue.toTimeString().split(" ")[0];
      dispatch(setLiveStreamMode(false));
      dispatch(setTime(t));
    }
    setTimePickerOpen(false);
  }, [dispatch]);

  return (
    <div className="datetime-viewer split" ref={ref}>
      <DateBox
        date={date}
        selectedTimezone={selectedTimezone}
        darkMode={darkMode}
        onOpen={handleDatePickerOpen}
        dateBoxRef={dateBoxRef}
        onChange={handleDateChange}
        open={datePickerOpen}
      />
      <TimeBox
        date={date}
        time={time}
        darkMode={darkMode}
        onOpen={handleTimePickerOpen}
        timeBoxRef={timeBoxRef}
        onChange={handleTimeChange}
        open={timePickerOpen}
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
          "&:focus": {
            outline: "none",
            boxShadow: "none",
            border: "1.5px solid #ffd700",
          },
          "&:active": {
            outline: "none",
            boxShadow: "none",
            border: "1.5px solid #ffd700",
          },
        }}
        onClick={(e) => setMenuAnchorEl(e.currentTarget)}
      >
        {timeZones.find((tz) => tz.value === selectedTimezone)?.label ||
          "Select Timezone"}
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
        onClose={() => {
          setMenuAnchorEl(null);
          setTzSearch("");
        }}
        disableAutoFocusItem={true}
        disableRestoreFocus={true}
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
          list: {
            dense: true,
            sx: { p: 0 },
          },
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
            "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline":
              {
                borderColor: darkMode ? "#7f5cff" : "#1976d2",
              },
            "& .MuiInputBase-input::placeholder": {
              color: darkMode ? "#fff" : "#888",
              opacity: 1,
            },
            "&:focus": {
              outline: "none",
              boxShadow: "none",
              border: "1.5px solid rgba(255,255,255,0.25)",
            },
            "&:active": {
              outline: "none",
              boxShadow: "none",
              border: "1.5px solid rgba(255,255,255,0.25)",
            },
          }}
          slotProps={{
            input: {
              style: {
                fontSize: "0.875rem",
                color: darkMode ? "#fff" : "#222",
              },
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
              <span
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <span style={{ flex: 1, color: "#aaa", fontSize: "1.2em" }}>
                  {tz.label}
                </span>
                {tz.zoneName && (
                  <span
                    style={{
                      color: "#7f5cff",
                      fontSize: "1.2em",
                      marginLeft: 8,
                    }}
                  >
                    {tz.zoneName}
                  </span>
                )}
                {tz.gmtOffset && (
                  <span
                    style={{ color: "#aaa", fontSize: "1.2em", marginLeft: 8 }}
                  >
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
