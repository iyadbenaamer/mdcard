import Notification from "../models/notification.model.js";

import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";

// A notification reaches a user when it was sent to "all" or specifically
// to their role - mirrors the audience check the panel uses to pick which
// pushTokens to notify at send time.
export const getNotifications = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query.page, req.query.limit);
    const filter = { audience: { $in: ["all", "authorized", req.user.role] } };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleError(err, res);
  }
};
