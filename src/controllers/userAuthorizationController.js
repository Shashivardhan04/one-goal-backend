const userAuthorizationModel = require("../models/userAuthorizationSchema.js");
const logger = require("../services/logger");

const userAuthorizationController = {};

let userPermissions = {
  contact_transfer_approved: true,
  contact_mass_update_approved: true,
  contact_delete_record_approved: true,
  contact_import_approved: true,
  contact_export_approved: true,
  contact_create_approved: true,
  contact_update_approved: true,
  contact_change_lead_stage_approved: true,
  contact_attachments_create_approved: true,
  contact_attachments_delete_approved: true,
  contact_notes_create_approved: true,
  contact_call_log_create_approved: true,
  task_export_approved: true,
  project_import_approved: true,
  project_export_approved: true,
  project_delete_approved: true,
  project_create_approved: true,
  project_update_approved: true,
  project_attachments_create_approved: true,
  project_attachments_delete_approved: true,
  calllog_export_approved: true,
  api_export_approved: true,
  lead_distribution_create_approved: true,
  lead_distribution_update_approved: true,
  lead_distribution_delete_approved: true,
  faq_create_approved: true,
  faq_update_approved: true,
  faq_delete_approved: true,
  show_subscription_panel: true,
  resource_create_approved: true,
  resource_update_approved: true,
  resource_delete_approved: true,
};

/**
 * 🔍 Fetch User Authorization
 * Retrieves authorization details for a user based on their organization and UID.
 */
userAuthorizationController.fetchUserAuthorization = async (req, res) => {
  try {
    const { organization_id, profile, uid } = req.query;

    /** 🛑 Validate required parameters */
    if (!organization_id || (!profile && !uid)) {
      logger.warn(
        "⚠️ Missing required parameters for user authorization retrieval"
      );
      return res.status(400).json({
        success: false,
        message:
          "Invalid Params: organization_id and either profile or UID are required",
        status: 400,
        data: userPermissions, // Default user permissions
      });
    }

    const userId = profile || uid;
    logger.info(
      `📡 Retrieving user permissions for Organization ID: ${organization_id}, UID: ${userId}`
    );

    /** 🔍 Check existing user authorization */
    const existingUserAuthorization = await userAuthorizationModel
      .findOne({ organization_id, uid: userId })
      .lean();
    const userPreference = existingUserAuthorization || userPermissions; // Fallback to default permissions

    logger.info(
      `✅ User permissions retrieved successfully for UID: ${userId}`
    );
    return res.status(200).json({
      success: true,
      message: "User permissions fetched successfully",
      status: 200,
      data: userPreference,
    });
  } catch (error) {
    logger.error(`❌ Error fetching user permissions: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching user permissions",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * 🔄 Update User Authorization
 * Updates user permissions and ensures transactional integrity.
 */
userAuthorizationController.updateUserAuthorization = async (req, res) => {
  const session = await userAuthorizationModel.startSession();
  session.startTransaction();

  try {
    const { organization_id, userCreation, userPermission, profile, uid } =
      req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || (!uid && !profile)) {
      logger.warn("⚠️ Missing required fields for user authorization update");
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid Params: organization_id and either UID or profile are required",
          status: 400,
        });
    }

    logger.info(
      `📡 Updating user permissions for Organization ID: ${organization_id}`
    );

    /** 🔄 Handle user creation scenario */
    if (userCreation) {
      const existingUserAuthorization = await userAuthorizationModel.findOne({
        organization_id,
        uid: profile,
      });

      if (existingUserAuthorization) {
        await new userAuthorizationModel({
          uid,
          organization_id,
          ...existingUserAuthorization.toObject(),
          _id: undefined, // Ensure a new record is created
        }).save();

        logger.info(`✅ New user authorization copied for UID: ${uid}`);
      }

      await session.commitTransaction();
      session.endSession();
      return res
        .status(200)
        .json({
          success: true,
          message: "User permissions updated successfully",
          status: 200,
        });
    }

    /** 🔄 Determine affected user IDs */
    let userUids = Array.isArray(uid) ? uid : [uid];
    if (profile) userUids.push(profile);

    /** 🚀 Construct update fields */
    const updateFields = Object.keys(userPermissions).reduce(
      (acc, key) => {
        acc[key] = userPermission.includes(key);
        return acc;
      },
      { modified_at: new Date() }
    );

    /** 💾 Perform user authorization updates */
    for (const userId of userUids) {
      const existingAuth = await userAuthorizationModel
        .findOne({ organization_id, uid: userId })
        .session(session);

      if (!existingAuth) {
        await new userAuthorizationModel({
          uid: userId,
          organization_id,
          ...updateFields,
        }).save({ session });
      } else {
        await userAuthorizationModel.findOneAndUpdate(
          { organization_id, uid: userId },
          { $set: updateFields },
          { new: true, session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    logger.info(`✅ User permissions updated successfully`);
    return res
      .status(200)
      .json({
        success: true,
        message: "User permissions updated successfully",
        status: 200,
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    logger.error(`❌ Error updating user permissions: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while updating user permissions",
        error: error.message,
        status: 500,
      });
  }
};

module.exports = userAuthorizationController;
