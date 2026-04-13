import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useMap } from "react-map-gl/maplibre";

/**
 * Imperatively toggles a single fill layer's `fill-opacity` scalar when the
 * user is zooming/panning. Avoids rebuilding the Layer prop through React
 * (which would remount/rebind the paint) and avoids data-driven expressions
 * (which would force per-feature re-evaluation).
 */
const useLayerZoomDim = (layerId, baseOpacity, dimmedOpacity) => {
  const mapRef = useMap();
  const isZooming = useSelector((state) => state.ui.isZooming);

  useEffect(() => {
    const mapInstance = mapRef?.current;
    const map = mapInstance?.getMap ? mapInstance.getMap() : mapInstance;
    if (!map) return undefined;

    const apply = () => {
      if (!map.getLayer(layerId)) return false;
      map.setPaintProperty(
        layerId,
        "fill-opacity",
        isZooming ? dimmedOpacity : baseOpacity,
      );
      return true;
    };

    if (apply()) return undefined;

    const handler = () => {
      if (apply()) map.off("styledata", handler);
    };
    map.on("styledata", handler);
    return () => map.off("styledata", handler);
  }, [isZooming, layerId, baseOpacity, dimmedOpacity, mapRef]);
};

export default useLayerZoomDim;
