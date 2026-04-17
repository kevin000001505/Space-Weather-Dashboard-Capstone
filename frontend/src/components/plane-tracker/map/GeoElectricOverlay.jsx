import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Layer, Source } from "react-map-gl/maplibre";

import {
  buildGeoElectricStaticFromLocations,
  getGeoElectricFrameMagnitudes,
  getGeoElectricMapLayers,
  GEOELECTRIC_LAYER_ID,
  GEOELECTRIC_BASE_OPACITY,
  GEOELECTRIC_DIMMED_OPACITY,
} from "../../../utils/geoElectric";
import { getPlaybackTimestamp, resolvePlaybackEntry } from "../helpers/eventPlayback";
import useFeatureStateValues from "../../../hooks/useFeatureStateValues";
import useLayerZoomDim from "../../../hooks/useLayerZoomDim";

const SOURCE_ID = "geoelectric-cells";

const extractPoints = (sourceData) => {
  if (!sourceData) return [];
  if (Array.isArray(sourceData)) return sourceData;
  return sourceData.points || sourceData.values || sourceData.data || [];
};

const GeoElectricOverlay = () => {
  const { showGeoElectric, geoElectricLogRange } = useSelector(
    (state) => state.geoelectric,
  );
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const { data: geoelectricData, playback: geoElectricPlayback } = useSelector(
    (state) => state.geoelectric,
  );
  const locationsGeoelectric = useSelector((state) => state.locations.geoelectric);

  const geoElectricPlaybackTimes = useMemo(
    () => geoElectricPlayback.map(getPlaybackTimestamp).filter(Number.isFinite),
    [geoElectricPlayback],
  );

  const activeGeoElectricPlayback = useMemo(
    () =>
      !liveStreamMode && currentPlaybackTime
        ? resolvePlaybackEntry(
            geoElectricPlayback,
            geoElectricPlaybackTimes,
            currentPlaybackTime,
          )
        : null,
    [
      liveStreamMode,
      currentPlaybackTime,
      geoElectricPlayback,
      geoElectricPlaybackTimes,
    ],
  );

  const { featureCollection } = useMemo(
    () => buildGeoElectricStaticFromLocations(locationsGeoelectric),
    [locationsGeoelectric],
  );

  const frameValues = useMemo(() => {
    const points = liveStreamMode
      ? extractPoints(geoelectricData)
      : extractPoints(activeGeoElectricPlayback);
    return getGeoElectricFrameMagnitudes(points, geoElectricLogRange);
  }, [
    liveStreamMode,
    geoelectricData,
    activeGeoElectricPlayback,
    geoElectricLogRange,
  ]);

  useFeatureStateValues(SOURCE_ID, frameValues, featureCollection);
  useLayerZoomDim(GEOELECTRIC_LAYER_ID, GEOELECTRIC_BASE_OPACITY, GEOELECTRIC_DIMMED_OPACITY);

  const geoElectricMapLayers = useMemo(() => getGeoElectricMapLayers(), []);

  if (featureCollection.features.length === 0) {
    return null;
  }

  return (
    <Source id={SOURCE_ID} type="geojson" data={featureCollection}>
      {geoElectricMapLayers.map((layer) => (
        <Layer
          key={layer.id}
          {...layer}
          layout={{ ...(layer.layout ?? {}), visibility: showGeoElectric ? "visible" : "none" }}
        />
      ))}
    </Source>
  );
};

export default GeoElectricOverlay;
