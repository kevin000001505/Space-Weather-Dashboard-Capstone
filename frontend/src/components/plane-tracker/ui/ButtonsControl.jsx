import React from "react";
import { toggleSidebar } from "../../../store/slices/sidebarSlice";
import { useDispatch, useSelector } from "react-redux";
import { IconButton, SpeedDial, SpeedDialAction, Tooltip } from "@mui/material";
import {
  setDarkMode,
  setGlobeView,
  setShowAirports,
  setShowAltitudeLegend,
  setShowIconLegend,
  setShowPlanes,
  setShowSettings,
  setUseImperial,
  toggleIsolateMode,
} from "../../../store/slices/uiSlice";
import { setShowDRAP } from "../../../store/slices/drapSlice";
import { setShowAurora } from "../../../store/slices/auroraSlice";
import { setShowGeoElectric } from "../../../store/slices/geoElectricSlice";
import AirplanemodeActiveIcon from "@mui/icons-material/AirplanemodeActive";
// import squareA from './A-icon.svg';
import LocationCityIcon from "@mui/icons-material/LocationCity";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import OfflineBoltIcon from "@mui/icons-material/OfflineBolt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import TuneIcon from "@mui/icons-material/Tune";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import PublicIcon from "@mui/icons-material/Public";

import "./styles/ButtonsControl.css";
import { LetterIcon } from "../../ui/LetterIcon";
import { setShowElectricTransmissionLines } from "../../../store/slices/electricTransmissionLinesSlice";
const ButtonsControl = React.forwardRef(function ButtonsControl(
  { settingsRef },
  ref,
) {
  const dispatch = useDispatch();
  const {
    showSettings,
    darkMode,
    showAirports,
    showPlanes,
    isolateMode,
    useImperial,
    globeView,
    showAltitudeLegend,
    showIconLegend,
  } = useSelector((state) => state.ui);
  const { showAurora } = useSelector((state) => state.aurora);
  const { showDRAP } = useSelector((state) => state.drap);
  const { showElectricTransmissionLines } = useSelector(
    (state) => state.electricTransmissionLines,
  );
  const { showGeoElectric } = useSelector((state) => state.geoelectric);
  const btnStyle = {
    width: "45px",
    height: "45px",
    border: `2px solid ${darkMode ? "#a78bfa" : "#1976d2"}`,
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
  };
  const visibilityActions = [
    {
      icon: <AirplanemodeActiveIcon sx={{ fontSize: 28 }} />,
      tooltip: `${showPlanes ? "Hide" : "Show"} Airplanes`,
      onClick: () => dispatch(setShowPlanes(!showPlanes)),
      active: showPlanes,
    },
    {
      icon: <LocationCityIcon sx={{ fontSize: 28 }} />,
      tooltip: `${showAirports ? "Hide" : "Show"} Airports`,
      onClick: () => dispatch(setShowAirports(!showAirports)),
      active: showAirports,
    },
    {
      icon: <SettingsInputAntennaIcon sx={{ fontSize: 28 }} />,
      tooltip: `${showDRAP ? "Hide" : "Show"} DRAP Region`,
      onClick: () => dispatch(setShowDRAP(!showDRAP)),
      active: showDRAP,
    },
    {
      icon: <AutoAwesomeIcon sx={{ fontSize: 28 }} />,
      tooltip: `${showAurora ? "Hide" : "Show"} Aurora`,
      onClick: () => dispatch(setShowAurora(!showAurora)),
      active: showAurora,
    },
    {
      icon: <OfflineBoltIcon sx={{ fontSize: 28 }} />,
      tooltip: `${showGeoElectric ? "Hide" : "Show"} GeoElectric`,
      onClick: () => dispatch(setShowGeoElectric(!showGeoElectric)),
      active: showGeoElectric,
    },
    {
      icon: <SsidChartIcon sx={{ fontSize: 28 }} />,
      tooltip: `${showElectricTransmissionLines ? "Hide" : "Show"} Power Grids`,
      onClick: () =>
        dispatch(
          setShowElectricTransmissionLines(!showElectricTransmissionLines),
        ),
      active: showElectricTransmissionLines,
    },
  ];
  const legendActions = [
    {
      icon: <LetterIcon letter="I" strike={!showIconLegend} />,
      tooltip: `${showIconLegend ? "Hide" : "Show"} Icon Legend`,
      onClick: () => dispatch(setShowIconLegend(!showIconLegend)),
      active: showIconLegend,
    },
    {
      icon: <LetterIcon letter="A" strike={!showAltitudeLegend} />,
      tooltip: `${showAltitudeLegend ? "Hide" : "Show"} Altitude Legend`,
      onClick: () => dispatch(setShowAltitudeLegend(!showAltitudeLegend)),
      active: showAltitudeLegend,
    },
  ];
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        right: "10px",
        top: "10px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", gap: "10px" }}>
        <Tooltip
          title={`${useImperial ? "Switch to Metric  Units (m, m/s)" : "Switch to Imperial  Units (ft, knots) "}`}
          placement="bottom"
        >
          <IconButton
            onClick={() => dispatch(setUseImperial(!useImperial))}
            sx={btnStyle}
          >
            <LetterIcon letter={useImperial ? "F" : "M"} />
          </IconButton>
        </Tooltip>
        <SpeedDial
          ariaLabel="Legend Controls"
          icon={
            <LetterIcon
              letter="L"
              strike={!showAltitudeLegend && !showIconLegend}
            />
          }
          direction="down"
          onClick={() => {
            dispatch(setShowAltitudeLegend(!showAltitudeLegend));
            dispatch(setShowIconLegend(!showIconLegend));
          }}
          FabProps={{
            sx: {
              ...btnStyle,
              background:
                !showAltitudeLegend && !showIconLegend
                  ? "rgba(229,57,53,0.35)"
                  : "rgba(34, 40, 60, 0.35)",
              color: "#fff",
              "&:hover": {
                background:
                  !showAltitudeLegend && !showIconLegend
                    ? "rgba(229,57,53,0.35)"
                    : "rgba(34, 40, 60, 0.35)",
              },
            },
            height: "45px",
            size: "medium",
          }}
          sx={{
            width: "45px",
            height: "45px",
            "& .MuiSpeedDial-actions": {
              marginTop: "-46px",
              backdropFilter: "blur(2px)",
              background: "rgba(34, 40, 60, 0.35)",
            },
            "& .MuiSpeedDial-actionsClosed": {
              backdropFilter: "none",
              background: "none",
            },
          }}
        >
          {legendActions.map((action) => (
            <SpeedDialAction
              key={action.tooltip}
              icon={action.icon}
              slotProps={{
                tooltip: {
                  title: action.tooltip,
                  arrow: true,
                },
                fab: {
                  sx: {
                    ...btnStyle,
                    background: action.active
                      ? "rgba(46,204,64,0.25)"
                      : "rgba(229,57,53,0.25)",
                    backdropFilter: "blur(6px)",
                    color: "#000",
                    border: action.active
                      ? "2px solid #2ecc40"
                      : "2px solid #e53935",
                    "&:hover": {
                      background: action.active
                        ? "rgba(46,204,64,0.35)"
                        : "rgba(229,57,53,0.35)",
                      backdropFilter: "blur(8px)",
                    },
                  },
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
            />
          ))}
        </SpeedDial>
        <SpeedDial
          ariaLabel="Layer Controls"
          icon={
            isolateMode ? (
              <VisibilityOffIcon sx={{ fontSize: 28 }} />
            ) : (
              <VisibilityIcon sx={{ fontSize: 28 }} />
            )
          }
          direction="down"
          onClick={() => dispatch(toggleIsolateMode(!isolateMode))}
          FabProps={{
            sx: {
              ...btnStyle,
              background: isolateMode
                ? "rgba(229,57,53,0.35)"
                : "rgba(34, 40, 60, 0.35)",
              color: "#fff",
              "&:hover": {
                background: isolateMode
                  ? "rgba(229,57,53,0.35)"
                  : "rgba(34, 40, 60, 0.35)",
              },
            },
            height: "45px",
            size: "medium",
          }}
          sx={{
            width: "45px",
            height: "45px",
            "& .MuiSpeedDial-actions": {
              marginTop: "-46px",
              backdropFilter: "blur(2px)",
              background: "rgba(34, 40, 60, 0.35)",
            },
            "& .MuiSpeedDial-actionsClosed": {
              backdropFilter: "none",
              background: "none",
            },
          }}
        >
          {visibilityActions.map((action) => (
            <SpeedDialAction
              key={action.tooltip}
              icon={action.icon}
              slotProps={{
                tooltip: {
                  title: action.tooltip,
                  arrow: true,
                },
                fab: {
                  sx: {
                    ...btnStyle,
                    background: action.active
                      ? "rgba(46,204,64,0.25)"
                      : "rgba(229,57,53,0.25)",
                    backdropFilter: "blur(6px)",
                    color: "#fff",
                    border: action.active
                      ? "2px solid #2ecc40"
                      : "2px solid #e53935",
                    "&:hover": {
                      background: action.active
                        ? "rgba(46,204,64,0.35)"
                        : "rgba(229,57,53,0.35)",
                      backdropFilter: "blur(8px)",
                    },
                  },
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
            />
          ))}
        </SpeedDial>
        <Tooltip title="Toggle Dark Mode" placement="bottom">
          <IconButton
            onClick={() => dispatch(setDarkMode(!darkMode))}
            sx={btnStyle}
          >
            {darkMode ? (
              <DarkModeIcon sx={{ fontSize: 28 }} />
            ) : (
              <LightModeIcon sx={{ fontSize: 28 }} />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip
          title={globeView ? "Switch to Mercator View" : "Switch to Globe View"}
          placement="bottom"
        >
          <IconButton
            onClick={() => dispatch(setGlobeView(!globeView))}
            sx={{
              ...btnStyle,
              background: globeView
                ? "rgba(46,204,64,0.25)"
                : "rgba(34, 40, 60, 0.35)",
            }}
          >
            <PublicIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings" placement="bottom">
          <IconButton
            ref={settingsRef}
            onClick={() => dispatch(setShowSettings(!showSettings))}
            sx={btnStyle}
          >
            <TuneIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Toggle Sidebar" placement="bottom">
          <IconButton
            onClick={() => dispatch(toggleSidebar(true))}
            sx={btnStyle}
          >
            <MenuIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
});

export default ButtonsControl;
