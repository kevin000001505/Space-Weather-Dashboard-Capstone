import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Layer, Source } from "react-map-gl/maplibre";

import {
  buildAuroraStaticFromLocations,
  getAuroraFrameProbabilities,
  getAuroraMapLayers,
  AURORA_LAYER_ID,
  AURORA_BASE_OPACITY,
  AURORA_DIMMED_OPACITY,
} from "../../../utils/aurora";
import { getPlaybackTimestamp, resolvePlaybackEntry } from "../helpers/eventPlayback";
import useFeatureStateValues from "../../../hooks/useFeatureStateValues";
import useLayerZoomDim from "../../../hooks/useLayerZoomDim";

const SOURCE_ID = "aurora-cells";

const AuroraOverlay = () => {
  const { showAurora, auroraRegionRange } = useSelector((state) => state.aurora);
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const { data: auroraData, playback: auroraPlayback } = useSelector(
    (state) => state.aurora,
  );
  const locationsAurora = useSelector((state) => state.locations.aurora);

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

  const { featureCollection } = useMemo(
    () => buildAuroraStaticFromLocations(locationsAurora),
    [locationsAurora],
  );

  const frameValues = useMemo(() => {
    const points = liveStreamMode
      ? auroraData?.points ?? []
      : activeAuroraPlayback?.points ?? [];
    return getAuroraFrameProbabilities(points, auroraRegionRange);
  }, [liveStreamMode, auroraData, activeAuroraPlayback, auroraRegionRange]);

  useFeatureStateValues(SOURCE_ID, frameValues, featureCollection);
  useLayerZoomDim(AURORA_LAYER_ID, AURORA_BASE_OPACITY, AURORA_DIMMED_OPACITY);

  const auroraMapLayers = useMemo(() => getAuroraMapLayers(), []);

  if (featureCollection.features.length === 0) {
    return null;
  }

  return (
    <Source id={SOURCE_ID} type="geojson" data={featureCollection}>
      {auroraMapLayers.map((layer) => (
        <Layer
          key={layer.id}
          {...layer}
          layout={{ ...(layer.layout ?? {}), visibility: showAurora ? "visible" : "none" }}
        />
      ))}
    </Source>
  );
};

export default AuroraOverlay;
