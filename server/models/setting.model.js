import { Schema, model } from "mongoose";

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    group: { type: String },
  },
  { timestamps: true },
);

const Setting = model("Setting", settingSchema, "settings");
export default Setting;
