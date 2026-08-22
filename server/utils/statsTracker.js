import Stats, { SOLD_CARDS_COUNT_KEY } from "../models/stats.model.js";
import CardSaleStat from "../models/cardSaleStat.model.js";

// Records a card sale (or, with a negative delta, its reversal) in the
// persistent stats counters. Best-effort: callers should not fail the
// triggering request if this rejects, since these counters only feed the
// admin dashboard.
export const recordCardSale = async ({ typeId, delta = 1 }) => {
  if (!typeId || !delta) return;

  await Promise.all([
    CardSaleStat.findOneAndUpdate(
      { typeId },
      { $inc: { soldCount: delta } },
      { upsert: true },
    ),
    Stats.findOneAndUpdate(
      { key: SOLD_CARDS_COUNT_KEY },
      { $inc: { value: delta } },
      { upsert: true },
    ),
  ]);
};
