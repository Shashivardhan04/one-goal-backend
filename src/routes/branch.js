const express = require("express");
const logger = require("../services/logger");
const branchController = require("../controllers/branchController");
var router = express.Router();

const { Insert } = branchController;

// Test Route
router.get("/", (req, res) => res.send("You are in branch"));

// Create a New Branch with Error Handling
router.post("/newBranch", async (req, res, next) => {
  try {
    await Insert(req, res);
  } catch (error) {
    logger.error(`🔴 /newBranch - Error: ${error.message}`);
    res.status(500).send("An error occurred while creating the branch.");
  }
});

module.exports = router;
