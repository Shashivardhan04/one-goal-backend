require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./../services/logger");

const URI = process.env.DB_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info("✅ Database connection established successfully.");
  } catch (error) {
    logger.error(`❌ Failed to connect to MongoDB: ${error.message}`);
    process.exit(1); // Terminate the app if DB connection fails
  }
};

// Global error and rejection handlers
process.on("uncaughtException", (err) => {
  logger.error(`💥 Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("💥 Unhandled Rejection at:", promise);
  logger.error(`Reason: ${reason}`);
  process.exit(1);
});

module.exports = connectDB;
