const ObjectId = require("mongoose").Types.ObjectId;
const leadDistributionModel = require("../models/leadDistributionSchema");
const userModel = require("../models/userSchema");
const leadModel = require("../models/leadsSchema");
const Notification = require("../models/notificationModel");
const admin = require("../../firebaseAdmin");
const moment = require("moment");
const logger = require("../services/logger");

const autoRotationController = {};

////////////////// trigger for leadShuffling ///////////////////////////

const sendNotification = async (
  organization_id,
  uid,
  leadId,
  contactNumber
) => {
  try {
    // console.log("send notification",organization_id, uid, leadId,contactNumber)
    // const fcmTokens = (
    //   await admin.firestore().collection("fcmTokens").doc(organization_id).get()
    // ).data();
    // if (fcmTokens && fcmTokens[uid] && fcmTokens[uid] !== "") {
    //   admin.messaging().sendToDevice(
    //     fcmTokens[uid],
    //     {
    //       notification: {
    //         title: "Lead expiring soon! ☹️",
    //         body: `A new API lead ${contactNumber} is here. Please take immediate action or this will be auto rotated.`,
    //         sound: "default",
    //       },
    //       data: {
    //         Id: leadId,
    //       },
    //     },
    //     { contentAvailable: false, priority: "high" }
    //   );
    // }
    const user = await userModel.findOne({ uid });
    if (user && user["fcm_token"] && user["fcm_token"] !== "") {
      admin.messaging().sendToDevice(
        user["fcm_token"],
        {
          notification: {
            title: "Lead expiring soon! ☹️",
            body: `A new API lead ${contactNumber} is here. Please take immediate action or this will be auto rotated.`,
            sound: "default",
          },
          data: {
            Id: leadId,
          },
        },
        { contentAvailable: false, priority: "high" }
      );
    }
  } catch (err) {
    console.log("notification not sent", err);
  }
};

const createNotification = async (
  uid,
  notification_title,
  notification_description,
  organization_id
) => {
  console.log(
    "create notification",
    uid,
    notification_title,
    notification_description,
    organization_id
  );
  let date = moment();
  if (
    uid &&
    organization_id &&
    notification_description &&
    notification_title &&
    date
  ) {
    try {
      let newNotification = new Notification({
        uid: uid,
        organization_id: organization_id,
        notification_description: notification_description,
        notification_title: notification_title,
        date: date,
      });

      newNotification = await newNotification.save();
      console.log("Success", "Notification Created");
    } catch (error) {
      console.log("Failure", "Notification Was Not Created", error);
    }
  }
};

const addMinutesToCurrentDate = (minutes) => {
  // Get the current date and time
  const currentDate = moment();

  // Add the specified number of minutes
  const newDate = currentDate.add(minutes, "minutes");

  // Return the new date
  return newDate.toDate();
};

const leadRotate = async (leadData) => {
  // console.log("lead dta",leadData)
  try {
    if (new Date() > leadData.nextRotationAt) {
      // let leadIds = [];
      // for (let i = 0; i < leadsData.length; i++) {
      // const leadData = leadsData[i];

      // Get lead distribution logic
      let leadDistributionData = await leadDistributionModel.findOne({
        _id: leadData.leadDistributionId,
      });

      // Get the next lead owner
      let nextOwnerUid;
      if (leadData["autoRotationOwners"].length > 0) {
        nextOwnerUid = leadData["autoRotationOwners"].shift();
      } else {
        nextOwnerUid = leadDistributionData.returnLeadTo;
        leadData.autoRotationEnabled = "HOLD";
      }
      let nextOwnerData = await userModel.findOne(
        { uid: nextOwnerUid },
        { user_email: 1 }
      );

      let oldLeadType = leadData["lead_type"] ? leadData["lead_type"] : "Data";
      let leadId = leadData.Id;
      let newData = {};
      let oldData = { ...leadData };
      let associate_status = true;
      let new_source_status = false;
      let old_source_status = leadData.source_status;
      associate_status = false;
      old_source_status = false;
      new_source_status = true;

      newData = {
        ...leadData,
        transfer_status: false,
        associate_status: true,
        source_status: new_source_status,
        uid: nextOwnerUid,
        lead_type: oldLeadType,
        contact_owner_email: nextOwnerData.user_email,
        created_at: leadData.created_at
          ? new Date(leadData.created_at)
          : new Date(),
        modified_at: new Date(),
        stage_change_at: new Date(),
        lead_assign_time: new Date(),
        next_follow_up_date_time:
          leadData.next_follow_up_date_time === ""
            ? ""
            : new Date(leadData.next_follow_up_date_time),
        previous_owner_1: leadData.previous_owner_2
          ? leadData.previous_owner_2
          : "",
        previous_owner_2: leadData.contact_owner_email
          ? leadData.contact_owner_email
          : "",
        transfer_by_1: leadData.transfer_by_2 ? leadData.transfer_by_2 : "",
        transfer_by_2: "Auto Rotated Lead",
        previous_stage_1: leadData.previous_stage_2
          ? leadData.previous_stage_2
          : "",
        previous_stage_2: leadData.stage,
        organization_id: leadData.organization_id,
        nextRotationAt: addMinutesToCurrentDate(
          leadDistributionData.autoRotationTime
        ),
      };

      oldData = {
        transfer_status: true,
        associate_status,
        source_status: old_source_status,
        transfer_reason: "Auto Rotated Lead",
        modified_at: new Date(),
        autoRotationEnabled: "OFF",
      };
      delete oldData.created_at;
      delete oldData.stage_change_at;
      delete oldData.lead_assign_time;
      delete oldData.next_follow_up_date_time;

      newData = {
        ...newData,
        stage: "FRESH",
        next_follow_up_type: "",
        next_follow_up_date_time: "",
        not_int_reason: "",
        lost_reason: "",
        other_not_int_reason: "",
        other_lost_reason: "",
      };

      if (newData["_id"]) {
        delete newData["_id"];
      }
      if (newData["Id"]) {
        delete newData["Id"];
      }

      // console.log("data",newData,oldData);
      // return;

      let contactId = new ObjectId();
      let stringContactId = contactId.toString();

      // leadIds.push(contactId);
      const newLead = new leadModel({
        Id: contactId,
        ...newData,
      });
      const newLeadData = await newLead.save();
      const oldLeadData = await leadModel.findOneAndUpdate(
        { Id: leadId },
        { $set: oldData },
        { new: true }
      );
      // }
      await sendNotification(
        leadData.organization_id,
        nextOwnerUid,
        stringContactId,
        leadData.contact_no
      );
      await createNotification(
        nextOwnerUid,
        "Lead expiring soon!",
        `A new API lead ${leadData.contact_no} is here. Please take immediate action or this will be auto rotated.`,
        leadData.organization_id
      );
      console.log("Lead successfully auto rotated", newData, oldData);
    } else {
      console.log("The time is less");
    }
  } catch (err) {
    console.log("Error in transferring lead during auto rotation", err);
  }
};

/**
 * 🔄 Auto-Rotate Leads
 * Automatically rotates leads based on distribution logic and conditions.
 */
autoRotationController.autoRotateLeads = async (req, res) => {
  try {
    logger.info("📡 Fetching distribution logics with auto rotation enabled");

    /** 🔎 Retrieve all distribution logics where auto rotation is enabled */
    const distributionLogics = await leadDistributionModel.find({
      autoRotationEnabled: "ON",
    });

    /** 🚀 Extract distribution IDs */
    const distributionIds = distributionLogics.map(({ _id }) => _id);

    if (distributionIds.length === 0) {
      logger.warn("⚠️ No distribution logics found with auto rotation enabled");
      return res
        .status(200)
        .json({
          success: true,
          message: "No leads eligible for auto rotation",
          status: 200,
        });
    }

    logger.info(
      `📊 Found ${distributionIds.length} distribution logics with auto rotation`
    );

    /** 🔎 Retrieve leads eligible for rotation */
    const leadsData = await leadModel
      .find(
        {
          leadDistributionId: { $in: distributionIds },
          stage: "FRESH",
          autoRotationEnabled: "ON",
          transfer_status: false,
        },
        { __v: 0, _id: 0 }
      )
      .lean();

    if (leadsData.length === 0) {
      logger.warn("⚠️ No leads eligible for rotation");
      return res
        .status(200)
        .json({
          success: true,
          message: "No leads eligible for auto rotation",
          status: 200,
        });
    }

    logger.info(`🔄 Initiating auto-rotation for ${leadsData.length} leads`);

    /** 🚀 Perform lead rotations */
    await Promise.all(leadsData.map(async (item) => leadRotate(item)));

    logger.info(`✅ Auto rotation completed successfully`);
    return res
      .status(200)
      .json({ success: true, message: "Auto Rotation Completed", status: 200 });
  } catch (error) {
    logger.error(`❌ Error in auto rotating leads: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while auto rotating leads",
        status: 500,
        error: error.message,
      });
  }
};

module.exports = autoRotationController;

////////////////////////////////////////////////////////////////
