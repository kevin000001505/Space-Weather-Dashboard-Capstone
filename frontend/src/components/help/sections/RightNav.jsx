import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { RIGHT_SIDEBAR_WIDTH, TOPBAR_HEIGHT } from "../helpers/constants";
import { setActiveAnchor } from "../../../store/slices/helpSlice";
import { useDispatch, useSelector } from "react-redux";

export default function RightContentsNav({ sections }) {
  const dispatch = useDispatch();
  const { activeAnchor } = useSelector((state) => state.help);
  const { darkMode } = useSelector((state) => state.ui);

  const handleNavigate = (id) => {
    const node = document.getElementById(id);
    if (!node) return;
    dispatch(setActiveAnchor(id));
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box
      component="aside"
      sx={(theme) => ({
        position: "sticky",
        top: `${TOPBAR_HEIGHT}px`,
        height: `calc(100vh - ${TOPBAR_HEIGHT + 6}px)`,
        overflowY: "auto",
        pl: 2,
        pt: 2,
        minWidth: RIGHT_SIDEBAR_WIDTH,
        borderLeft: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        Contents
      </Typography>
      <List disablePadding sx={{ mt: 1 }}>
        {sections.map((entry) => (
          <ListItemButton
            key={entry.id}
            onClick={() => handleNavigate(entry.id)}
            sx={(theme) => ({
              minHeight: 34,
              borderRadius: 2,
              pl: entry.level === 3 ? 2.5 : 1,
              pr: 1,
              mb: 0.25,
              alignItems: "flex-start",
              color:
                activeAnchor === entry.id
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,
              backgroundColor:
                activeAnchor === entry.id
                  ? alpha(
                      theme.palette.primary.main,
                      darkMode ? 0.14 : 0.08,
                    )
                  : "transparent",
              "&:hover": {
                backgroundColor:
                  activeAnchor === entry.id
                    ? alpha(
                        theme.palette.primary.main,
                        darkMode ? 0.18 : 0.12,
                      )
                    : theme.palette.action.hover,
              },
            })}
          >
            <ListItemText
              primary={entry.title}
              primaryTypographyProps={{
                fontSize: entry.level === 3 ? 14 : 16,
                fontWeight: activeAnchor === entry.id ? 700 : 500,
                lineHeight: 1.4,
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
