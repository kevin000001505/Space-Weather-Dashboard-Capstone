import React, { useEffect, useState, useCallback } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import {
  TRANSITION_MS,
  CARD_STAGGER_DELAY_MS,
  TOTAL_SECTIONS,
} from "./constants";
import CinematicBackground from "./CinematicBackground";
import ParticleFieldCanvas from "./ParticleFieldCanvas";
import PersonCard from "./PersonCard";
import { SUPERVISORS, DEVELOPERS } from "./constants";
import { useNavigate } from "react-router-dom";
import { toggleSidebar } from "../../store/slices/sidebarSlice";
import { useDispatch } from "react-redux";
import MenuIcon from "@mui/icons-material/Menu";

export function ProgressDots({ current, total, onDotClick }) {
  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 12, md: 28 },
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        alignItems: "center",
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <Box
          key={i}
          onClick={() => onDotClick(i)}
          sx={{
            width: i === current ? 8 : 5,
            height: i === current ? 24 : 5,
            borderRadius: "4px",
            backgroundColor:
              i === current
                ? "rgba(120,200,255,0.95)"
                : "rgba(120,200,255,0.25)",
            cursor: "pointer",
            transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
            boxShadow:
              i === current ? "0 0 10px rgba(100,180,255,0.5)" : "none",
            "&:hover": {
              backgroundColor: "rgba(120,200,255,0.6)",
            },
          }}
        />
      ))}
    </Box>
  );
}

export function MissionSection() {
  const navigate = useNavigate();
  const [booted, setBooted] = React.useState(false);
  useEffect(() => {
    const id = setTimeout(() => setBooted(true), 120);
    return () => clearTimeout(id);
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <CinematicBackground />

      {/* Boot overlay — lifts on mount to reveal the scene */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          background: "#010205",
          opacity: booted ? 0 : 1,
          transition: "opacity 1.8s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: "none",
        }}
      />

      {/* Content overlay */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          gap: 6,
          top: "22%",
          left: { xs: "0%", sm: "0%", md: "0%", lg: "45%" },
          zIndex: 5,
          px: { xs: 3, sm: 5, md: 8, lg: 10 },
        }}
      >
        <Box>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.22em",
                color: "rgba(100,200,255,0.75)",
                textTransform: "uppercase",
              }}
            >
              Our Mission
            </Typography>
          </Box>

          {/* Main headline */}
          <Typography
            variant="h1"
            sx={{
              fontFamily: "'Sora', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: { xs: "12px", sm: "16px", md: "20px", lg: "24px" },
              color: "#f0f6ff",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              mb: 3,
            }}
          >
            The Sun is Unpredictable.
            <br />
            <Box
              component="span"
              sx={{
                background:
                  "linear-gradient(135deg, #60c8ff 0%, #a78bfa 60%, #f472b6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Your operations don't have to be.
            </Box>
          </Typography>

          {/* Body */}
          <Typography
            sx={{
              fontFamily: "'Inter', sans-serif",
              fontSize: { xs: "12px", md: "14px" },
              color: "rgba(180,210,255,0.72)",
              lineHeight: 1.75,
              maxWidth: 520,
              mb: 2,
            }}
          >
            Space weather events such as geomagnetic storms, solar flares,
            coronal mass ejections, and solar proton events can disrupt
            power-grids infrastructure and aviation navigation, communication,
            and surveillance systems, particularly on high-altitude and polar
            routes.
          </Typography>

          <Typography
            sx={{
              fontFamily: "'Inter', sans-serif",
              fontSize: { xs: "12px", md: "14px" },
              color: "rgba(180,210,255,0.72)",
              lineHeight: 1.75,
              maxWidth: 520,
              mb: 4,
            }}
          >
            Current space-weather products show raw measurements instead of
            aviation- and infrastructure-ready risk insights. Our goal is to
            convert real-time space-weather data into risk indicators and
            operational alerts.
          </Typography>

          {/* CTA Button */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              onClick={() => navigate("/map-dashboard")}
              variant="contained"
              size="large"
              startIcon={<MapRoundedIcon />}
              sx={{
                px: 3.2,
                py: 1.5,
                borderRadius: "16px",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.98rem",
                letterSpacing: "0.02em",
                color: "#f8fbff",
                background:
                  "linear-gradient(135deg, #0ea5e9 0%, #2563eb 55%, #1d4ed8 100%)",
                boxShadow: "0 10px 30px rgba(37, 99, 235, 0.30)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #38bdf8 0%, #2563eb 55%, #1e40af 100%)",
                  boxShadow: "0 16px 38px rgba(37, 99, 235, 0.42)",
                  transform: "translateY(-3px) scale(1.01)",
                  filter: "saturate(1.08)",
                },
              }}
            >
              Explore Map Dashboard
            </Button>

            <Button
              variant="contained"
              onClick={() => navigate("/analytics")}
              size="large"
              startIcon={<InsightsRoundedIcon />}
              sx={{
                px: 3.2,
                py: 1.5,
                borderRadius: "16px",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.98rem",
                letterSpacing: "0.02em",
                color: "#fff7fb",
                background:
                  "linear-gradient(135deg, #ec4899 0%, #db2777 55%, #be185d 100%)",
                boxShadow: "0 10px 30px rgba(219, 39, 119, 0.30)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #f472b6 0%, #db2777 55%, #9d174d 100%)",
                  boxShadow: "0 16px 38px rgba(219, 39, 119, 0.42)",
                  transform: "translateY(-3px) scale(1.01)",
                  filter: "saturate(1.08)",
                },
              }}
            >
              View Analytics Dashboard
            </Button>
          </Stack>
        </Box>
        {/* Stats row */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifySelf: "end",
            alignSelf: "end",
            marginBottom: "80px",
            gap: { xs: 3, md: 4 },
            flexWrap: "wrap",
          }}
        >
          {[
            { value: "NOAA / SWPC", label: "DATA SOURCES" },
            { value: "24 / 7", label: "Live Monitoring" },
            { value: "Multiple", label: "Risk Level Indicators" },
          ].map(({ value, label }) => (
            <Box key={label}>
              <Typography
                sx={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 700,
                  fontSize: { xs: "12px", md: "14px" },
                  color: "#a0d8ff",
                  lineHeight: 1,
                }}
              >
                {value}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  color: "rgba(120,180,255,0.5)",
                  textTransform: "uppercase",
                  mt: 0.5,
                }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export function StaggerCard({ children, index }) {
  const [visible, setVisible] = React.useState(false);
  useEffect(() => {
    const id = setTimeout(
      () => setVisible(true),
      80 + index * CARD_STAGGER_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [index]);
  return (
    <Box
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(14px)",
        transition: `opacity 0.55s ease, transform 0.55s cubic-bezier(0.34,1.20,0.64,1)`,
        height: "100%",
      }}
    >
      {children}
    </Box>
  );
}

export function TeamSection() {
  const dispatch = useDispatch();
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <ParticleFieldCanvas />

      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(to right, transparent, rgba(80,200,160,0.35), rgba(80,160,255,0.25), transparent)",
          zIndex: 1,
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          px: { xs: 2, md: 4, lg: 5 },
          pt: { xs: 1.5, md: 2 },
          pb: { xs: 1.5, md: 2 },
          overflowY: "auto",
          "&::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <Box
          sx={{ textAlign: "center", mb: { xs: 1, md: 1.5 }, width: "100%" }}
        >
          <Typography
            sx={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.22em",
              color: "rgba(100,220,170,0.65)",
              textTransform: "uppercase",
              mb: 1,
            }}
          >
            Research Leadership
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontFamily: "'Sora', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: { xs: "1.4rem", sm: "1.7rem", md: "2.0rem" },
              color: "#e8f4ff",
              lineHeight: 1.15,
            }}
          >
            Project Supervisors
          </Typography>
          <Box
            sx={{
              width: 40,
              height: 2,
              background:
                "linear-gradient(to right, rgba(80,220,160,0.6), rgba(100,200,255,0.4))",
              borderRadius: 1,
              mx: "auto",
              mt: 1.5,
            }}
          />
        </Box>

        {/* Supervisor cards — 3 columns */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: { xs: 1.5, md: 2 },
            width: "100%",
            maxWidth: 1100,
            mb: { xs: 1.5, md: 2 },
          }}
        >
          {SUPERVISORS.map((p, i) => (
            <StaggerCard key={p.id} index={i}>
              <PersonCard person={p} variant="supervisor" />
            </StaggerCard>
          ))}
        </Box>

        {/* Divider with label */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            width: "100%",
            maxWidth: 1100,
            mb: { xs: 1.5, md: 2 },
          }}
        >
          <Box
            sx={{
              flex: 1,
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(100,180,255,0.18))",
            }}
          />
          <Typography
            sx={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "1.25rem",
              letterSpacing: "0.22em",
              color: "rgba(175, 217, 255, 0.8)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Engineering Team
          </Typography>
          <Box
            sx={{
              flex: 1,
              height: "1px",
              background:
                "linear-gradient(to left, transparent, rgba(100,180,255,0.18))",
            }}
          />
        </Box>

        {/* Developer cards — 3×2 grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: { xs: 1.5, md: 2 },
            width: "100%",
            maxWidth: 1100,
          }}
        >
          {DEVELOPERS.map((p, i) => (
            <StaggerCard key={p.id} index={i + 3}>
              <PersonCard person={p} variant="developer" />
            </StaggerCard>
          ))}
        </Box>
      </Box>

      <IconButton
        onClick={() => dispatch(toggleSidebar(true))}
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 300,
          width: "45px",
          height: "45px",
          border: `2px solid #a78bfa`,
          borderRadius: "4px",
          color: `#fff`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          backdropFilter: "blur(6px)",
          background: "rgba(34, 40, 60, 0.35)",
        }}
      >
        <MenuIcon sx={{ fontSize: 28 }} />
      </IconButton>
    </Box>
  );
}

export function SectionFade({ children, zIndex }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Double-rAF: ensure paint with opacity:0 happens first
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex,
        opacity: visible ? 1 : 0,
        transition: `opacity ${TRANSITION_MS}ms cubic-bezier(0.4,0,0.2,1)`,
        willChange: "opacity",
      }}
    >
      {children}
    </Box>
  );
}
