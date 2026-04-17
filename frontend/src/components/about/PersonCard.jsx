import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import {
  CARD_FLIP_DURATION_MS,
  CARD_STAGGER_DELAY_MS,
  CARD_SUPERVISOR_HEIGHT,
  CARD_DEVELOPER_HEIGHT,
} from "./constants";

// ── Inline SVG icons (no external dep) ──────────────────────────────────────
export const GitHubIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    aria-hidden="true"
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export const LinkedInIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    aria-hidden="true"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export const SchoolIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    aria-hidden="true"
  >
    <path d="M12 3 1 8l11 5 9-4.091V16h2V8L12 3zm-7 9.5V17c0 1.657 3.134 3 7 3s7-1.343 7-3v-4.5l-7 3.182-7-3.182z" />
  </svg>
);

export function PersonCard({ person, variant = "supervisor" }) {
  const isSupervisor = variant === "supervisor";
  const [hovered, setHovered] = React.useState(false);
  const descriptionRef = React.useRef(null);

  // Avatar: larger for supervisors
  const avatarSize = isSupervisor ? 88 : 72;

  const scrollDescription = (direction) => {
    const container = descriptionRef.current;

    if (!container) {
      return;
    }

    container.scrollBy({
      top: direction * 120,
      behavior: "smooth",
    });
  };

  return (
    // Outer container — fixed height so grid rows stay uniform.
    // perspective here enables 3D for the child flip.
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        height: isSupervisor ? CARD_SUPERVISOR_HEIGHT : CARD_DEVELOPER_HEIGHT,
        perspective: "1000px",
        cursor: "default",
      }}
    >
      {/* Flip wrapper — the whole card rotates */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: `transform ${CARD_FLIP_DURATION_MS}ms cubic-bezier(0.34,1.10,0.64,1)`,
          transform: hovered ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "rgba(6,14,32,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,200,180,0.15)",
            borderLeft: "2px solid rgba(0,200,180,0.55)",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: "1.125rem",
            px: "1.25rem",
            py: isSupervisor ? "1.375rem" : "1.125rem",
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(0,200,180,0.60)",
              boxShadow:
                "0 0 16px rgba(0,200,180,0.22), inset 0 0 10px rgba(0,0,0,0.5)",
              background: "#0a1a2e",
            }}
          >
            <Box
              component="img"
              src={person.image}
              alt={person.name}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=0d1f3c&color=00c8b4&size=300`;
              }}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                filter: "saturate(0.82) brightness(0.92)",
              }}
            />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontFamily: "'Sora', 'Inter', sans-serif",
                fontWeight: 700,
                fontSize: isSupervisor ? "1.125rem" : "1.0rem", // 18px / 16px
                color: "#ddeeff",
                lineHeight: 1.25,
                mb: "0.375rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {person.name}
            </Typography>

            <Box
              sx={{
                width: "2rem",
                height: "1.5px",
                background:
                  "linear-gradient(to right, rgba(0,200,180,0.7), transparent)",
                mb: "0.375rem",
                borderRadius: "1px",
              }}
            />

            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1rem", // 12px / 11px
                color: "rgba(0,200,180,0.88)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                lineHeight: 1.4,
              }}
            >
              {person.title}
            </Typography>

            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.625rem", // 10px
                color: "rgba(0,200,180,0.28)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                mt: "0.5rem",
              }}
            >
              Hover for bio →
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "rgba(4,18,36,0.94)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(0,200,180,0.22)",
            borderLeft: "2px solid rgba(0,200,180,0.80)",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            px: "1.25rem",
            pt: "1.125rem",
            pb: "1rem",
            gap: "0.75rem",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              mb: "0.75rem",
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: isSupervisor ? 52 : 44,
                height: isSupervisor ? 52 : 44,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1.5px solid rgba(0,200,180,0.50)",
                boxShadow: "0 0 10px rgba(0,200,180,0.18)",
                background: "#0a1a2e",
              }}
            >
              <Box
                component="img"
                src={person.image}
                alt={person.name}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=0d1f3c&color=00c8b4&size=300`;
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  filter: "saturate(0.85) brightness(0.88)",
                }}
              />
            </Box>
            <Typography
              sx={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: isSupervisor ? "1.0rem" : "0.9375rem",
                color: "rgba(0,200,180,0.95)",
                lineHeight: 1.2,
              }}
            >
              {person.name}
            </Typography>
          </Box>

          <Box
            sx={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <Typography
              ref={descriptionRef}
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontSize: isSupervisor ? "0.875rem" : "0.8125rem",
                color: "rgba(190,220,235,0.85)",
                lineHeight: 1.7,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                pr: "2.25rem",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": {
                  display: "none",
                },
              }}
            >
              {person.description}
            </Typography>

            <Box
              sx={{
                position: "absolute",
                top: "50%",
                right: 0,
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                zIndex: 1,
              }}
            >
              <IconButton
                size="small"
                onClick={() => scrollDescription(-1)}
                aria-label="Scroll description up"
                sx={{
                  width: 26,
                  height: 26,
                  border: "1px solid rgba(0,200,180,0.18)",
                  background: "rgba(0,200,180,0.06)",
                  color: "rgba(180,240,232,0.85)",
                  backdropFilter: "blur(8px)",
                  "&:hover": {
                    background: "rgba(0,200,180,0.16)",
                    color: "#d8fff9",
                  },
                }}
              >
                <KeyboardArrowUpRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => scrollDescription(1)}
                aria-label="Scroll description down"
                sx={{
                  width: 26,
                  height: 26,
                  border: "1px solid rgba(0,200,180,0.18)",
                  background: "rgba(0,200,180,0.06)",
                  color: "rgba(180,240,232,0.85)",
                  backdropFilter: "blur(8px)",
                  "&:hover": {
                    background: "rgba(0,200,180,0.16)",
                    color: "#d8fff9",
                  },
                }}
              >
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: "0.625rem",
              mt: "0.875rem",
              alignItems: "center",
            }}
          >
            {person.github && (
              <Box
                component="a"
                href={person.github || "#"}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  px: "0.75rem",
                  py: "0.375rem",
                  borderRadius: "5px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(200,220,240,0.75)",
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: "rgba(255,255,255,0.10)",
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.25)",
                  },
                }}
              >
                <GitHubIcon size={14} />
                GitHub
              </Box>
            )}

            {/* LinkedIn */}
            {person.linkedin && (
              <Box
                component="a"
                href={person.linkedin || "#"}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  px: "0.75rem",
                  py: "0.375rem",
                  borderRadius: "5px",
                  border: "1px solid rgba(0,120,200,0.25)",
                  background: "rgba(0,100,180,0.08)",
                  color: "rgba(100,170,255,0.80)",
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: "rgba(0,100,180,0.20)",
                    color: "#60aaff",
                    borderColor: "rgba(0,150,255,0.45)",
                  },
                }}
              >
                <LinkedInIcon size={14} />
                LinkedIn
              </Box>
            )}

            {person.gmu && (
              <Box
                component="a"
                href={person.gmu || "#"}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  px: "0.75rem",
                  py: "0.375rem",
                  borderRadius: "5px",
                  border: "1px solid rgba(0,200,180,0.25)",
                  background: "rgba(0,200,180,0.08)",
                  color: "rgba(120,235,220,0.85)",
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: "rgba(0,200,180,0.18)",
                    color: "#8ef6ea",
                    borderColor: "rgba(0,200,180,0.45)",
                  },
                }}
              >
                <SchoolIcon size={14} />
                GMU
              </Box>
            )}

            {person.scholar && (
              <Box
                component="a"
                href={person.scholar || "#"}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  px: "0.75rem",
                  py: "0.375rem",
                  borderRadius: "5px",
                  border: "1px solid rgba(245,180,80,0.28)",
                  background: "rgba(245,180,80,0.08)",
                  color: "rgba(255,214,150,0.90)",
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: "rgba(245,180,80,0.16)",
                    color: "#ffe0a8",
                    borderColor: "rgba(245,180,80,0.50)",
                  },
                }}
              >
                <SchoolIcon size={14} />
                Scholar
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default PersonCard;
