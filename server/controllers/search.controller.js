import CardType from "../models/cardType.model.js";
import { handleError } from "../utils/errorHandler.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildCardTypeSearchFilter = (searchTerm) => {
  const term = searchTerm.trim();
  const terms = term.split(/\s+/);

  const patterns = new Set();
  const addPattern = (t) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    patterns.add(escapeRegex(trimmed));
  };

  addPattern(term);
  terms.forEach(addPattern);

  const orConditions = [];
  for (const p of patterns) {
    const regex = new RegExp(p, "i");
    orConditions.push({ "name.ar": regex }, { "name.en": regex });
  }

  return orConditions.length > 0 ? { $or: orConditions } : {};
};

// Card type search endpoint
export const searchCardTypes = async (req, res) => {
  try {
    let { query } = req.query;
    query = query?.trim();
    if (!query) {
      return res.status(400).json({ code: "SEARCH_QUERY_REQUIRED" });
    }

    if (query.length > 1000) {
      return res.status(400).json({ code: "SEARCH_QUERY_TOO_LONG" });
    }

    const filter = buildCardTypeSearchFilter(query);
    filter.isActive = true;

    const cardTypes = await CardType.find(filter)
      .select("name image createdAt")
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(cardTypes);
  } catch (err) {
    return handleError(err, res);
  }
};
