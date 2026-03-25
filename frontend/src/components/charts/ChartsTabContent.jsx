import { Box } from "@mui/material";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import ChartLoader from "./ChartLoader";
import KpIndexChart from "./KpIndexChart";
import XrayFluxChart from "./XrayFluxChart";
import ProtonFluxChart from "./ProtonFluxChart";

const ChartsTabContent = ({kpChartRef, xrayChartRef, protonChartRef}) => {
  const dispatch = useDispatch();   
  const tab = useSelector((state) => state.charts.activeTab);
  const loading = useSelector((state) => state.charts.loading);
  const darkMode = useSelector((state) => state.ui.darkMode);

  return (
    <Box
      padding={6}
      sx={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: darkMode ? "#181a1b" : "#f3f1f1",
        color: darkMode ? "#f7f7fa" : "#181a1b",
        transition: "background-color 0.3s, color 0.3s",
        pt: 20,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {loading ? (
          <ChartLoader darkMode={darkMode} />
        ) : (
          <>
            {tab === 0 && (
              <>
                <KpIndexChart key="all-kp" chartRef={kpChartRef} />
                <XrayFluxChart key="all-xray" chartRef={xrayChartRef} />
                <ProtonFluxChart key="all-proton" chartRef={protonChartRef} />
              </>
            )}
            {tab === 1 && <KpIndexChart key={tab} chartRef={kpChartRef} />}
            {tab === 2 && <XrayFluxChart key={tab} chartRef={xrayChartRef} />}
            {tab === 3 && (
              <ProtonFluxChart key={tab} chartRef={protonChartRef} />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChartsTabContent;
