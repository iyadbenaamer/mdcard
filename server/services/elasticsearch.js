import { Client } from "@elastic/elasticsearch";
import fs from "fs";
import { config } from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "url";

config();
// ================== CONFIG ==================
const ELASTIC_PROTOCOL = process.env.ELASTIC_PROTOCOL || "https";
const ELASTIC_HOST = process.env.ELASTIC_HOST || "127.0.0.1";
const ELASTIC_PORT = process.env.ELASTIC_PORT || "9200";
const ELASTIC_USERNAME = process.env.ELASTIC_USERNAME || "elastic";
const ELASTIC_PASSWORD = process.env.ELASTIC_PASSWORD;

// CA path only needed for HTTPS
const CA_PATH = process.env.ELASTICSEARCH_CA_PATH || "";

// ================== VALIDATION ==================
if (!ELASTIC_PASSWORD) {
  throw new Error("❌ ELASTIC_PASSWORD environment variable is not set");
}

if (ELASTIC_PROTOCOL === "https" && !fs.existsSync(CA_PATH)) {
  throw new Error(`❌ Elasticsearch CA certificate not found at ${CA_PATH}`);
}

// ================== NODE URL ==================
const ELASTIC_NODE = `${ELASTIC_PROTOCOL}://${ELASTIC_HOST}:${ELASTIC_PORT}`;

// ================== CLIENT OPTIONS ==================
const clientOptions = {
  node: ELASTIC_NODE,

  auth: {
    username: ELASTIC_USERNAME,
    password: ELASTIC_PASSWORD,
  },

  sniffOnStart: false,
  sniffInterval: false,
  maxRetries: 5,
  requestTimeout: 30000,
};

// Enable TLS only when using HTTPS
if (ELASTIC_PROTOCOL === "https") {
  clientOptions.tls = {
    ca: fs.readFileSync(CA_PATH),
    rejectUnauthorized: true,
  };
}

// ================== CLIENT ==================
export const client = new Client(clientOptions);

const USERS_INDEX_NAME = "users";
const CARD_TYPES_INDEX_NAME = "card_types";

const INDEX_CONFIGS = {
  [USERS_INDEX_NAME]: {
    mappings: {
      properties: {
        name: { type: "text" },
        phone: { type: "text" },
        suggest: {
          type: "completion",
          analyzer: "simple",
          preserve_separators: true,
          preserve_position_increments: true,
          max_input_length: 50,
        },
      },
    },
  },
  [CARD_TYPES_INDEX_NAME]: {
    mappings: {
      properties: {
        name: { type: "text" },
        suggest: {
          type: "completion",
          analyzer: "simple",
          preserve_separators: true,
          preserve_position_increments: true,
          max_input_length: 50,
        },
      },
    },
  },
};

// ================== CONNECTION TEST ==================
(async () => {
  try {
    await client.ping();
    console.log(
      `✅ Elasticsearch connected (${ELASTIC_PROTOCOL.toUpperCase()})`,
    );
  } catch (err) {
    console.error("❌ Elasticsearch connection failed");
    console.error(err.meta?.body || err.message);
  }
})();

const ensureSingleIndex = async (indexName) => {
  const exists = await client.indices.exists({ index: indexName });
  if (exists) return;

  await client.indices.create({
    index: indexName,
    ...INDEX_CONFIGS[indexName],
  });

  console.log(`✅ Created Elasticsearch index: ${indexName}`);
};

export const ensureSearchIndexes = async () => {
  await ensureSingleIndex(USERS_INDEX_NAME);
  await ensureSingleIndex(CARD_TYPES_INDEX_NAME);
};

export const ensureUsersIndex = async () => {
  await ensureSingleIndex(USERS_INDEX_NAME);
};

export const ensureCardTypesIndex = async () => {
  await ensureSingleIndex(CARD_TYPES_INDEX_NAME);
};

export const indexUserDocument = async (doc) => {
  if (!doc?._id) return;

  await client.index({
    index: USERS_INDEX_NAME,
    id: doc._id.toString(),
    document: {
      name: doc.name,
      phone: doc.phone,
      suggest: {
        input: [doc.name, doc.phone].filter(Boolean),
      },
    },
  });
};

export const indexCardTypeDocument = async (doc) => {
  if (!doc?._id) return;

  await client.index({
    index: CARD_TYPES_INDEX_NAME,
    id: doc._id.toString(),
    document: {
      name: doc.name,
      suggest: {
        input: [doc.name].filter(Boolean),
      },
    },
  });
};

const recreateIndex = async (indexName) => {
  await client.indices.delete({ index: indexName }).catch(() => {});
  await client.indices.create({
    index: indexName,
    ...INDEX_CONFIGS[indexName],
  });
};

const reindexUsers = async () => {
  const { default: User } = await import("../models/user.model.js");
  const users = await User.find({});
  console.log(`🔎 Found ${users.length} users`);

  for (const user of users) {
    try {
      await indexUserDocument(user);
    } catch (error) {
      console.error(
        `❌ Failed to index user ${user._id}`,
        error.meta?.body?.error || error.message,
      );
    }
  }

  await client.indices.refresh({ index: USERS_INDEX_NAME });
  console.log("🔄 Users index refreshed");
};

const reindexCardTypes = async () => {
  const { default: CardType } = await import("../models/cardType.model.js");
  const cardTypes = await CardType.find({});
  console.log(`🔎 Found ${cardTypes.length} card types`);

  for (const cardType of cardTypes) {
    try {
      await indexCardTypeDocument(cardType);
    } catch (error) {
      console.error(
        `❌ Failed to index card type ${cardType._id}`,
        error.meta?.body?.error || error.message,
      );
    }
  }

  await client.indices.refresh({ index: CARD_TYPES_INDEX_NAME });
  console.log("🔄 Card types index refreshed");
};

export const reindexAllIndexes = async () => {
  console.log("🧹 Recreating Elasticsearch indexes...");
  await recreateIndex(USERS_INDEX_NAME);
  await recreateIndex(CARD_TYPES_INDEX_NAME);

  await reindexUsers();
  await reindexCardTypes();

  console.log("🎉 Elasticsearch reindex complete");
};

export const initializeElasticsearch = async (reindex = false) => {
  try {
    if (reindex) {
      await reindexAllIndexes();
      return;
    }

    await ensureSearchIndexes();
    console.log("✅ Elasticsearch indexes are ready");
  } catch (error) {
    console.error(
      "❌ Elasticsearch initialization failed:",
      error.meta?.body || error,
    );
    throw error;
  }
};

const runCli = async () => {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mdcard";

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    await initializeElasticsearch(true);

    console.log("🏁 Reindexing finished");
    process.exit(0);
  } catch (error) {
    console.error("❌ Reindexing failed:", error);
    process.exit(1);
  }
};

const entryFile = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
const shouldRunAsCli =
  entryFile &&
  import.meta.url === entryFile &&
  process.argv.includes("--reindex");

if (shouldRunAsCli) {
  runCli();
}
