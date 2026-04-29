import { IconButton, Tooltip } from "@mui/material";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import { useDispatch, useSelector } from "react-redux";
import { openHistory } from "../../../store/slices/alertsSlice";

export default function AlertTrayButton() {
  const dispatch = useDispatch();
  const unread = useSelector((state) => state.alerts.unread);
  const isHistoryOpen = useSelector((state) => state.alerts.isHistoryOpen);
  const alertCount = useSelector((state) => state.alerts.alerts.length);

  const handleClick = () => {
    dispatch(openHistory());
  };

  if (isHistoryOpen) return null;

  return (
    <Tooltip
      title={unread ? "New alert!" : `Alerts${alertCount ? ` (${alertCount})` : ""}`}
      placement="right"
    >
      <IconButton
        onClick={handleClick}
        aria-label="open alerts"
        sx={{
          position: "absolute",
          top: "70px",
          left: "20px",
          zIndex: 10,
          width: 40,
          height: 40,
          backgroundColor: unread ? "#d32f2f" : "#000",
          color: "#fff",
          border: unread ? "2px solid #ff8a80" : "1px solid rgba(255,255,255,0.4)",
          boxShadow: unread
            ? "0 0 12px rgba(211,47,47,0.7)"
            : "0 2px 6px rgba(0,0,0,0.4)",
          transition: "background-color 200ms, box-shadow 200ms",
          "&:hover": {
            backgroundColor: unread ? "#b71c1c" : "#222",
          },
        }}
      >
        <PriorityHighIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
