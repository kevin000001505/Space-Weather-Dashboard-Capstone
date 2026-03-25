import React, { useRef } from "react";
import { ChartRefsContext } from "./ui/DownloadPanel";
import ChartsTabBar from "./ChartsTabBar";
import ChartsTabContent from "./ChartsTabContent";

const ChartsTabs = () => {
  const kpChartRef = useRef();
  const xrayChartRef = useRef();
  const protonChartRef = useRef();
  return (
    <ChartRefsContext.Provider
      value={{ kp: kpChartRef, xray: xrayChartRef, proton: protonChartRef }}
    >
      <ChartsTabBar />
      <ChartsTabContent
        kpChartRef={kpChartRef}
        xrayChartRef={xrayChartRef}
        protonChartRef={protonChartRef}
      />
    </ChartRefsContext.Provider>
  );
};

export default ChartsTabs;
