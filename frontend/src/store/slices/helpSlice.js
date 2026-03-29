import { createSlice } from "@reduxjs/toolkit";
import { fetchPlanes } from "../../api/api";
import { openGroupsInitialState } from "../../components/help/helpers/constants";

const helpSlice = createSlice({
  name: "help",
  initialState: {
    openGroups: openGroupsInitialState,
    activeTopic: "Purpose of the platform",
    activeAnchor: "",
  },
  reducers: {
    setOpenGroups: (state, action) => {
      state.openGroups = action.payload;
    },
    setActiveTopic: (state, action) => {
      state.activeTopic = action.payload;
    },
    setActiveAnchor: (state, action) => {
      state.activeAnchor = action.payload;
    },
  },
  extraReducers: (builder) => {},
});

export const { setOpenGroups, setActiveTopic, setActiveAnchor } = helpSlice.actions;
export default helpSlice.reducer;
