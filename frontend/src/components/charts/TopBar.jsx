import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { useSelector, useDispatch } from "react-redux";

const TopBar = ({ onToggleSidebar, onToggleDarkMode }) => {
  const darkMode = useSelector((state) => state.ui.darkMode);
  const btnStyle = {
    width: "45px",
    height: "45px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    boxShadow: "var(--ui-shadow)",
    backdropFilter: "blur(4px)",
    backgroundColor: darkMode ? "#23272e" : "#fff",
    border: `1px solid ${darkMode ? "#555" : "#ccc"}`,
    "&:hover": {
      backgroundColor: darkMode ? "#2a2d34" : "#f0f0f0",
    },
  };
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: 64,
        backgroundColor: darkMode ? "#000" : "#f7f7fa",
        color: darkMode ? "#f7f7fa" : "#181a1b",
        borderBottom: `1px solid ${darkMode ? "#333" : "#ddd"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 4,
        zIndex: 1000,
        boxShadow: darkMode ? "0 2px 8px #111" : "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        ANALYTICS DASHBOARD
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton
          onClick={onToggleDarkMode}
          sx={{
            ...btnStyle,
            color: darkMode ? "#f7f7fa" : "#181a1b",
            backgroundColor: darkMode ? "#23272f" : "#e0e0e0",
            mr: 1,
            pt: 0.5,
          }}
          disableRipple
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? "🌙" : "☀️"}
        </IconButton>
        <IconButton
          onClick={onToggleSidebar}
          sx={{
            ...btnStyle,
            color: darkMode ? "#f7f7fa" : "#181a1b",
            backgroundColor: darkMode ? "#23272f" : "#e0e0e0",
          }}
          title="Toggle Sidebar"
        >
          <MenuIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TopBar;
