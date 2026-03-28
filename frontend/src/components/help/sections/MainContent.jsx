import React, { useEffect, useMemo, useRef } from "react";
import { slugify } from "../helpers/helper";
import { TOPBAR_HEIGHT } from "../helpers/constants";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSelector } from "react-redux";

const MainContent = ({ article, flatContents }) => {
  const activeTopic = useSelector((state) => state.help.activeTopic);

  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        maxHeight: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
        overflowY: "auto",
      }}
    >
      <Box
        sx={{
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, sm: 4, md: 5 },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          Help / {slugify(activeTopic).replace(/-/g, " ")}
        </Typography>
        <Typography variant="h1" sx={{ mt: 1.25, mb: 2.5 }}>
          {article.title}
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "text.secondary", maxWidth: "72ch", mb: 4.5 }}
        >
          {article.intro}
        </Typography>

        <Divider sx={{ mb: 4.5 }} />

        <Stack spacing={5.5}>
          {article.sections.map((section) => (
            <Box
              key={section.id}
              id={section.id}
              sx={{ scrollMarginTop: `24px` }}
            >
              <Typography variant="h2" sx={{ mb: 1.75 }}>
                {section.title}
              </Typography>
              <Stack spacing={2}>
                {section.body.map((paragraph, index) => (
                  <Typography
                    key={`${section.id}-p-${index}`}
                    variant="body1"
                    sx={{ color: "text.secondary", maxWidth: "72ch" }}
                  >
                    {paragraph}
                  </Typography>
                ))}
              </Stack>

              {section.list && (
                <Box
                  component="ul"
                  sx={{
                    pl: 2.75,
                    mt: 2.25,
                    color: "text.secondary",
                    "& li": { mb: 1.15, maxWidth: "68ch" },
                  }}
                >
                  {section.list.map((item) => (
                    <li key={item}>
                      <Typography variant="body2" component="span">
                        {item}
                      </Typography>
                    </li>
                  ))}
                </Box>
              )}

              {section.note && (
                <Box
                  sx={(theme) => ({
                    mt: 2.5,
                    p: 2,
                    borderRadius: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.primary.main, 0.04),
                  })}
                >
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {section.note}
                  </Typography>
                </Box>
              )}

              <Stack spacing={3.25} sx={{ mt: 3.25 }}>
                {section.subsections.map((subsection) => (
                  <Box
                    key={subsection.id}
                    id={subsection.id}
                    sx={{ scrollMarginTop: `24px` }}
                  >
                    <Typography variant="h3" sx={{ mb: 1.15 }}>
                      {subsection.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: "text.secondary", maxWidth: "72ch" }}
                    >
                      {subsection.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default MainContent;
