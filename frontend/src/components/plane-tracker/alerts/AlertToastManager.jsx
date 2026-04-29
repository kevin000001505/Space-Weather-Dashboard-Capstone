import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Box, IconButton, Typography, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  consumePendingToasts,
  markAsRead,
  openHistory,
} from "../../../store/slices/alertsSlice";

const TOAST_DURATION_MS = 15000;
const MAX_VISIBLE_TOASTS = 3;

const TYPE_COLORS = {
  ALERT: "#d32f2f",
  WARNING: "#f57c00",
  WATCH: "#fbc02d",
  SUMMARY: "#1976d2",
};

function AlertToastBody({ alert, t, onManualDismiss, onOpenHistory }) {
  const parsed = alert.parsed_message || {};
  const type = parsed.type || "ALERT";
  const subject = parsed.subject || "Space weather alert";
  const chipColor = TYPE_COLORS[type] || "#555";

  return (
    <Box
      sx={{
        minWidth: 320,
        maxWidth: 420,
        backgroundColor: "#181820",
        color: "#fff",
        border: `1px solid ${chipColor}`,
        borderLeftWidth: 4,
        borderRadius: 1,
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        px: 1.5,
        py: 1,
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        cursor: "pointer",
      }}
      onClick={onOpenHistory}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Chip
            label={type}
            size="small"
            sx={{
              backgroundColor: chipColor,
              color: "#fff",
              fontWeight: 600,
              height: 18,
              fontSize: "0.65rem",
            }}
          />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
            New
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {subject}
        </Typography>
      </Box>
      <IconButton
        size="small"
        aria-label="dismiss alert"
        onClick={(e) => {
          e.stopPropagation();
          onManualDismiss();
          toast.dismiss(t.id);
        }}
        sx={{ color: "rgba(255,255,255,0.7)", p: 0.5 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default function AlertToastManager() {
  const dispatch = useDispatch();
  const pendingIds = useSelector((state) => state.alerts.pendingToastIds);
  const alertsById = useSelector((state) => state.alerts.alerts);

  useEffect(() => {
    if (pendingIds.length === 0) return;

    const idToAlert = new Map(alertsById.map((a) => [a.id, a]));
    const toShow = pendingIds.slice(0, MAX_VISIBLE_TOASTS);
    const overflow = pendingIds.length - toShow.length;

    for (const id of toShow) {
      const alert = idToAlert.get(id);
      if (!alert) continue;
      toast.custom(
        (t) => (
          <AlertToastBody
            alert={alert}
            t={t}
            onManualDismiss={() => dispatch(markAsRead())}
            onOpenHistory={() => {
              dispatch(openHistory());
              toast.dismiss(t.id);
            }}
          />
        ),
        { id, duration: TOAST_DURATION_MS },
      );
    }

    if (overflow > 0) {
      toast.custom(
        (t) => (
          <Box
            sx={{
              backgroundColor: "#181820",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 1,
              px: 1.5,
              py: 1,
              cursor: "pointer",
            }}
            onClick={() => {
              dispatch(openHistory());
              toast.dismiss(t.id);
            }}
          >
            <Typography variant="body2">+{overflow} more new alerts</Typography>
          </Box>
        ),
        { id: "alerts-overflow", duration: TOAST_DURATION_MS },
      );
    }

    dispatch(consumePendingToasts(pendingIds));
  }, [pendingIds, alertsById, dispatch]);

  return null;
}
