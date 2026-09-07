import mongoose from "mongoose";

/*
  Multi-document transactions are only available on a replica set or a sharded
  cluster - a standalone mongod rejects them outright ("Transaction numbers are
  only allowed on a replica set member or mongos"). This project's MONGO_URI is
  a single host with no replicaSet parameter, so transactions must not be
  assumed: running them unconditionally would take down every code path that
  used them.

  So capability is probed once against the live connection and cached, and
  callers get a documented fallback (fn is invoked with a null session) when
  the deployment can't do transactions. Converting the deployment to a
  single-node replica set is enough to switch this on with no code change.
*/

let cachedSupport = null;

const detectSupport = async () => {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    // Replica set members report setName; a mongos router reports this msg.
    return Boolean(hello.setName) || hello.msg === "isdbgrid";
  } catch (err) {
    console.error("[db] could not probe transaction support:", err.message);
    return false;
  }
};

export const supportsTransactions = async () => {
  if (cachedSupport !== null) return cachedSupport;
  // Don't cache a "no" that only reflects the connection not being up yet.
  if (mongoose.connection.readyState !== 1) return false;
  cachedSupport = await detectSupport();
  if (!cachedSupport) {
    console.warn(
      "[db] MongoDB deployment is standalone - multi-document transactions " +
        "are unavailable. Financial writes fall back to per-operation " +
        "atomicity plus compensation. Convert to a replica set to enable them.",
    );
  }
  return cachedSupport;
};

/*
  Runs `fn` inside a transaction when the deployment supports one, otherwise
  runs it directly. `fn` receives the session (or null) and must pass it to
  every operation it performs.

  Resolves to { committed, transactional }: `transactional` says whether the
  work was actually protected by a transaction, which lets callers decide
  whether a failure still needs manual compensation.

  Note that session.withTransaction may invoke `fn` more than once - it retries
  on transient errors - so `fn` must be safe to re-run from the start.
*/
export const withTransaction = async (fn) => {
  const transactional = await supportsTransactions();

  if (!transactional) {
    const result = await fn(null);
    return { result, transactional: false };
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return { result, transactional: true };
  } finally {
    await session.endSession();
  }
};
