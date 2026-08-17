import AppVersion from "../models/appVersion.model.js";
import { handleError } from "../utils/errorHandler.js";

// Public, unauthenticated read of the admin-configured min/latest app
// version. Called on every app launch (including pre-login), so it must
// never require auth and must degrade gracefully - if the admin hasn't
// configured anything yet, schema defaults ("1.0.0"/"1.0.0") are returned
// rather than a 404, so the mobile app never blocks itself on a missing doc.
export const getAppVersion = async (req, res) => {
  try {
    const doc = (await AppVersion.findOne()) || new AppVersion();
    return res.status(200).json(doc);
  } catch (err) {
    return handleError(err, res);
  }
};
