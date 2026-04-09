import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Layer, Source } from "react-map-gl/maplibre";

import { getAuroraGeoJSON, getAuroraMapLayers } from "../../../utils/aurora";
import { getPlaybackTimestamp, resolvePlaybackEntry } from "../helpers/eventPlayback";

const AuroraOverlay = () => {
  const { showAurora, auroraRegionRange } = useSelector((state) => state.aurora);
  const { isZooming } = useSelector((state) => state.ui);
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const { data: auroraData, playback: auroraPlayback } = useSelector(
    (state) => state.aurora,
  );

  const auroraPlaybackTimes = useMemo(
    () => auroraPlayback.map(getPlaybackTimestamp).filter(Number.isFinite),
    [auroraPlayback],
  );

  const activeAuroraPlayback = useMemo(
    () =>
      !liveStreamMode && currentPlaybackTime
        ? resolvePlaybackEntry(
            auroraPlayback,
            auroraPlaybackTimes,
            currentPlaybackTime,
          )
        : null,
    [liveStreamMode, currentPlaybackTime, auroraPlayback, auroraPlaybackTimes],
  );

  const auroraGeoJson = useMemo(() => {
    const sourceData =
      !liveStreamMode && activeAuroraPlayback
        ? activeAuroraPlayback
        : auroraData;
    const sourcePoints = sourceData?.points?? [];
    if (
      sourcePoints.length === 0 && !Array.isArray(sourcePoints[0])
    ) {
      return null;
    }

    return getAuroraGeoJSON(
      sourcePoints,
      auroraRegionRange,
    );
  }, [
    auroraData,
    activeAuroraPlayback,
    liveStreamMode,
    auroraRegionRange,
  ]);

  const auroraMapLayers = useMemo(
    () => getAuroraMapLayers(isZooming),
    [isZooming],
  );

  if (
    !showAurora ||
    !auroraGeoJson ||
    !auroraMapLayers ||
    auroraGeoJson.features?.length === 0
  ) {
    return null;
  }

  return (
    <Source id="aurora-cells" type="geojson" data={auroraGeoJson}>
      {auroraMapLayers.map((layer) => (
        <Layer key={layer.id} {...layer} />
      ))}
    </Source>
  );
};

export default AuroraOverlay;
