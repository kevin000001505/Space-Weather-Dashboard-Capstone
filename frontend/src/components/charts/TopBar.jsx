import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { useSelector, useDispatch } from "react-redux";
import DateTimeViewer from "../ui/DateTimeViewer";
import { toggleSidebar } from "../../store/slices/sidebarSlice";
import { useNavigate } from "react-router-dom";

const TopBar = () => {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.ui.darkMode);
  const navigate = useNavigate();
  const btnStyle = {
    width: "68px",
    height: "68px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "0px",
    border: "1.5px solid rgba(255,255,255,0.25)",
    fontSize: "20px",
    backdropFilter: "blur(12px) saturate(1.4)",
    color: darkMode ? "#f7f7fa" : "#f0f0f0",
    backgroundColor: darkMode ? "#000000" : "#1976d2",

    boxShadow: "0 6px 32px 0 rgba(0,0,0,0.28), 0 0 32px 6px #a78bfa44",
    "&:hover": {
      backgroundColor: darkMode ? "#2a2d34" : "#0266ca",
    },
  };
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: 68,
        backgroundColor: darkMode ? "#000" : "#1976d2",
        color: "#f7f7fa",
        borderBottom: `1px solid ${darkMode ? "#333" : "#ddd"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pl: 3,
        pr: 0,
        zIndex: 1000,
        boxShadow: darkMode ? "0 2px 8px #111" : "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: "20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
        onClick={() => navigate("/")}
      >
        <img
          src={"/favicon.svg"}
          alt="App Icon"
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "14px",
            background: darkMode
              ? "#18181b"
              : "linear-gradient(135deg, #e3e8ee 0%, #f7fafc 100%)",
            boxShadow: darkMode
              ? "0 2px 12px 0 rgba(167, 139, 250, 0.18)"
              : "0 2px 12px 0 rgba(25, 118, 210, 0.13)",
            padding: "6px",
            transition: "box-shadow 0.2s",
          }}
        />
        Space Weather
      </Typography>
      <DateTimeViewer />
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <IconButton
          onClick={() =>
            dispatch({ type: "ui/setDarkMode", payload: !darkMode })
          }
          sx={{
            ...btnStyle,
          }}
          disableRipple
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? "🌙" : "☀️"}
        </IconButton>
        <IconButton
          onClick={() => dispatch(toggleSidebar(true))}
          sx={{
            ...btnStyle,
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
