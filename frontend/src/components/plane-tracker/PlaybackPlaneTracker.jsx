import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setFlightData,
  clearFlightData,
  setFetching,
} from "../../store/slices/playbackFlightPathsSlice";
import { fetchPlaybackFlightPath } from "../../api/api";
import { calculateOptimalInterval } from "../../store/slices/playbackSlice";

const PlaybackPlaneTracker = () => {
  const dispatch = useDispatch();
  const trackedPlanes = useSelector(
    (state) => state.playbackFlightPaths.trackedPlanes,
  );
  const liveStreamMode = useSelector((state) => state.playback.liveStreamMode);
  const startDateTime = useSelector((state) => state.playback.startDateTime);
  const endDateTime = useSelector((state) => state.playback.endDateTime);

  useEffect(() => {
    if (liveStreamMode) dispatch(clearFlightData());
  }, [liveStreamMode, dispatch]);

  useEffect(() => {
    if (liveStreamMode || !startDateTime || !endDateTime) return;
    if (trackedPlanes.length === 0) {
      dispatch(clearFlightData());
      return;
    }

    let cancelled = false;
    const interval = calculateOptimalInterval(startDateTime, endDateTime);

    const fetchAll = async () => {
      dispatch(clearFlightData());
      dispatch(setFetching(true));
      await Promise.all(
        trackedPlanes.map(async (plane) => {
          try {
            const result = await dispatch(
              fetchPlaybackFlightPath({
                identifier: plane.identifier,
                type: plane.type,
                start: startDateTime,
                end: endDateTime,
                interval,
              }),
            ).unwrap();
            if (!cancelled && result) {
              dispatch(
                setFlightData({
                  identifier: result.identifier,
                  data: result.data,
                }),
              );
            }
          } catch (err) {
            if (!cancelled) {
              console.error(
                `Failed to fetch flight path for ${plane.identifier}:`,
                err,
              );
            }
          }
        }),
      );
      if (!cancelled) dispatch(setFetching(false));
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [trackedPlanes, startDateTime, endDateTime, liveStreamMode, dispatch]);

  return null;
};

export default PlaybackPlaneTracker;
