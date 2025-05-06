const userAuthorizationModel = require("../models/userAuthorizationSchema.js");

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

userAuthorizationController.fetchUserAuthorization = async (req, res) => {
  try {
    let data = req.query;
    let uid;
    if (data.profile) {
      uid = data.profile;
    } else {
      uid = data.uid;
    }
    const existingUserAuthorization = await userAuthorizationModel.findOne({
      organization_id: data.organization_id,
      uid: uid,
    });
    let userPreference;
    if (!existingUserAuthorization) {
      userPreference = userPermissions;
    } else {
      userPreference = await userAuthorizationModel.findOne({
        organization_id: data.organization_id,
        uid: uid,
      });
    }
    return res.status(200).json({
      success: true,
      message: "User permissions fetched successfully",
      data: userPreference,
    });
  } catch (error) {
    console.log("An error occurred while fetching user permissions", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred while fetching user permissions",
      error: error.message,
    });
  }
};

userAuthorizationController.updateUserAuthorization = async (req, res) => {
  const session = await userAuthorizationModel.startSession();
  session.startTransaction();

  try {
    const data = req.body;
    if (data.userCreation) {
      const existingUserAuthorization = await userAuthorizationModel.findOne({
        organization_id: data.organization_id,
        uid: data.UserProfile,
      });
      if (existingUserAuthorization) {
        const newUserAuthorization = new userAuthorizationModel({
          uid: data.userUid,
          organization_id: data.organization_id,
          contact_transfer_approved:
            existingUserAuthorization.contact_transfer_approved,
          contact_mass_update_approved:
            existingUserAuthorization.contact_mass_update_approved,
          contact_delete_record_approved:
            existingUserAuthorization.contact_delete_record_approved,
          contact_import_approved:
            existingUserAuthorization.contact_import_approved,
          contact_export_approved:
            existingUserAuthorization.contact_export_approved,
          contact_create_approved:
            existingUserAuthorization.contact_create_approved,
          contact_update_approved:
            existingUserAuthorization.contact_update_approved,
          contact_change_lead_stage_approved:
            existingUserAuthorization.contact_change_lead_stage_approved,
          contact_attachments_create_approved:
            existingUserAuthorization.contact_attachments_create_approved,
          contact_attachments_delete_approved:
            existingUserAuthorization.contact_attachments_delete_approved,
          contact_notes_create_approved:
            existingUserAuthorization.contact_notes_create_approved,
          contact_call_log_create_approved:
            existingUserAuthorization.contact_call_log_create_approved,
          task_export_approved: existingUserAuthorization.task_export_approved,
          project_import_approved:
            existingUserAuthorization.project_import_approved,
          project_export_approved:
            existingUserAuthorization.project_export_approved,
          project_delete_approved:
            existingUserAuthorization.project_delete_approved,
          project_create_approved:
            existingUserAuthorization.project_create_approved,
          project_update_approved:
            existingUserAuthorization.project_update_approved,
          project_attachments_create_approved:
            existingUserAuthorization.project_attachments_create_approved,
          project_attachments_delete_approved:
            existingUserAuthorization.project_attachments_delete_approved,
          calllog_export_approved:
            existingUserAuthorization.calllog_export_approved,
          api_export_approved: existingUserAuthorization.api_export_approved,
          lead_distribution_create_approved:
            existingUserAuthorization.lead_distribution_create_approved,
          lead_distribution_update_approved:
            existingUserAuthorization.lead_distribution_update_approved,
          lead_distribution_delete_approved:
            existingUserAuthorization.lead_distribution_delete_approved,
          faq_create_approved: existingUserAuthorization.faq_create_approved,
          faq_update_approved: existingUserAuthorization.faq_update_approved,
          faq_delete_approved: existingUserAuthorization.faq_delete_approved,
          show_subscription_panel:
            existingUserAuthorization.show_subscription_panel,
          resource_create_approved:
            existingUserAuthorization.resource_create_approved,
          resource_update_approved:
            existingUserAuthorization.resource_update_approved,
          resource_delete_approved:
            existingUserAuthorization.resource_delete_approved,
        });
        await newUserAuthorization.save();
      }
      return res.status(200).json({
        success: true,
        message: "User permissions updated successfully",
      });
    }
    let userUids = data.uid;
    if (data.profile) {
      userUids.push(data.profile);
    }

    const updateFields = {};

    for (const key in userPermissions) {
      if (data.userPermission.includes(key)) {
        updateFields[key] = true;
      } else {
        updateFields[key] = false;
      }
    }

    for (const uid of userUids) {
      const existingUserAuthorization = await userAuthorizationModel
        .findOne({
          organization_id: data.organization_id,
          uid: uid,
        })
        .session(session);

      if (!existingUserAuthorization) {
        const newUserAuthorization = new userAuthorizationModel({
          uid: uid,
          organization_id: data.organization_id,
          ...updateFields,
        });
        await newUserAuthorization.save({ session });
      } else {
        await userAuthorizationModel.findOneAndUpdate(
          {
            organization_id: data.organization_id,
            uid: uid,
          },
          { $set: { ...updateFields, modified_at: new Date() } },
          { new: true, session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "User permissions updated successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.log("An error occured while updating user permissions", error);
    return res.status(400).json({
      success: false,
      message: "An error occured while updating user permissions",
      error: error.message,
    });
  }
};

module.exports = userAuthorizationController;
