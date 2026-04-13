import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

const shallowEqualState = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i += 1) {
    const k = ak[i];
    if (a[k] !== b[k]) return false;
  }
  return true;
};

/**
 * Apply per-feature state values via setFeatureState, diffing against the
 * previously-applied snapshot so we only touch ids whose values changed.
 * `resetKey` should change when the source geometry is rebuilt (feature-state
 * is cleared by MapLibre in that case so we must drop our cache).
 */
const useFeatureStateValues = (sourceId, values, resetKey) => {
  const mapRef = useMap();
  const lastAppliedRef = useRef(new Map());

  useEffect(() => {
    lastAppliedRef.current = new Map();
  }, [resetKey]);

  useEffect(() => {
    const mapInstance = mapRef?.current;
    const map = mapInstance?.getMap ? mapInstance.getMap() : mapInstance;
    if (!map) return undefined;

    let cancelled = false;

    const apply = () => {
      if (cancelled) return false;
      if (!map.getSource(sourceId) || !map.isSourceLoaded(sourceId)) return false;

      const prev = lastAppliedRef.current;
      const next = new Map();

      values.forEach((state, id) => {
        const previousState = prev.get(id);
        if (!shallowEqualState(previousState, state)) {
          map.setFeatureState({ source: sourceId, id }, state);
        }
        next.set(id, state);
      });
      prev.forEach((_, id) => {
        if (!next.has(id)) {
          map.removeFeatureState({ source: sourceId, id });
        }
      });

      lastAppliedRef.current = next;
      return true;
    };

    if (apply()) return undefined;

    const handler = (event) => {
      if (event.sourceId !== sourceId) return;
      if (apply()) map.off("sourcedata", handler);
    };
    map.on("sourcedata", handler);
    return () => {
      cancelled = true;
      map.off("sourcedata", handler);
    };
  }, [sourceId, values, mapRef]);
};

export default useFeatureStateValues;
