import React, { Suspense, lazy, StrictMode } from "react";
import ReactDOM from "react-dom/client";
import slice from "./state/index.js";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import { PersistGate } from "redux-persist/integration/react";
import Loading from "components/Loading";
import "./assets/index.css";

const persistConfig = { key: "root", storage, version: 1 };

const persistedReducer = persistReducer(persistConfig, slice);

const store = configureStore({
  reducer: persistedReducer,
  devTools: process.env.NODE_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

const root = ReactDOM.createRoot(document.getElementById("root"));

const App = lazy(() => import("./App.jsx"));
/*
if this variable has been set that means the application is loaded 
at least once, therefore the loading effect won't be applied.
*/
const isLoaded = sessionStorage.getItem("isLoaded");

root.render(
  // <StrictMode>
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistStore(store)}>
      <Suspense fallback={!isLoaded ? <Loading /> : null}>
        <App />
      </Suspense>
    </PersistGate>
  </Provider>,
  // </StrictMode>,
);
