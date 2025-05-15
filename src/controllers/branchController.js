const branchModel = require("../models/branchSchema");
const logger = require("../services/logger"); // Ensure the logger is properly imported

const branchController = {};

/**
 * Inserts a new branch into the database with proper exception handling and logging.
 */
branchController.Insert = async (req, res) => {
  try {
    // Validate request body to ensure required fields exist
    const { organization_id, branch_name } = req.body;
    if (!organization_id || !branch_name) {
      logger.warn(
        "⚠️ Missing required parameters: organization_id and branch_name"
      );
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: organization_id and branch_name",
        status: 400,
      });
    }

    // Create new branch entry
    const newBranch = new branchModel({ organization_id, branch_name });

    // Save the branch and log success
    const result = await newBranch.save();
    logger.info(`✅ New branch created successfully: ${result._id}`);

    // Return success response
    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      status: 201,
      branch_id: result._id,
    });
  } catch (error) {
    // Handle errors and log them
    logger.error(`❌ Error creating branch: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
};

module.exports = branchController;
