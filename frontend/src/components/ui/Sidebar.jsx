import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
} from "@mui/material";

import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../store/slices/sidebarSlice";
import { NOAAScales } from "./NOAAScales";
import { useNavigate, useLocation } from "react-router-dom";
import "./styles/Sidebar.css";
import { useEffect } from "react";
import { fetchNoAAScales } from "../../api/api";

const drawerWidth = 320;

export const Sidebar = () => {
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const darkMode = useSelector((state) => state.ui.darkMode);
  const noaaScales = useSelector((state) => state.sidebar.noaaScales);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSidebar = (value) => {
    dispatch(toggleSidebar(value));
  };

  useEffect(() => {
    dispatch(fetchNoAAScales());
  },[]);
  const menuItems = [
    { text: "Dashboard", icon: <HomeIcon />, path: "/" },
    { text: "Analytics", icon: <DashboardIcon />, path: "/charts" },
  ];
  const bottomMenuItems = [
    { text: "Help", icon: <HelpOutlineIcon />, path: "/help" },
    { text: "About Us", icon: <InfoOutlinedIcon />, path: "/about" },
  ];

  const drawerContent = (
    <Box
      className={`sidebar-drawer${darkMode ? " sidebar-dark" : ""}`}
      sx={{ width: drawerWidth }}
      role="presentation"
    >
      <div className="sidebar-app-header">
        <img src={"/favicon.svg"} alt="App Icon" className="sidebar-app-icon" />
        <div className="sidebar-app-title-group">
          <span className="sidebar-app-name">Space Weather</span>
          <span className="sidebar-app-dashboard">Dashboard</span>
        </div>
      </div>
      {/* NOAA Scales Visualization */}
      <Divider
        variant="middle"
        flexItem
        sx={{ height: "1px", borderColor: "#333" }}
      />
      <List className="sidebar-list">
        {menuItems.map((item, index) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={index} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  handleSidebar(false);
                }}
                className={isSelected ? "sidebar-menu-selected" : ""}
                selected={isSelected}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider
        variant="middle"
        flexItem
        sx={{ height: "1px", borderColor: "#333" }}
      />

      <NOAAScales data={noaaScales} />
      <List className="sidebar-list sidebar-bottom-list">
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              navigate("/tutorial");
              handleSidebar(false);
            }}
            className={`sidebar-tutorial ${location.pathname === "/tutorial" ? "sidebar-menu-selected" : ""}`}
            selected={location.pathname === "/tutorial"}
          >
            <ListItemIcon><HelpOutlineIcon /></ListItemIcon>
            <ListItemText primary="Tutorial" />
          </ListItemButton>
        </ListItem>
      </List>
      <List className="sidebar-list sidebar-bottom-list sidebar-tutorial-list">
        {bottomMenuItems.map((item, index) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={index} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  handleSidebar(false);
                }}
                className={isSelected ? "sidebar-menu-selected" : ""}
                selected={isSelected}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        anchor="right"
        open={isSidebarOpen}
        onClose={() => handleSidebar(false)}
        PaperProps={{
          className: `sidebar-drawer ${darkMode ? "sidebar-dark" : ""}`,
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};
