import { createSlice } from '@reduxjs/toolkit';
import { fetchAurora } from '../../api/api'; 

const auroraSlice = createSlice({
  name: 'aurora',
  initialState: {
    showAurora: false,
    auroraRegionRange: [0, 100],
    data: null, 
    playback: [],
    loading: false,
    error: null,
  },
  reducers: {
    injectLiveAurora: (state, action) => {
      state.data = action.payload; 
    },
    setAuroraPlayback: (state, action) => {
      state.playback = action.payload;
    },
    setShowAurora: (state, action) => {
      state.showAurora = action.payload;
    },
    setAuroraRegionRange: (state, action) => {
      state.auroraRegionRange = action.payload;
    }

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAurora.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAurora.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAurora.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  injectLiveAurora,
  setAuroraPlayback,
  setShowAurora,
  setAuroraRegionRange,
} = auroraSlice.actions;
export default auroraSlice.reducer;