require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./../services/logger");

const URI = process.env.DB_URL;

mongoose.connect(URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  // useFindAndModify: false,
  useUnifiedTopology: true, //this is to avoid deprecation warning
});

const connection = mongoose.connection;

try {
  connection.once("open", () => {
    logger.info("Database connection established successfully.");
  });
} catch (error) {
  logger.error(`Database connection failed: ${error.message}`);
}
