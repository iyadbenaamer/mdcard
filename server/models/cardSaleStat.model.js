import { Schema, model, Types } from "mongoose";

const { ObjectId } = Types;

// Lifetime sold-count per card type, used to rank the top-selling cards.
// Grouped by CardType (not CardTier) so different denominations of the same
// product (e.g. a $10 and a $25 tier of "Steam") roll up into one ranking
// entry. Incremented at the moment of sale (see utils/statsTracker.js)
// rather than derived from Card documents, since sold cards are purged
// after the admin-configured retention window (see mdcard-panel's
// utils/autoDelete.js).
const cardSaleStatSchema = new Schema(
  {
    typeId: { type: ObjectId, ref: "CardType", required: true, unique: true },
    soldCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const CardSaleStat = model(
  "CardSaleStat",
  cardSaleStatSchema,
  "card_sale_stats",
);
export default CardSaleStat;
