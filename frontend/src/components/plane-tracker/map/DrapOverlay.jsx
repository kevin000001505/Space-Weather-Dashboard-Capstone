import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Layer, Source } from "react-map-gl/maplibre";

import { getDRAPFilledCellsGeoJSON, getDRAPFilledCellsMapLayers } from "../../../utils/drap";
import { getPlaybackTimestamp, resolvePlaybackEntry } from "../helpers/eventPlayback";

const DrapOverlay = () => {
  const {
    isZooming,
    darkMode,
  } = useSelector((state) => state.ui);
  const { showDRAP, drapRegionRange } = useSelector((state) => state.drap);
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const { points: drapPoints, playback: drapPlayback } = useSelector(
    (state) => state.drap,
  );

  const drapPlaybackTimes = useMemo(
    () => drapPlayback.map(getPlaybackTimestamp).filter(Number.isFinite),
    [drapPlayback],
  );

  const activeDrapPlayback = useMemo(
    () =>
      !liveStreamMode && currentPlaybackTime
        ? resolvePlaybackEntry(
            drapPlayback,
            drapPlaybackTimes,
            currentPlaybackTime,
          )
        : null,
    [liveStreamMode, currentPlaybackTime, drapPlayback, drapPlaybackTimes],
  );

  const drapGeoJson = useMemo(() => {
    const sourcePoints =
      !liveStreamMode && activeDrapPlayback?.points?.length
        ? activeDrapPlayback.points
        : drapPoints;

    if (
      !sourcePoints ||
      sourcePoints.length === 0
    ) {
      return null;
    }

    return getDRAPFilledCellsGeoJSON(
      sourcePoints,
      drapRegionRange
    );
  }, [
    drapPoints,
    activeDrapPlayback,
    liveStreamMode,
    drapRegionRange,
  ]);

  const drapMapLayers = useMemo(
    () => getDRAPFilledCellsMapLayers(isZooming, darkMode),
    [isZooming, darkMode],
  );

  if (
    !showDRAP ||
    !drapGeoJson ||
    !drapMapLayers ||
    drapGeoJson.features?.length === 0
  ) {
    return null;
  }

  return (
    <Source id="drap-cells" type="geojson" data={drapGeoJson}>
      {drapMapLayers.map((layer) => (
        <Layer key={layer.id} {...layer} />
      ))}
    </Source>
  );
};

export default DrapOverlay;
