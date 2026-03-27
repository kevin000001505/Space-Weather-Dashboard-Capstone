import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import "./styles/DateTimeViewer.css";
import { setSelectedTimezone } from "../../store/slices/chartsSlice";
import { Button, Menu, MenuItem, TextField } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useAllTimezones } from "../../hooks/useAllTimezones";
const DateTimeViewer = () => {
  const selectedTimezone = useSelector(
    (state) => state.charts.selectedTimezone,
  );
  const darkMode = useSelector((state) => state.ui.darkMode);
  const [dateTime, setDateTime] = useState(new Date());
  const timeZones = useAllTimezones();
  const [tzSearch, setTzSearch] = useState("");
  const [debouncedTzSearch, setDebouncedTzSearch] = useState("");
  const debounceTimeout = useRef();
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  // On mount, set user's timezone if selectedTimezone is 'local' and detected timezone is available
  useEffect(() => {
    if (selectedTimezone === "local" && Array.isArray(timeZones)) {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Only set if user's timezone is in the list
      if (timeZones.some((tz) => tz.value === userTz)) {
        dispatch(setSelectedTimezone(userTz));
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce tzSearch input
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedTzSearch(tzSearch);
    }, 250);
    return () => clearTimeout(debounceTimeout.current);
  }, [tzSearch]);

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

  // Custom MenuList with search bar
  const dispatch = useDispatch();

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
      v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // Format date and time according to selected timezone
  let dateStr, timeStr;
  if (selectedTimezone === "local") {
    const year = dateTime.getFullYear();
    const month = dateTime.toLocaleString(undefined, { month: "long" });
    const day = getOrdinal(dateTime.getDate());
    dateStr = `${day} ${month}, ${year}`;
    timeStr = dateTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } else {
    // Use Intl.DateTimeFormat for other timezones
    const formatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: selectedTimezone,
    });
    const parts = formatter.formatToParts(dateTime);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    dateStr = `${day}${getOrdinal(Number(day)).replace(/\d+/, "")} ${month}, ${year}`;
    timeStr = dateTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: selectedTimezone,
    });
  }

  return (
    <div className="datetime-viewer split">
      <div className={`dtv-box dtv-date ${!darkMode ? "dtv-light" : ""}`}>
        {dateStr}
      </div>
      <div className={`dtv-box dtv-time ${!darkMode ? "dtv-light" : ""}`}>
        {timeStr}
      </div>
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
          color: menuAnchorEl ? (darkMode ? "#7f5cff" : "#fff") : "#fff",
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
            fontSize: 22,
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
              style: { fontSize: 14, color: darkMode ? "#fff" : "#222" },
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
                <span style={{ flex: 1, color: "#aaa", fontSize: "0.95em" }}>
                  {tz.label}
                </span>
                {tz.zoneName && (
                  <span
                    style={{
                      color: "#7f5cff",
                      fontSize: "0.95em",
                      marginLeft: 8,
                    }}
                  >
                    {tz.zoneName}
                  </span>
                )}
                {tz.gmtOffset && (
                  <span
                    style={{ color: "#aaa", fontSize: "0.95em", marginLeft: 8 }}
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
};

export default DateTimeViewer;
