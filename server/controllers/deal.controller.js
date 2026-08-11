import Deal from "../models/deal.model.js";

import { handleError } from "../utils/errorHandler.js";

// Deals are a retail/individual-facing promotional feature shown on the
// mobile home screen - business accounts never see them.
export const getActiveDeals = async (req, res) => {
  try {
    if (req.user?.role === "business") {
      return res.status(200).json([]);
    }

    const deals = await Deal.find({ isActive: true })
      .select("badge background link")
      .sort({ createdAt: -1 });

    return res.status(200).json(deals);
  } catch (err) {
    return handleError(err, res);
  }
};
