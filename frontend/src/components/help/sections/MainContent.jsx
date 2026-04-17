import { TOPBAR_HEIGHT, getHelpGroupForTopic } from "../helpers/constants";
import FlightIcon from "@mui/icons-material/Flight";
import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSelector } from "react-redux";

const mediaComponentRegistry = {
  headingIndicatorPreview: () => (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 2,
        borderRadius: 3,
        borderColor: theme.palette.divider,
        backgroundColor:
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.03)"
            : "rgba(15, 23, 42, 0.02)",
      })}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "center" }}
      >
        <Box
          sx={(theme) => ({
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            border: `1px solid ${theme.palette.divider}`,
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(249, 115, 22, 0.16))"
                : "linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(249, 115, 22, 0.1))",
          })}
        >
          <FlightIcon
            sx={{
              fontSize: 32,
              color: "primary.main",
              transform: "rotate(40deg)",
            }}
          />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Heading Indicator
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            The aircraft icon rotates to match its current heading.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  ),
};

const MainContent = ({ article }) => {
  const activeTopic = useSelector((state) => state.help.activeTopic);

  const renderMedia = (entry) => {
    const MediaComponent = entry.componentKey
      ? mediaComponentRegistry[entry.componentKey]
      : null;

    if (!entry.image && !MediaComponent) {
      return null;
    }

    return (
      <Stack spacing={2} sx={{ mb: 2.25 }}>
        {entry.image && (
          <Box
            sx={{
              display: "flex",
              justifyContent:
                entry.image.align === "center"
                  ? "center"
                  : entry.image.align === "right"
                    ? "flex-end"
                    : "flex-start",
            }}
          >
            <Box
              component="img"
              src={entry.image.src}
              alt={entry.image.alt}
              loading="lazy"
              sx={(theme) => ({
                width: entry.image.width || "100%",
                maxWidth: entry.image.maxWidth || "100%",
                display: "block",
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[1],
                objectFit: "cover",
              })}
            />
          </Box>
        )}

        {entry.image?.caption && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {entry.image.caption}
          </Typography>
        )}

        {MediaComponent && <MediaComponent />}
      </Stack>
    );
  };

  const renderBody = (body, prefix) => {
    const paragraphs = Array.isArray(body) ? body : body ? [body] : [];

    return (
      <Stack spacing={2}>
        {paragraphs.map((paragraph, index) => (
          <Typography
            key={`${prefix}-p-${index}`}
            variant="body1"
            sx={{ color: "text.secondary", maxWidth: "72ch" }}
          >
            {paragraph}
          </Typography>
        ))}
      </Stack>
    );
  };

  const hasMedia = (entry) => Boolean(entry?.image || entry?.componentKey);

  const getInlineDirection = (entry) => {
    const side = entry.side === "right" ? "right" : "left";
    return side === "right"
      ? { xs: "column", md: "row-reverse" }
      : { xs: "column", md: "row" };
  };

  const getInlineMediaWidth = (entry) => {
    if (typeof entry?.image?.width === "number") {
      return entry.image.width;
    }

    return 360;
  };

  const renderEntryContent = (entry, prefix) => {
    const layout = entry.layout === "inline" ? "inline" : "stack";

    if (layout === "inline" && hasMedia(entry)) {
      const mediaWidth = getInlineMediaWidth(entry);

      return (
        <Stack
          direction={getInlineDirection(entry)}
          spacing={3}
          alignItems="flex-start"
        >
          <Box
            sx={{
              flex: { md: `0 0 ${mediaWidth}px` },
              width: { xs: "100%", md: mediaWidth },
              maxWidth: "100%",
            }}
          >
            {renderMedia(entry)}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {renderBody(entry.body, prefix)}
          </Box>
        </Stack>
      );
    }

    return (
      <Stack spacing={2.25}>
        {renderMedia(entry)}
        {renderBody(entry.body, prefix)}
      </Stack>
    );
  };

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
          Help / {getHelpGroupForTopic(activeTopic)} / {article.title}
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
              {renderEntryContent(section, section.id)}

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
                    <Typography variant="h3" sx={{ mb: 1.15, color: "text.secondary" }}>
                      {subsection.title}
                    </Typography>
                    {renderEntryContent(subsection, subsection.id)}
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
