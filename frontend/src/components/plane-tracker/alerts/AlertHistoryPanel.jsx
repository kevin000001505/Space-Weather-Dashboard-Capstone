import { useEffect, useRef, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch, useSelector } from "react-redux";
import {
  closeHistory,
} from "../../../store/slices/alertsSlice";
import { fetchMoreAlerts } from "../../../api/api";
import AlertItem from "./AlertItem";

const SCROLL_TRIGGER_PX = 120;

export default function AlertHistoryPanel() {
  const dispatch = useDispatch();
  const isHistoryOpen = useSelector((state) => state.alerts.isHistoryOpen);
  const alerts = useSelector((state) => state.alerts.alerts);
  const hasMore = useSelector((state) => state.alerts.hasMore);
  const isLoading = useSelector((state) => state.alerts.isLoading);
  const isLoadingMore = useSelector((state) => state.alerts.isLoadingMore);
  const currentDays = useSelector((state) => state.alerts.currentDays);
  const error = useSelector((state) => state.alerts.error);
  const scrollRef = useRef(null);

  const handleClose = () => dispatch(closeHistory());

  const handleScroll = useCallback(
    (e) => {
      if (!hasMore || isLoadingMore || isLoading) return;
      const el = e.currentTarget;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < SCROLL_TRIGGER_PX) {
        dispatch(fetchMoreAlerts());
      }
    },
    [dispatch, hasMore, isLoading, isLoadingMore],
  );

  // Reset scroll position when reopening
  useEffect(() => {
    if (isHistoryOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isHistoryOpen]);

  return (
    <Drawer
      anchor="left"
      open={isHistoryOpen}
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: 400,
          maxWidth: "90vw",
          backgroundColor: "#181820",
          color: "#f0f0f0",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Alerts {alerts.length > 0 && `(${alerts.length})`}
        </Typography>
        <IconButton size="small" onClick={handleClose} aria-label="close alerts" sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1 }}
      >
        {isLoading && alerts.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!isLoading && alerts.length === 0 && (
          <Typography
            variant="body2"
            sx={{ textAlign: "center", py: 6, color: "rgba(255,255,255,0.6)" }}
          >
            {currentDays >= 30
              ? "No alerts in the last 30 days."
              : "No alerts available."}
          </Typography>
        )}

        {alerts.map((alert, idx) => (
          <Box key={alert.id}>
            <AlertItem alert={alert} />
            {idx < alerts.length - 1 && <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />}
          </Box>
        ))}

        {isLoadingMore && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {!hasMore && alerts.length > 0 && (
          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", py: 2, color: "rgba(255,255,255,0.5)" }}
          >
            End of alerts (last 30 days)
          </Typography>
        )}

        {error && (
          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", py: 2, color: "#ff8a80" }}
          >
            {error}
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}
