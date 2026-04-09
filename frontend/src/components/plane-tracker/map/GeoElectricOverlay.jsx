import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Layer, Source } from "react-map-gl/maplibre";

import { getGeoElectricGeoJSON, getGeoElectricMapLayers } from "../../../utils/geoElectric";
import { getPlaybackTimestamp, resolvePlaybackEntry } from "../helpers/eventPlayback";

const GeoElectricOverlay = () => {
  const { isZooming } = useSelector((state) => state.ui);
  const { showGeoElectric, geoElectricLogRange } = useSelector((state) => state.geoelectric);
  const { liveStreamMode, currentPlaybackTime } = useSelector(
    (state) => state.playback,
  );
  const { data: geoelectricData, playback: geoElectricPlayback } = useSelector(
    (state) => state.geoelectric,
  );

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

  const geoElectricGeoJson = useMemo(() => {
    const sourceData =
      !liveStreamMode && activeGeoElectricPlayback
        ? activeGeoElectricPlayback
        : geoelectricData;

    const sourcePoints = Array.isArray(sourceData)
      ? sourceData
      : sourceData?.points || sourceData?.values || sourceData?.data || [];

    if (
      sourcePoints.length === 0 || !Array.isArray(sourcePoints[0])
    ) {
      return null;
    }

    return getGeoElectricGeoJSON(
      sourcePoints,
      geoElectricLogRange,
    );
  }, [
    geoelectricData,
    activeGeoElectricPlayback,
    liveStreamMode,
    geoElectricLogRange,
  ]);

  const geoElectricMapLayers = useMemo(
    () => getGeoElectricMapLayers(isZooming),
    [isZooming],
  );

  if (
    !showGeoElectric ||
    !geoElectricGeoJson ||
    !geoElectricMapLayers ||
    geoElectricGeoJson.features?.length === 0
  ) {
    return null;
  }

  return (
    <Source
      id="geoelectric-cells"
      type="geojson"
      data={geoElectricGeoJson}
    >
      {geoElectricMapLayers.map((layer) => (
        <Layer
          key={layer.id}
          {...layer}
        />
      ))}
    </Source>
  );
};

export default GeoElectricOverlay;
