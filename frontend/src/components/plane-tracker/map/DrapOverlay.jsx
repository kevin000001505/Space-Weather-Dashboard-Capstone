import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Layer, Source } from "react-map-gl/maplibre";

import {
  buildDRAPStaticFromLocations,
  getDRAPFrameAmps,
  getDRAPFilledCellsMapLayers,
  DRAP_LAYER_ID,
  DRAP_BASE_OPACITY,
  DRAP_DIMMED_OPACITY,
} from "../../../utils/drap";
import { getPlaybackTimestamp, resolvePlaybackEntry } from "../helpers/eventPlayback";
import useFeatureStateValues from "../../../hooks/useFeatureStateValues";
import useLayerZoomDim from "../../../hooks/useLayerZoomDim";

const SOURCE_ID = "drap-cells";

const DrapOverlay = () => {
  const { showDRAP, drapRegionRange } = useSelector((state) => state.drap);
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const { points: drapPoints, playback: drapPlayback } = useSelector(
    (state) => state.drap,
  );
  const locationsDrap = useSelector((state) => state.locations.drap);

  const drapPlaybackTimes = useMemo(
    () => drapPlayback.map(getPlaybackTimestamp).filter(Number.isFinite),
    [drapPlayback],
  );

  const activeDrapPlayback = useMemo(
    () =>
      !liveStreamMode && currentPlaybackTime
        ? resolvePlaybackEntry(drapPlayback, drapPlaybackTimes, currentPlaybackTime)
        : null,
    [liveStreamMode, currentPlaybackTime, drapPlayback, drapPlaybackTimes],
  );

  const { featureCollection } = useMemo(
    () => buildDRAPStaticFromLocations(locationsDrap),
    [locationsDrap],
  );

  const frameAmps = useMemo(() => {
    const points = liveStreamMode
      ? drapPoints
      : activeDrapPlayback?.points ?? [];
    return getDRAPFrameAmps(points, drapRegionRange);
  }, [liveStreamMode, drapPoints, activeDrapPlayback, drapRegionRange]);

  useFeatureStateValues(SOURCE_ID, frameAmps, featureCollection);
  useLayerZoomDim(DRAP_LAYER_ID, DRAP_BASE_OPACITY, DRAP_DIMMED_OPACITY);

  const drapMapLayers = useMemo(() => getDRAPFilledCellsMapLayers(), []);

  if (featureCollection.features.length === 0) {
    return null;
  }

  return (
    <Source id={SOURCE_ID} type="geojson" data={featureCollection}>
      {drapMapLayers.map((layer) => (
        <Layer
          key={layer.id}
          {...layer}
          layout={{ ...(layer.layout ?? {}), visibility: showDRAP ? "visible" : "none" }}
        />
      ))}
    </Source>
  );
};

export default DrapOverlay;
