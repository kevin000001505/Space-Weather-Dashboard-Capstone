import { Box, List, ListItemButton, ListItemText } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { alpha } from "@mui/material/styles";
import { Collapse } from "@mui/material";
import {
  helpNav,
  LEFT_SIDEBAR_WIDTH,
  TOPBAR_HEIGHT,
} from "../helpers/constants";
import { setActiveTopic, setOpenGroups } from "../../../store/slices/helpSlice";
import { useDispatch, useSelector } from "react-redux";

export default function LeftTopicsNav({
}) {
  const dispatch = useDispatch();
  const { openGroups, activeTopic } = useSelector((state) => state.help);
  const toggleGroup = (label) => {
    dispatch(setOpenGroups({ ...openGroups, [label]: !openGroups[label] }));
  };

  const handleTopicSelect = (topic) => {
    dispatch(setActiveTopic(topic));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box
      component="nav"
      sx={(theme) => ({
        height: `calc(100vh - ${TOPBAR_HEIGHT + 6}px)`,
        overflowY: "auto",
        position: "sticky",
        top: `${TOPBAR_HEIGHT}px`,
        borderRight: `1px solid ${theme.palette.divider}`,
        minWidth: LEFT_SIDEBAR_WIDTH,
      })}
    >
      <List dense disablePadding sx={{ py: 2 }}>
        {helpNav.map((group) => {
          const expanded = openGroups[group.label];
          return (
            <Box key={group.label} sx={{ px: 1.5, pb: 0.75 }}>
              <ListItemButton
                onClick={() => toggleGroup(group.label)}
                sx={{
                  minHeight: 40,
                  borderRadius: 2,
                  px: 1.25,
                  color: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    color: "text.primary",
                  },
                }}
              >
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                />
                {expanded ? (
                  <ExpandLess fontSize="medium" />
                ) : (
                  <ExpandMore fontSize="medium" />
                )}
              </ListItemButton>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <List disablePadding sx={{ mt: 0.5 }}>
                  {group.items.map((item) => {
                    const selected = activeTopic === item;
                    return (
                      <ListItemButton
                        key={item}
                        selected={selected}
                        onClick={() => handleTopicSelect(item)}
                        sx={(theme) => ({
                          minHeight: 36,
                          ml: 1,
                          my: 0.25,
                          borderRadius: 2,
                          pl: 2.5,
                          color: selected
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary,
                          backgroundColor: selected
                            ? alpha(
                                theme.palette.primary.main,
                                theme.palette.mode === "dark" ? 0.16 : 0.1,
                              )
                            : "transparent",
                          "& .MuiListItemText-primary": {
                            fontSize: 14,
                            fontWeight: selected ? 700 : 500,
                            letterSpacing: "-0.01em",
                          },
                          "&:hover": {
                            backgroundColor: selected
                              ? alpha(
                                  theme.palette.primary.main,
                                  theme.palette.mode === "dark" ? 0.22 : 0.14,
                                )
                              : theme.palette.action.hover,
                          },
                          "&.Mui-selected": {
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              theme.palette.mode === "dark" ? 0.16 : 0.1,
                            ),
                          },
                          "&.Mui-selected:hover": {
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              theme.palette.mode === "dark" ? 0.22 : 0.14,
                            ),
                          },
                        })}
                      >
                        <ListItemText primary={item} />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
