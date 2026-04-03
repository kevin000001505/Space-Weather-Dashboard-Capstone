import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { TOTAL_SECTIONS, TRANSITION_MS } from "./constants";
import {
  MissionSection,
  TeamSection,
  SectionFade,
  ProgressDots,
} from "./sections";
import { toggleSidebar } from "../../store/slices/sidebarSlice";
import MenuIcon from "@mui/icons-material/Menu";
import { useDispatch } from "react-redux";

const SECTIONS = [
  { id: "mission", Component: MissionSection },
  { id: "team", Component: TeamSection },
];

function AboutPage() {
  const dispatch = useDispatch(); 
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);

  const lockRef = useRef(false);
  const touchStartY = useRef(null);

  const goTo = useCallback(
    (targetIdx) => {
      if (lockRef.current || targetIdx === currentIdx) return;
      if (targetIdx < 0 || targetIdx >= TOTAL_SECTIONS) return;

      lockRef.current = true;
      setPrevIdx(currentIdx);
      setCurrentIdx(targetIdx);

      setTimeout(() => {
        setPrevIdx(null);
        lockRef.current = false;
      }, TRANSITION_MS + 60);
    },
    [currentIdx],
  );

  const goNext = useCallback(() => goTo(currentIdx + 1), [currentIdx, goTo]);
  const goPrev = useCallback(() => goTo(currentIdx - 1), [currentIdx, goTo]);

  // Handle Scrollytelling
  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault();
      if (lockRef.current) return;
      if (e.deltaY > 8) goNext();
      else if (e.deltaY < -8) goPrev();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goNext, goPrev]);

  // Handle Scrollytelling - For Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (["ArrowDown", "PageDown", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        goNext();
      } else if (["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const PrevComp = prevIdx !== null ? SECTIONS[prevIdx].Component : null;
  const CurrentComp = SECTIONS[currentIdx].Component;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#010205",
        overflow: "hidden",
      }}
    >
      {/* Outgoing section — fades to 0 then unmounts */}
      {PrevComp && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: 0,
            transition: `opacity ${Math.round(TRANSITION_MS * 0.55)}ms ease`,
          }}
        >
          <PrevComp />
        </Box>
      )}

      <SectionFade key={currentIdx} zIndex={2}>
        <CurrentComp />
      </SectionFade>

      <ProgressDots
        current={currentIdx}
        total={TOTAL_SECTIONS}
        onDotClick={goTo}
      />

      {currentIdx === 0 && (
        <Box
          sx={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            animation: "floatHint 2.4s ease-in-out infinite",
            "@keyframes floatHint": {
              "0%,100%": { transform: "translateX(-50%) translateY(0)" },
              "50%": { transform: "translateX(-50%) translateY(-6px)" },
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.18em",
              color: "rgba(120,180,255,0.4)",
              textTransform: "uppercase",
            }}
          >
            Scroll
          </Typography>
          <Box
            sx={{
              width: 1,
              height: 28,
              backgroundColor: "rgba(120,180,255,0.25)",
              borderRadius: 1,
              overflow: "hidden",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "40%",
                background:
                  "linear-gradient(to bottom, rgba(120,180,255,0.7), rgba(120,180,255,0))",
                borderRadius: 1,
                animation: "drip 2.4s ease-in-out infinite",
              },
              "@keyframes drip": {
                "0%": { transform: "translateY(0)", opacity: 1 },
                "100%": { transform: "translateY(10px)", opacity: 0 },
              },
            }}
          />
        </Box>
      )}

      <Tooltip title="Toggle Sidebar" placement="bottom">
        <IconButton
          onClick={() => dispatch(toggleSidebar(true))}
          sx={{
            position: "fixed",
            top: 16,
            left: 16,
            width: "45px",
            height: "45px",
            border: `2px solid ${"#1976d2"}`,
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
            zIndex: 400,
          }}
        >
          <MenuIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default AboutPage;
