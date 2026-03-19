import React from "react";
import { Box, Typography, Card, CardContent, Skeleton } from "@mui/material";

const TICK_COUNT = 12; // More ticks for a more chart-like look
const CHART_HEIGHT = 600; // Match your chart height (adjust as needed)
const BAR_TOP = 80; // px from top of chart area
const BAR_HEIGHT = 14;
const TICK_SIZE = 14;
const TICK_OFFSET = 18; // px below bar

const ChartLoader = ({ darkMode, height = CHART_HEIGHT }) => {
  return (
    <Card
      sx={{
        width: "100%",
        minHeight: height,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: darkMode ? "#23272e" : "#f7f7fa",
        borderRadius: 2,
        boxShadow: 3,
        p: 2,
      }}
    >
      <CardContent
        sx={{
          width: "100%",
          p: 0,
          height: "100%",
          borderRadius: 1,
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            height: "100%",
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "5%",
              height: "100%",
              gap: 0.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                height: "90%",
              }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  animation="wave"
                  sx={{ width: "24px", height: "48px" }}
                />
              ))}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                height: "10%",
              }}
            ></Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "90%",
              height: "100%",
              gap: 0.5,
            }}
          >
            <Skeleton
              variant="rectangular"
              animation="wave"
              sx={{ width: "100%", height: "90%" }}
            />
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                height: "10%",
              }}
            >
              {Array.from({ length: TICK_COUNT }).map((_, i) => (
                <Skeleton
                  key={`tick-${i}`}
                  variant="rectangular"
                  animation="wave"
                  sx={{ width: "48px", height: "24px" }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChartLoader;
