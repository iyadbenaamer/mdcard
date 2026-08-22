import { Schema, model } from "mongoose";

// Persistent named counters for admin-panel stats (e.g. lifetime sold-cards
// count). Sold cards, orders and transactions are purged after the
// admin-configured retention window (see mdcard-panel's utils/autoDelete.js),
// so these counters are incremented at the moment of sale (see
// utils/statsTracker.js) instead of being derived by counting live
// documents - a live count would silently drop once the underlying records
// age out and get deleted.
const statsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const SOLD_CARDS_COUNT_KEY = "soldCardsCount";

const Stats = model("Stats", statsSchema, "stats");
export default Stats;
