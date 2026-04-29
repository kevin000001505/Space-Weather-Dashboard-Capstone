import { useState } from "react";
import { Box, Typography, Chip, IconButton, Collapse } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

const TYPE_COLORS = {
  ALERT: "#d32f2f",
  WARNING: "#f57c00",
  WATCH: "#fbc02d",
  SUMMARY: "#1976d2",
};

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
};

export default function AlertItem({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = alert.parsed_message || {};
  const type = parsed.type || "ALERT";
  const subject = parsed.subject || "Space weather alert";
  const fields = parsed.fields || {};
  const fieldEntries = Object.entries(fields);
  const chipColor = TYPE_COLORS[type] || "#555";

  return (
    <Box sx={{ py: 1.25, px: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Chip
          label={type}
          size="small"
          sx={{
            backgroundColor: chipColor,
            color: "#fff",
            fontWeight: 600,
            height: 20,
            fontSize: "0.7rem",
          }}
        />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
          {formatTime(alert.time)}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
        {subject}
      </Typography>

      {fieldEntries.length > 0 && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "2px 8px",
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {fieldEntries.slice(0, expanded ? fieldEntries.length : 3).map(([k, v]) => (
              <Box key={k} sx={{ display: "contents" }}>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}
                >
                  {k.replace(/_/g, " ")}:
                </Typography>
                <Typography variant="caption" sx={{ wordBreak: "break-word" }}>
                  {String(v)}
                </Typography>
              </Box>
            ))}
          </Box>
          {fieldEntries.length > 3 && (
            <IconButton
              size="small"
              onClick={() => setExpanded((v) => !v)}
              sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, p: 0.25 }}
            >
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {expanded ? "less" : `+${fieldEntries.length - 3} more`}
              </Typography>
            </IconButton>
          )}
        </>
      )}

      <Collapse in={expanded}>
        <Typography
          variant="caption"
          component="pre"
          sx={{
            mt: 1,
            p: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: 1,
            color: "rgba(255,255,255,0.7)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "monospace",
            fontSize: "0.7rem",
          }}
        >
          {alert.message}
        </Typography>
      </Collapse>
    </Box>
  );
}
