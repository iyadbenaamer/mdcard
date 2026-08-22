import { Schema, model } from "mongoose";

// Mirrors mdcard-panel/server/models/notification.model.js - both servers
// point at the same MongoDB database. The panel is the only writer (admin
// composes and sends these); this side is a read-only view the mobile app
// queries to show the user's notification feed.
const notificationSchema = new Schema(
  {
    title: { type: String, trim: true, default: "MD Card" },
    text: { type: String, required: true, trim: true },
    image: { type: String, default: "", trim: true },
    // Path the mobile app navigates to when the notification is pressed.
    link: { type: String, default: "", trim: true },
    audience: {
      type: String,
      enum: ["all", "authorized", "individual", "business", "unauthorized"],
      default: "all",
      required: true,
    },
  },
  { timestamps: true },
);

const Notification = model("Notification", notificationSchema, "notifications");
export default Notification;
