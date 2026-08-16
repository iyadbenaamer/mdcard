import { recordRequestLog } from "../services/requestLogger.js";

// Opt-in per-handler: a controller calls req.logAction(actionType, details)
// once it knows which of the 5 tracked flows (login/signup/verification
// code/password change/checkout) this request represents. Routes that never
// call it never write a RequestLog row - that's what keeps the collection
// scoped to those flows instead of every request the server receives.
// Handlers may call it more than once (e.g. as soon as a userId is
// resolved); later calls merge into the pending entry rather than replacing
// it. success/failure and resultCode are derived automatically from the
// response instead of requiring every early-return branch to report them.
export const attachRequestLogger = (req, res, next) => {
  let pending = null;
  let responseBody = null;

  req.logAction = (actionType, details = {}) => {
    pending = { ...pending, ...details, actionType };
  };

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (!pending) return;
    const status = res.statusCode < 400 ? "success" : "failure";
    recordRequestLog(req, {
      ...pending,
      status,
      resultCode: responseBody?.code || null,
    }).catch((err) => {
      console.error("Failed to write request log:", err);
    });
  });

  next();
};
