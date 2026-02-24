import { Schema, model } from "mongoose";

const AdminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

const Admin = model("Admin", AdminSchema);
export default Admin;
