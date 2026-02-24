import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  admin: null,
  popupMessage: "",
};

export const slice = createSlice({
  name: "state",
  initialState,
  reducers: {
    setAdmin: (state, action) => {
      state.admin = action.payload;
    },
    setShowMessage: (state, action) => {
      state.popupMessage = action.payload;
    },
    logout: (state) => {
      //clear localStorage and sessionStorage to start a new session
      sessionStorage.clear();
      localStorage.clear();
      state.admin = null;
      state.popupMessage = "";
    },
  },
});
export const { setAdmin, setShowMessage, logout } = slice.actions;
export default slice.reducer;
