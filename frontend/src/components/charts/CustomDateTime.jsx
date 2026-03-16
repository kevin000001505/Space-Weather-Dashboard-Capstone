import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

const buttonSx = (darkMode) => ({
  fontWeight: "bold",
  fontSize: 13,
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
  background: darkMode ? "#23272e" : "#fff",
  borderRadius: 1,
  border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
});

const CustomDateTime = ({
  value = "3days",
  onChange,
  disabled = false,
  darkMode = false,
}) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    size="small"
    sx={groupSx(darkMode)}
    onChange={(e, newValue) => {
      if (newValue && onChange) onChange(newValue);
    }}
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
    {/* <ToggleButton value="custom" sx={buttonSx(darkMode)}>Custom</ToggleButton> */}
  </ToggleButtonGroup>
);

export default CustomDateTime;
