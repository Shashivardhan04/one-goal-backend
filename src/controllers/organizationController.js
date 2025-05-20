const organizationModel = require("../models/organizationSchema");
const packageDetailsModel = require("../models/packageDetailsSchema");
const userModel = require("../models/userSchema");
const organizationResourcesModel = require("../models/organizationResourcesSchema");
var ObjectId = require("mongoose").Types.ObjectId;
const { generateSalt, hashPassword } = require("../functions/authScrypt");
const mongoose = require("mongoose");
const { MESSAGES } = require("../constants/constants");
const logger = require("../services/logger");
// const {createOrganization}=require("../functions/organization")

const organizationController = {};

/**
 * ➕ Insert Organization
 * Creates a new organization in the system with validation, error handling, and logging.
 */
organizationController.Insert = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const requiredFields = [
      "address",
      "admin_contact_number",
      "admin_email_id",
      "admin_first_name",
      "admin_last_name",
      "auth_id",
      "city",
      "country",
      "email_id",
      "mobile_number",
      "no_of_employees",
      "organization_name",
      "state",
      "status",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      logger.warn(`⚠️ Missing required fields: ${missingFields.join(", ")}`);
      return res.status(400).json({
        success: false,
        message: "Some required fields are missing",
        missingFields,
        status: 400,
      });
    }

    /** 🔄 Create new organization */
    const data = new organizationModel({
      ...req.body,
      created_at:
        req.body.created_at instanceof Date ? req.body.created_at : new Date(),
    });

    await data.save();

    logger.info(
      `✅ Organization created successfully: ${req.body.organization_name}`
    );

    /** ✅ Return success response */
    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      status: 201,
      data,
    });
  } catch (error) {
    logger.error(`❌ Error creating organization: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the organization",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update Organization Data
 * Updates organization details with validation, structured error handling, and logging.
 */
organizationController.updateData = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, id, data } = req.body;

    if (!organization_id || !id || !data) {
      logger.warn(
        "⚠️ Missing required fields: organization_id, id, or update data"
      );
      return res.status(400).json({
        success: false,
        message: "Some required fields are missing",
        status: 400,
      });
    }

    /** 🔄 Prepare update query */
    const updateQuery = mongoose.Types.ObjectId.isValid(organization_id)
      ? { _id: id }
      : { id };

    logger.info(
      `🔄 Updating organization data for Organization ID: ${organization_id}`
    );

    /** 🚀 Execute update */
    const result = await organizationModel.findOneAndUpdate(
      updateQuery,
      { $set: data },
      { new: true }
    );

    /** 🛑 Handle case where organization was not found */
    if (!result) {
      logger.warn(`⚠️ No organization found for ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Organization not found",
        status: 404,
      });
    }

    logger.info(`✅ Organization updated successfully for ID: ${id}`);

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Organization data updated successfully",
      status: 200,
      data: result,
    });
  } catch (error) {
    logger.error(`❌ Error updating organization data: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the organization",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📌 Fetch Organization Data
 * Retrieves organization details based on the provided organization_id.
 */
organizationController.fetch = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id } = req.body;

    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    /** 🔍 Determine correct lookup key */
    const query = mongoose.Types.ObjectId.isValid(organization_id)
      ? { _id: organization_id }
      : { id: organization_id };

    logger.info(
      `📡 Fetching organization data for Organization ID: ${organization_id}`
    );

    /** 🚀 Fetch organization details */
    const result = await organizationModel.findOne(query).lean();

    /** 🛑 Handle case where organization was not found */
    if (!result) {
      logger.warn(`⚠️ No organization found for ID: ${organization_id}`);
      return res.status(404).json({
        success: false,
        message: "Organization not found",
        status: 404,
      });
    }

    logger.info(
      `✅ Organization data fetched successfully for ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Organization data fetched successfully",
      status: 200,
      data: result,
    });
  } catch (error) {
    logger.error(`❌ Error fetching organization data: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the organization",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔑 Create Organization with Authentication
 * Registers an organization with authentication, ensuring validation, structured logging, and transaction handling.
 */
organizationController.createOrganizationWithAuth = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    /** 🛑 Validate request body */
    const requiredFields = [
      "organization_name",
      "mobile_number",
      "email_id",
      "address",
      "country",
      "state",
      "city",
      "pincode",
      "admin_first_name",
      "admin_contact_number",
      "admin_email_id",
      "no_of_employees",
      "valid_from",
      "valid_till",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      logger.warn(`⚠️ Missing required fields: ${missingFields.join(", ")}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Some required fields are missing",
        missingFields,
        status: 400,
      });
    }

    const orgId = new mongoose.Types.ObjectId();
    const uid = new mongoose.Types.ObjectId();
    const validFrom = new Date(req.body.valid_from);
    const validTill = new Date(req.body.valid_till);

    /** 🔍 Check if organization already exists */
    const existingOrg = await organizationModel
      .findOne({ admin_email_id: req.body.admin_email_id })
      .session(session);

    if (existingOrg) {
      logger.warn(
        `⚠️ Organization already exists with email: ${req.body.admin_email_id}`
      );
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Organization already exists",
        status: 400,
      });
    }

    /** 🏢 Create organization */
    const organizationData = {
      ...req.body,
      organization_id: orgId,
      auth_id: uid,
      valid_from: validFrom,
      valid_till: validTill,
      created_by: "MANUAL",
    };

    await organizationModel.create([organizationData], { session });

    /** 🔑 Generate and hash password */
    let password =
      req.body.admin_first_name.slice(0, 4).toUpperCase() +
      "@" +
      req.body.admin_contact_number.slice(0, 4);
    const salt = generateSalt();
    password = await hashPassword(password, salt);

    /** 🏷️ Create user admin */
    await userModel.create(
      [
        {
          user_first_name: req.body.admin_first_name,
          user_last_name: req.body.admin_last_name || "",
          user_email: req.body.admin_email_id.toLowerCase(),
          contact_no: req.body.admin_contact_number,
          designation: "Organization Admin",
          status: "ACTIVE",
          organization_id: orgId,
          password: password,
          passwordSalt: salt,
          role: "organization",
          first_login: true,
        },
      ],
      { session }
    );

    /** 🔧 Create organization permissions */
    await organizationResourcesModel.create(
      [
        {
          organization_id: orgId,
          permission: {
            Sales: [
              "Budget",
              "Contact No.",
              "Created At",
              "Customer Name",
              "Email",
              "Source",
            ],
            "Team Lead": [
              "Budget",
              "Contact No.",
              "Created At",
              "Created By",
              "Customer Name",
              "Email",
            ],
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    logger.info(
      `✅ Organization created successfully: ${req.body.organization_name}`
    );

    /** ✅ Return success response */
    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      status: 201,
    });
  } catch (error) {
    logger.error(`❌ Error creating organization: ${error.message}`);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the organization",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update Organization
 * Updates organization details with validation, structured error handling, and logging.
 */
organizationController.updateOrganization = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, valid_from, valid_till, ...data } = req.body;

    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    logger.info(
      `📡 Checking if organization exists for ID: ${organization_id}`
    );

    /** 🔍 Check if organization exists */
    const check = await organizationModel.findOne({ organization_id });

    if (!check) {
      logger.warn(`⚠️ Organization does not exist for ID: ${organization_id}`);
      return res.status(404).json({
        success: false,
        message: "Organization does not exist",
        status: 404,
      });
    }

    /** 🚀 Remove fields that should not be updated */
    ["organization_id", "admin_email_id", "oid"].forEach(
      (field) => delete data[field]
    );

    /** 🛑 Handle empty update request */
    if (Object.keys(data).length === 0) {
      logger.warn(`⚠️ No valid fields sent for update`);
      return res.status(400).json({
        success: false,
        message: "Please send at least one parameter to update",
        status: 400,
      });
    }

    /** 🔄 Convert timestamps properly */
    const currentTime = new Date();
    if (valid_till) {
      const validTill = new Date(valid_till);
      validTill.setHours(
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds(),
        currentTime.getMilliseconds()
      );
      data["valid_till"] = validTill;
    }

    if (valid_from) {
      const validFrom = new Date(valid_from);
      validFrom.setHours(
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds(),
        currentTime.getMilliseconds()
      );
      data["valid_from"] = validFrom;
    }

    /** 📌 Track modification timestamp */
    data.modified_at = new Date();

    logger.info(`🔄 Updating organization for ID: ${organization_id}`);

    /** 🚀 Execute update */
    const updatedOrganization = await organizationModel.findOneAndUpdate(
      { organization_id },
      { $set: data },
      { new: true }
    );

    logger.info(
      `✅ Organization updated successfully for ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      status: 200,
      data: updatedOrganization,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating organization for ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the organization",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📊 Fetch All Organizations
 * Retrieves paginated organization data with sorting, filtering, and structured logging.
 */
organizationController.fetchAll = async (req, res) => {
  try {
    const apiStart = Date.now();
    const { page, limit, sort, filters } = req.query;

    /** 🛑 Validate and parse filters */
    let parsedFilters = {};
    try {
      if (filters) {
        parsedFilters = JSON.parse(filters);

        Object.keys(parsedFilters).forEach((key) => {
          if (datesField.includes(key) && parsedFilters[key]?.length === 2) {
            parsedFilters[key] = {
              $gte: new Date(parsedFilters[key][0]),
              $lte: new Date(parsedFilters[key][1]),
            };
          } else {
            parsedFilters[key] = { $all: parsedFilters[key] };
          }
        });
      }
    } catch (error) {
      logger.warn(`⚠️ Invalid filter parameter: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: "Invalid filter parameter",
        error: error.message,
        status: 400,
      });
    }

    /** 🔄 Convert page and limit to integers */
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    if (isNaN(pageNumber) || pageNumber < 1) {
      logger.warn("⚠️ Invalid page value");
      return res.status(400).json({
        success: false,
        message: "Invalid page value",
        status: 400,
      });
    }

    if (isNaN(limitNumber) || limitNumber < 1) {
      logger.warn("⚠️ Invalid limit value");
      return res.status(400).json({
        success: false,
        message: "Invalid limit value",
        status: 400,
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    /** 🔄 Parse sorting parameter */
    let parsedSort;
    try {
      parsedSort = sort ? JSON.parse(sort) : {};
    } catch (error) {
      logger.warn(`⚠️ Invalid sorting parameter: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: "Invalid sorting parameter",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching organizations with filters: ${JSON.stringify(parsedFilters)}`
    );

    /** 🚀 Count total organizations matching filters */
    const count = await organizationModel.countDocuments(parsedFilters);

    /** 🚀 Fetch paginated organization data */
    const data = await organizationModel
      .find(parsedFilters, { __v: 0 })
      .lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);

    const apiEnd = Date.now();
    logger.info(`⏳ Total API execution time: ${apiEnd - apiStart}ms`);

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Fetched all organizations successfully",
      status: 200,
      data,
      count,
    });
  } catch (error) {
    logger.error(`❌ Error fetching organizations: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching organizations",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🏢 Fetch Single Organization
 * Retrieves details of a specific organization using its ID.
 */
organizationController.fetchSingleOrganization = async (req, res) => {
  try {
    /** 🛑 Validate request query */
    const { organization_id } = req.query;

    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching organization details for Organization ID: ${organization_id}`
    );

    /** 🔍 Fetch organization details */
    const data = await organizationModel.findOne({ organization_id }).lean();

    /** 🛑 Handle case where organization was not found */
    if (!data) {
      logger.warn(`⚠️ No organization found for ID: ${organization_id}`);
      return res.status(404).json({
        success: false,
        message: "Organization not found",
        status: 404,
      });
    }

    logger.info(
      `✅ Organization fetched successfully for ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Organization fetched successfully",
      status: 200,
      data,
    });
  } catch (error) {
    logger.error(
      `❌ Error fetching organization for ID ${req.query.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the organization",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = organizationController;
