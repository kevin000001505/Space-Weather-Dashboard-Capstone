import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { injectLivePlanes } from '../store/slices/planesSlice';
import { injectLiveDRAP } from '../store/slices/drapSlice';
import { injectLiveAurora } from '../store/slices/auroraSlice';
import { injectLiveGeoElectric } from '../store/slices/geoElectricSlice';
// Import your chart inject actions when ready

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useLiveStream = (isLiveMode = true) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // If user is watching historical playback, don't connect to live stream
    if (!isLiveMode) return;

    const sse = new EventSource(`${API_BASE_URL}/stream/live`);

    sse.addEventListener('planes', (event) => {
      dispatch(injectLivePlanes(JSON.parse(event.data)));
    });

    sse.addEventListener('drap', (event) => {
      dispatch(injectLiveDRAP(JSON.parse(event.data)));
    });

    sse.addEventListener('aurora', (event) => {
      dispatch(injectLiveAurora(JSON.parse(event.data)));
    });

    sse.addEventListener('geoelectric', (event) => {
      dispatch(injectLiveGeoElectric(JSON.parse(event.data)));
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