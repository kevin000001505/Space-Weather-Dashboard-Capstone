import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton
} from "@mui/material";


import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../store/slices/planesSlice";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { useEffect } from "react";

const drawerWidth = 280;

export const Sidebar = () => {
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector(state => state.planes.isSidebarOpen);
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigate = useNavigate();

  // Set CSS variables for sidebar theme
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.style.setProperty('--sidebar-bg', 'linear-gradient(135deg, #232526 0%, #414345 100%)');
      root.style.setProperty('--sidebar-color', '#fff');
      root.style.setProperty('--sidebar-icon', '#90caf9');
      root.style.setProperty('--sidebar-hover', 'rgba(255,255,255,0.08)');
    } else {
      root.style.setProperty('--sidebar-bg', 'linear-gradient(135deg, #f7fafc 0%, #e3e8ee 100%)');
      root.style.setProperty('--sidebar-color', '#232526');
      root.style.setProperty('--sidebar-icon', '#1976d2');
      root.style.setProperty('--sidebar-hover', 'rgba(25, 118, 210, 0.08)');
    }
  }, [darkMode]);

  const handleSidebar = (value) => {
    dispatch(toggleSidebar(value));
  };

  const menuItems = [
    { text: "Dashboard", icon: <HomeIcon />, path: "/" },
    { text: "Analytics", icon: <DashboardIcon />, path: "/charts" }
  ];

  const drawerContent = (
    <Box className="sidebar-drawer" sx={{ width: drawerWidth }} role="presentation">
      <Box className="sidebar-header">
        <IconButton onClick={() => handleSidebar(false)}>
          <CloseIcon sx={{ color: 'var(--sidebar-icon)' }} />
        </IconButton>
      </Box>
      <List className="sidebar-list">
        {menuItems.map((item, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                handleSidebar(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        anchor="right"
        open={isSidebarOpen}
        onClose={() => handleSidebar(false)}
        PaperProps={{ className: "sidebar-drawer" }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}