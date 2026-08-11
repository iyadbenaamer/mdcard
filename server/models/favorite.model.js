import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

const favoriteSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    cardTypeId: { type: ObjectId, ref: "CardType", required: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ userId: 1, cardTypeId: 1 }, { unique: true });

const Favorite = model("Favorite", favoriteSchema, "favorites");
export default Favorite;
