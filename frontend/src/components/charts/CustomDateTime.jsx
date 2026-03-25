import "./mui-dark-datetime.css";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setShowCustomDateDialog,
  setCustomDateTime,
} from "../../store/slices/chartsSlice";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

const buttonSx = (darkMode) => ({
  fontWeight: "bold",
  fontSize: "10px",
  color: darkMode ? "#e0e0e0" : "#222",
  borderColor: darkMode ? "#555" : "#ccc",
  "&.Mui-selected": {
    color: darkMode ? "#fff" : "#111",
    backgroundColor: darkMode ? "#333" : "#e0e0e0",
    borderColor: darkMode ? "#fff" : "#111",
  },
});

const groupSx = (darkMode) => ({
  ml: 1,
  height: "43px",
  background: darkMode ? "#23272e" : "#fff",
  borderRadius: 1,
  border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
});

const CustomDateTime = ({
  value = "3days",
  onChange,
  disabled = false,
  darkMode = false,
  earliest,
  latest,
}) => {
  const dispatch = useDispatch();
  const dialogOpen = useSelector((state) => state.charts.showCustomDateDialog);
  const customdt = useSelector((state) => state.charts.customdt);
  const [error, setError] = React.useState("");
  const [anchorEl, setAnchorEl] = React.useState(null);

  // Set initial values to earliest/latest if not set
  React.useEffect(() => {
    if (dialogOpen && (!customdt.start || !customdt.end)) {
      if (earliest && latest) {
        dispatch(
          setCustomDateTime({ start: earliest, end: latest, range: "custom" }),
        );
      } else {
        const now = new Date();
        dispatch(
          setCustomDateTime({
            start: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            end: now.toISOString(),
            range: "custom",
          }),
        );
      }
    }
  }, [dialogOpen, customdt.start, customdt.end, dispatch, earliest, latest]);

  const handleButtonChange = (e, newValue) => {
    if (e.target.value === "custom" || newValue === "custom") {
      setAnchorEl(e.currentTarget);
      dispatch(setShowCustomDateDialog(true));
    } else if (newValue && onChange) {
      // Set customdt to the preset range, which will update the highlighted button
      onChange(newValue);
    }
  };

  const handlePopoverClose = () => {
    dispatch(setShowCustomDateDialog(false));
    setAnchorEl(null);
    setError("");
  };

  const handlePopoverOk = () => {
    const start = new Date(customdt.start);
    const end = new Date(customdt.end);
    const diffMs = end - start;
    const minMs = 6 * 60 * 60 * 1000;
    const maxMs = 7 * 24 * 60 * 60 * 1000;
    if (diffMs < minMs) {
      setError("Minimum range is 6 hours.");
      return;
    }
    if (diffMs > maxMs) {
      setError("Maximum range is 7 days.");
      return;
    }
    setError("");
    dispatch(setShowCustomDateDialog(false));
    setAnchorEl(null);
    // Always set range to 'custom' and update Redux
    dispatch(
      setCustomDateTime({
        start: start.toISOString(),
        end: end.toISOString(),
        range: "custom",
      }),
    );
    if (onChange) {
      onChange({
        start: start.toISOString(),
        end: end.toISOString(),
        range: "custom",
      });
    }
  };

  return (
    <>
      <ToggleButtonGroup
        value={value}
        exclusive
        size="small"
        sx={groupSx(darkMode)}
        onChange={handleButtonChange}
        disabled={disabled}
      >
        <ToggleButton value="1week" sx={buttonSx(darkMode)}>
          1 week
        </ToggleButton>
        <ToggleButton value="3days" sx={buttonSx(darkMode)}>
          3 days
        </ToggleButton>
        <ToggleButton value="24hours" sx={buttonSx(darkMode)}>
          24 hours
        </ToggleButton>
        <ToggleButton value="6hours" sx={buttonSx(darkMode)}>
          6 hours
        </ToggleButton>
        <ToggleButton value="custom" sx={buttonSx(darkMode)}>
          Custom
        </ToggleButton>
      </ToggleButtonGroup>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Popover
          open={dialogOpen}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          transformOrigin={{ vertical: "top", horizontal: "center" }}
          slotProps={{
            paper: {
              sx: {
                width: { xs: 340, sm: 520 },
                maxWidth: "98vw",
                p: 1,
                mt: 1.5,
                backgroundColor: darkMode ? "#23272e" : "#fff",
                color: darkMode ? "#e0e0e0" : "#181a1b",
                boxShadow: "var(--ui-shadow)",
                border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
                borderRadius: 2,
                position: "relative",
              },
              className: darkMode ? "mui-dark-datetime" : undefined,
            },
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, borderBottom: `1px solid ${darkMode ? "#555" : "#ccc"}`, paddingBottom: 4  }}>
            Custom Date Range
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <DateTimePicker
              label="Start Date & Time"
              value={customdt.start ? new Date(customdt.start) : null}
              maxDateTime={customdt.end ? new Date(customdt.end) : undefined}
              disableHighlightToday
              onChange={(date) =>
                dispatch(
                  setCustomDateTime({
                    ...customdt,
                    start: date ? date.toISOString() : null,
                    range: "custom",
                  }),
                )
              }
              slotProps={{
                actionBar: { actions: [] },
                popper: {
                  
                  className: darkMode ? "mui-dark-datetime-popper" : undefined,
                },
              }}
              renderInput={(params) => (
                <TextField {...params} margin="normal" fullWidth />
              )}
            />
            <DateTimePicker
              label="End Date & Time"
              value={customdt.end ? new Date(customdt.end) : null}
              minDateTime={
                customdt.start ? new Date(customdt.start) : undefined
              }
              disableHighlightToday
              onChange={(date) =>
                dispatch(
                  setCustomDateTime({
                    ...customdt,
                    end: date ? date.toISOString() : null,
                    range: "custom",
                  }),
                )
              }
              slotProps={{
                actionBar: { actions: [] },
                popper: {
                  className: darkMode ? "mui-dark-datetime-popper" : undefined,
                },
              }}
              renderInput={(params) => (
                <TextField {...params} margin="normal" fullWidth />
              )}
            />
          </div>
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        </Popover>
      </LocalizationProvider>
    </>
  );
};

export default CustomDateTime;
