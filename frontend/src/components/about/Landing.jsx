import { Box } from "@mui/material";
import { MissionSection } from "./sections";

function LandingPage() {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#010205",
        overflow: "hidden",
      }}
    >
      <MissionSection />
    </Box>
  );
}

export default LandingPage;