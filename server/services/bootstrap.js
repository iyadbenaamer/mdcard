import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Admin from "../models/admin.model.js";

dotenv.config();

const parseArgs = (argv) => {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--username" || key === "--password") {
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        args[key.slice(2)] = value;
        i += 1;
      }
    }
  }
  return args;
};

const showUsageAndExit = (message) => {
  if (message) {
    console.error(message);
  }
  console.error(
    "Usage: node services/bootstrap.js --username <username> --password <password>",
  );
  process.exit(1);
};

const createAdmin = async () => {
  const { username, password } = parseArgs(process.argv);
  if (!username || !password) {
    showUsageAndExit("Missing --username or --password.");
  }

  await connectDB();

  try {
    const existing = await Admin.findOne({ username: username.trim() });
    if (existing) {
      console.log("Admin already exists for this username.");
      return;
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    await Admin.create({
      username: username.trim(),
      password: hashedPassword,
    });

    console.log("Admin created successfully.");
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin().catch((error) => {
  console.error("Failed to create admin:", error?.message || error);
  process.exit(1);
});
