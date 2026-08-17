import { Schema, model } from "mongoose";

const platformVersionSchema = new Schema(
  {
    minVersion: { type: String, required: true, default: "1.0.0" },
    latestVersion: { type: String, required: true, default: "1.0.0" },
    storeUrl: { type: String, default: "" },
  },
  { _id: false },
);

// Mirrors mdcard-panel/server/models/appVersion.model.js - both servers
// point at the same MongoDB database, and this one is a read-only view for
// the mobile app's startup version check. The admin panel is the only
// writer (see mdcard-panel's appVersion.controller.js updateAppVersion).
const appVersionSchema = new Schema(
  {
    android: { type: platformVersionSchema, default: () => ({}) },
    ios: { type: platformVersionSchema, default: () => ({}) },
  },
  { timestamps: true },
);

const AppVersion = model("AppVersion", appVersionSchema, "appversions");
export default AppVersion;
