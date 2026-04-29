import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { injectLivePlanes } from '../store/slices/planesSlice';
import { injectLiveDRAP } from '../store/slices/drapSlice';
import { injectLiveAurora } from '../store/slices/auroraSlice';
import { injectLiveGeoElectric } from '../store/slices/geoElectricSlice';
import { injectLiveAlert } from '../store/slices/alertsSlice';
import { decodeDeltaBitpack, mergeCoordinatesAndValues } from '../utils/compression';
import { getLocations } from '../api/api';

const API_V1_URL = import.meta.env.VITE_API_BASE_URL.replace("/v2", "/v1");

/**
 * If the incoming SSE payload is delta-bitpack compressed, decode it and
 * merge with cached grid coordinates to produce {timestamp, points: [[lat,lon,val],...]}.
 */
async function decodeSSEPayload(data, eventType) {
  if (data.encoding !== "delta-bitpack") return data;

  const locations = await getLocations();
  const coords = locations[eventType];
  const values = decodeDeltaBitpack(data.points);
  const points = mergeCoordinatesAndValues(coords, values);
  return { timestamp: data.timestamp, points };
}

export const useLiveStream = (isLiveMode = true) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // If user is watching historical playback, don't connect to live stream
    if (!isLiveMode) return;

    const sse = new EventSource(`${API_V1_URL}/stream/live`);

    sse.addEventListener('planes', (event) => {
      dispatch(injectLivePlanes(JSON.parse(event.data)));
    });

    sse.addEventListener('drap', (event) => {
      const raw = JSON.parse(event.data);
      decodeSSEPayload(raw, 'drap').then((decoded) => {
        dispatch(injectLiveDRAP(decoded));
      });
    });

    sse.addEventListener('aurora', (event) => {
      const raw = JSON.parse(event.data);
      decodeSSEPayload(raw, 'aurora').then((decoded) => {
        dispatch(injectLiveAurora(decoded));
      });
    });

    sse.addEventListener('geoelectric', (event) => {
      const raw = JSON.parse(event.data);
      decodeSSEPayload(raw, 'geoelectric').then((decoded) => {
        dispatch(injectLiveGeoElectric(decoded));
      });
    });

    sse.addEventListener('alerts', (event) => {
      try {
        const data = JSON.parse(event.data);
        dispatch(injectLiveAlert(data));
      } catch (err) {
        console.error('Failed to parse alerts SSE payload', err);
      }
    });

    // Handle connection drops
    sse.onerror = (error) => {
      console.error('SSE Connection Lost. Attempting to reconnect...', error);
    };

    // Cleanup: close connection when component unmounts or goes historical
    return () => {
      sse.close();
    };
  }, [dispatch, isLiveMode]);
};
