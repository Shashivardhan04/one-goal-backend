const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const colors = require("colors");

// Set the logs directory path
const logsDirectory = path.join(__dirname, "../../logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

// Define colors for each log level (for console output only)
colors.setTheme({
  info: ["bgGreen", "black"],
  error: ["bgRed", "white"],
  warn: ["bgYellow", "black"],
  debug: ["bgBlue", "white"],
});

// Console format (with colors)
const consoleFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf((info) => {
    let message = `${info.timestamp} [${info.level.toUpperCase()}]: ${
      info.message
    }`;
    if (info.level === "info") message = colors.info(message);
    else if (info.level === "error") message = colors.error(message);
    else if (info.level === "warn") message = colors.warn(message);
    else if (info.level === "debug") message = colors.debug(message);
    return message;
  })
);

// File format (with optional ANSI colors — not recommended, but doable)
const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf((info) => {
    return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
  })
);

// Create the logger
const logger = createLogger({
  level: "debug", // log everything including debug
  transports: [
    // Console with colored output
    new transports.Console({
      format: consoleFormat,
    }),
    // Daily rotating file (no colors)
    new DailyRotateFile({
      filename: "log-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      dirname: logsDirectory,
      maxSize: "20m",
      maxFiles: "14d",
      format: fileFormat, // No color
    }),
  ],
});

module.exports = logger;
