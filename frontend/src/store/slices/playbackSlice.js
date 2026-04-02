import { createSlice } from "@reduxjs/toolkit";

const drapSlice = createSlice({
  name: "drap",
  initialState: {
    liveStreamMode: true,
    date: "",
    time: "",
  },
  reducers: {
    setDate: (state, action) => {
      state.date = action.payload;
    },
    setTime: (state, action) => {
      state.time = action.payload;
    },
    setLiveStreamMode: (state, action) => {
      state.liveStreamMode = action.payload;
    },
  },
  extraReducers: (builder) => {},
});

export const { setDate, setTime, setLiveStreamMode } = drapSlice.actions;
export default drapSlice.reducer;
