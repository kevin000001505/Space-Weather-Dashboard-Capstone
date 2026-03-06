import React, { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../store/slices/planesSlice";
import FilterPanel from "./FilterPanel";

const drawerWidth = 280;

export const Sidebar = () => {
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector(state => state.planes.isSidebarOpen);

  const handleSidebar = (value) => {
    console.log(value);
    dispatch(toggleSidebar(value))
  }

  const drawerContent = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
        <IconButton onClick={() => handleSidebar(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      <List>
        {[
          { text: "Dashboard", icon: <HomeIcon /> },
          { text: "Charts", icon: <DashboardIcon /> }
        ].map((item, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton>
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
      >
        {drawerContent}
      </Drawer>

    </>
  );
}