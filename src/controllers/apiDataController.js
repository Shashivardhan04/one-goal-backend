var ObjectId = require('mongoose').Types.ObjectId;
// const apiDataModel = require('../models/apiDataSchema');
const crypto = require('crypto');
const admin = require("../../firebaseAdmin")
const userModel = require("../models/userSchema")
const leadModel = require("../models/leadsSchema")
const callLogsModel = require("../models/callLogsSchema")
const apiQuestionsModel = require("../models/apiQuestionsSchema")
const Notification = require("../models/notificationModel")
// const leadDistributionModel = require("../models/leadDistributionSchema")
const apiTokenModel = require("../models/apiTokenSchema")
const contactResourceMongoModel = require("../models/contactResourcesMongoSchema")
const { MESSAGES, BASEURL } = require("../constants/constants")
const { fetchLeadDistribution, updateLeadDistribution, createSuccessAPIData, createFailedAPIData } = require("../functions/apiData");
const moment = require("moment")
const axios = require("axios");
const apiDataModel = require('../models/apiDataSchema');
const {contactValidator,alphabetValidator,countryCodeValidator}=require("../functions/validation");
const { sendNotificationsToMultipleUsers, sendNotificationToSingleUser } = require('../functions/sendNotification');
const qs = require("qs");

const apiDataController = {};

// const requirement_Type=["rental","resale","new project"];

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time"
];

apiDataController.FetchAll = async (req, res) => {
  try {
    let parsedFilters = {};
    let prevDate;
    let currentDate;
    const { organization_id, page, limit, sort, filters, search,apiDaysFilter } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }
    if (filters) {
      parsedFilters = JSON.parse(filters);
      for (const key of Object.keys(parsedFilters)) {
        if (datesField.includes(key)) {
          if (parsedFilters[key].length && parsedFilters[key].length === 2) {
            parsedFilters[key] = {
              $gte: new Date(parsedFilters[key][0]),
              $lte: new Date(parsedFilters[key][1]),
            };
          }
        }
        else {
          parsedFilters[key] = { $in: parsedFilters[key] };
        }
      }
    }
    if (search) {
      parsedFilters["$or"] = [
        { lead_source: { $regex: new RegExp(search, 'i') } },
        { contact_no: { $regex: new RegExp(search, 'i') } },
        { customer_name: { $regex: new RegExp(search, 'i') } }
      ]
    }
    // Convert page and limit to integers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber) {
      if (isNaN(pageNumber) || pageNumber < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid page value",
          error: "Invalid page value",
        });
      }
    }

    if (limitNumber) {
      if (isNaN(limitNumber) || limitNumber < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid limit value",
          error: "Invalid limit value"
        });
      }
    }

    const skip = (pageNumber - 1) * limitNumber;
    let parsedSort;
    if (sort) {
      try {
        parsedSort = JSON.parse(sort);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid  parameter",
          error: error.message
        });
      }
    }

    if(!parsedFilters["created_at"] && !parsedFilters["lead_assign_time"]){
      if (apiDaysFilter == "7") {
        prevDate = moment().subtract(7, "day").toDate();
        currentDate = moment().toDate();
        parsedFilters["created_at"] = {
          $gte: prevDate,
          $lte: currentDate,
        };
      } else if (apiDaysFilter == "30") {
        prevDate = moment().subtract(30, "day").toDate();
        currentDate = moment().toDate();
        parsedFilters["created_at"] = {
          $gte: prevDate,
          $lte: currentDate,
        };
      }
    }

    console.log("aman api filters",parsedFilters,apiDaysFilter)

    const apiData = await apiDataModel.find({ organization_id: organization_id, ...parsedFilters }, { __v: 0 }).lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);
    const apiCount = await apiDataModel.countDocuments({ organization_id, ...parsedFilters });
    return res.status(200).json({
      success: true,
      message: "API Data fetched successfully",
      data: {
        apiData,
        apiCount
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

apiDataController.FilterValues = async (req, res) => {
  try {
    const { organization_id } = req.query;
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const groupStage = {
      $group: {
        _id: null,
        budget: { $addToSet: "$budget" },
        contact_owner_email: { $addToSet: "$contact_owner_email" },
        country_code: { $addToSet: "$country_code" },
        fail_reason: { $addToSet: "$fail_reason" },
        lead_source: { $addToSet: "$lead_source" },
        location: { $addToSet: "$location" },
        project: { $addToSet: "$project" },
        property_stage: { $addToSet: "$property_stage" },
        property_type: { $addToSet: "$property_type" },
        status:  { $addToSet: "$status" },
        api_forms:  { $addToSet: "$api_forms" },
      }
    }

    const filterValuesForAPITokens = await apiDataModel.aggregate([
      {
        $match: { organization_id }
      },
      groupStage
    ])
    return res.status(200).json({
      success: true,
      message: "Filter Values fetched successfully",
      data: filterValuesForAPITokens
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

const addMinutesToDate = (minutes) => {
  const currentTimestamp = Date.now();
  const millisecondsToAdd = minutes * 60000;
  const newTimestamp = currentTimestamp + millisecondsToAdd;
  return new Date(newTimestamp);
}

const leadDistributionMongo = async (organization_id, reqData) => {
  // const headers = {
  //   "x-access-token": accessToken,
  // };
  // const getLeadDistributions = baseURL + "/leadDistribution/fetchAll";
  // const updateLeadDistribution = baseURL + "/leadDistribution/update";
  try {
    // const res = await axios.get(getLeadDistributions, {
    //   params: {
    //     organization_id: organization_id,
    //   },
    //   headers,
    // });
    // const distributionLogics = res.data.data;
    // console.log("response from distribution", res.data);

    const distributionLogics = await fetchLeadDistribution(organization_id)
    if (distributionLogics.length === 0) {
      return undefined;
    } else {
      let userData = undefined;
      let newIndex = 0;
      let Id;
      let autoRotationData = {};
      distributionLogics.forEach((data, index) => {
        if (userData !== undefined) {
          return;
        }
        // console.log("logic data",data)
        let flag = true;
        Object.keys(data).forEach((key) => {
          console.log("logic key", key, data[key], reqData[key], flag)
          if (Array.isArray(data[key]) && data[key].length !== 0 && flag) {
            if (
              key !== "users" &&
              key !== "usersWithUid" &&
              data[key].includes &&
              !data[key].includes(reqData[key])
            ) {
              flag = false;
              // console.log("logic key false maine kiya",key,data[key],reqData[key],flag,data[key].length)
            }
            // console.log("flag 1",flag,data[key],reqData[key])
          }
        });
        if (flag == true) {
          let userIndex = data.current_index ? data.current_index : 0;
          userIndex = userIndex % data["usersWithUid"].length;
          userData = data["usersWithUid"][userIndex];
          newIndex = Number(data.current_index) + 1;
          Id = data._id;
          if (data.autoRotationEnabled == "ON") {
            let userUids = data["usersWithUid"].map((user) => user.uid);
            let userUidsWithoutCurrentUser = userUids.filter((uid) => uid !== userData.uid);
            autoRotationData["leadDistributionId"] = Id;
            autoRotationData["autoRotationEnabled"] = "ON";
            autoRotationData["autoRotationOwners"] = userUidsWithoutCurrentUser;
            autoRotationData["nextRotationAt"] = addMinutesToDate(data.autoRotationTime)
          }
        }
        // console.log("flag 2",flag)
      });
      if (userData !== undefined) {
        // await axios.put(
        //   updateLeadDistribution,
        //   { Id: Id, current_index: newIndex },
        //   { headers }
        // );

        await updateLeadDistribution(Id, { current_index: newIndex });
      }
      // console.log("user data",userData)
      console.log("lead distribution data to log", { userData, autoRotationData })
      return { userData, autoRotationData };
    }
  } catch (err) {
    console.log("Lead Distribution Error", err.message);
    return undefined;
  }
};

// const sendNotification = async (organization_id, uid, leadId, customerName, contactNumber) => {
//   try {
//     // console.log("send notification", organization_id, uid, leadId, contactNumber, customerName)
//     // const fcmTokens = (
//     //   await admin.firestore().collection("fcmTokens").doc(organization_id).get()
//     // ).data();
//     // if (fcmTokens && fcmTokens[uid] && fcmTokens[uid] !== "") {
//     //   admin.messaging().sendToDevice(
//     //     fcmTokens[uid],
//     //     {
//     //       notification: {
//     //         title: "API Lead",
//     //         body: `A new lead is searching for a property. Please take immediate action on the same.`,
//     //         sound: "default",
//     //       },
//     //       // data: {
//     //       //   Id: leadId,
//     //       // },
//     //     },
//     //     { contentAvailable: false, priority: "high" }
//     //   );
//     // }

//     const user = await userModel.findOne({uid});
//     if (user && user["fcm_token"] && user["fcm_token"] !== "") {
//       admin.messaging().sendToDevice(
//         user["fcm_token"],
//         {
//           notification: {
//             title: "API Lead",
//             body: `A new lead is searching for a property. Please take immediate action on the same.`,
//             sound: "default",
//           },
//           // data: {
//           //   Id: leadId,
//           // },
//         },
//         { contentAvailable: false, priority: "high" }
//       );
//     }
//   } catch (err) {
//     console.log("notification not sent", err);
//   }
// };

// const sendNotificationAutoRotation = async (organization_id, uid, leadId, contactNumber) => {
//   try {
//     // console.log("send notification",organization_id, uid, leadId,contactNumber)
//     // const fcmTokens = (
//     //   await admin.firestore().collection("fcmTokens").doc(organization_id).get()
//     // ).data();
//     // if (fcmTokens && fcmTokens[uid] && fcmTokens[uid] !== "") {
//     //   admin.messaging().sendToDevice(
//     //     fcmTokens[uid],
//     //     {
//     //       notification: {
//     //         title: "Lead expiring soon! ☹️",
//     //         body: `A new API lead is here. Please take immediate action or this will be auto rotated.`,
//     //         sound: "default",
//     //       },
//     //       // data: {
//     //       //   Id: leadId,
//     //       // },
//     //     },
//     //     { contentAvailable: false, priority: "high" }
//     //   );
//     // }

//     const user = await userModel.findOne({uid});
//     if (user && user["fcm_token"] && user["fcm_token"]  !== "") {
//       admin.messaging().sendToDevice(
//         user["fcm_token"],
//         {
//           notification: {
//             title: "Lead expiring soon! ☹️",
//             body: `A new API lead is here. Please take immediate action or this will be auto rotated.`,
//             sound: "default",
//           },
//           // data: {
//           //   Id: leadId,
//           // },
//         },
//         { contentAvailable: false, priority: "high" }
//       );
//     }
//   } catch (err) {
//     console.log("notification not sent", err);
//   }
// };

const createNotification = async (uid, notification_title, notification_description, organization_id) => {
  let date = moment();
  if (uid && organization_id && notification_description && notification_title && date) {
    try {
      let newNotification = new Notification({
        uid: uid,
        organization_id: organization_id,
        notification_description: notification_description,
        notification_title: notification_title,
        date: date
      });

      newNotification = await newNotification.save();
      // console.log("Success", "Notification Created")
    } catch (error) {
      console.log("Failure", "Notification Was Not Created", error)
    }
  }
};

// const replaceKeywords = (text) => {
//   // Define the patterns and replacements
//   const replacements = [
//     { pattern: /project/gi, replacement: 'new project' },
//     { pattern: /nt/gi, replacement: 'rental' },               
//     { pattern: /sale/gi, replacement: 'resale' } 
//   ];

//   // Perform replacements
//   replacements.forEach(({ pattern, replacement }) => {
//     if (pattern.test(text)) {
//       text = replacement;
//     }
//   });
//   console.log("text", text);

//   return text;
// };



// const secToTime = (value) => {
//   const hour = Math.floor(value / 3600);
//   value = value - hour * 3600;
//   const min = Math.floor(value / 60);
//   value = value - min * 60;
//   const sec = value;
//   const hourString = hour < 10 ? "0" + String(hour) : String(hour);
//   const minString = min < 10 ? "0" + String(min) : String(min);
//   const secString = sec < 10 ? "0" + String(sec) : String(sec);
//   if (hour === 0) {
//     return `${minString}:${secString}`;
//   }
//   return `${hourString}:${minString}:${secString}`;
// };

apiDataController.CreateAPILead = async (req, res) => {
  try {
    const generateUniqueId = () => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let uniqueId = '';

      for (let i = 0; i < 20; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uniqueId += characters[randomIndex];
      }

      return uniqueId;
    }
    //  return res.status(200).send(generateUniqueId());
    let reqData = req.body;
    let autoRotationData;
    const splittedUrl = req.url.split("?");
    if (splittedUrl.length === 2) {
      reqData = qs.parse(splittedUrl[1]);
    }

    // let requirementType="";  
   
    // if(reqData.requirement_type){
    //    requirementType=replaceKeywords(reqData.requirement_type)
    //    if(!requirement_Type.includes(requirementType)){
    //        requirementType="new project"
    //    }
    // }
    



    if (reqData.token === undefined || reqData.token === "") {
      return res.status(400).send({ success: false, message: "Token Not Found", error: "token not found" });

    }


    let uid = "";
    let fail_reason = "";

    const tokenData = await apiTokenModel.findOne({ token: reqData.token });
    let phoneResult = {
      contact_no: reqData.contact_no ? reqData.contact_no : "",
      country_code: reqData.country_code ? reqData.country_code : "",
    };

    // console.log("dfedfedfre",tokenData);


    if (tokenData === undefined) {
      return res.status(400).json({ success: false, message: "Invalid Token", error: "token data not found" });

    }
    if (tokenData.status === "INACTIVE") {
      return res.status(400).json({ success: false, message: "Token is Inactive", error: "Token is Inactive" });

    }

    if (
      typeof reqData.contact_no !== "string" ||
      reqData.contact_no === undefined ||
      reqData.contact_no === "" 
      // || contactValidator(reqData.contact_no)==="Invalid Phone No."
    ) {

      fail_reason = "Mobile Empty";
      await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
      return res.status(400).json({ success: false, message: "Mobile Empty", error: "Mobile Empty" });

    } else if (
      typeof reqData.customer_name !== "string" ||
      reqData.customer_name === undefined ||
      reqData.customer_name === "" 
      // || alphabetValidator(reqData.customer_name)==="Invalid Name"
    ) {
      fail_reason = "Invalid Customer Name";
      await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
      return res.status(400).json({ succes: false, message: "Invalid Customer Name" });

    }
    else if (
      reqData.property_type !== undefined &&
      typeof reqData.property_type !== "string"
    ) {
      fail_reason = "Invalid Property Type";
      await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
      return res.status(400).json({ success: false, message: "Invalid Property Type", error: "Invalid Property Type" });

    }
    else {
      let contact = reqData.contact_no.replace(/\D/g, "");
      if (contact.startsWith("0")) {
        contact = contact.slice(1);
      }
      if (tokenData.country_code === "+91") {
        phoneResult = {
          country_code: "+91",
          contact_no: contact.substr(contact.length - 10),
        };
      } else if (reqData.country_code && reqData.country_code !== "") {
        let code = reqData.country_code;
        if (code.startsWith("+")) {
          phoneResult.country_code = code;
        } else {
          phoneResult.country_code = "+" + code;
        }
        phoneResult.contact_no = contact;
      } else {
        if (reqData.contact_no.startsWith("+")) {
          phoneResult = {
            country_code: "+" + contact.slice(0, 2),
            contact_no: contact.slice(2),
          };
        } else {
          phoneResult = {
            country_code: tokenData.country_code
              ? tokenData.country_code
              : "+91",
            contact_no: contact,
          };
        }
      }

      let oidUserExists = false;

      if (reqData.owner_email 
        // && !user_email 
      ) {
        // const user = await firestore()
        //   .collection("users")
        //   .where("organization_id", "==", tokenData.organization_id)
        //   .where("user_email", "==", reqData.owner_email)
        //   .get();
          const user = await userModel.findOne({organization_id:tokenData.organization_id,user_email:reqData.owner_email});
        if (user) {
            uid = user.uid;
            // user_email = reqData.owner_email
        } else {
          fail_reason = "Owner Not Found";
          // await createFailedAPI(reqData, phoneResult, fail_reason, tokenData);
          await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
          return res.status(400).json({ success: false, message: "Owner Not Found", error: "Invalid Owner" });
        }
      }
      if (reqData.associate_contact) {
        // const user = await firestore()
        //   .collection("users")
        //   .where("organization_id", "==", tokenData.organization_id)
        //   .where("contact_no", "==", reqData.associate_contact)
        //   .get();
          const user = await userModel.findOne({organization_id:tokenData.organization_id,contact_no: reqData.associate_contact});
        if (user) {
          let userData = user;
          uid = userData.uid;
          reqData = { ...reqData, owner_email: userData.user_email };
        } else {
          reqData.owner_email = tokenData.primary_lead_manager_email
            ? tokenData.primary_lead_manager_email
            : "";
          uid = tokenData.primary_lead_manager_uid
            ? tokenData.primary_lead_manager_uid
            : "";
        }
      }
      if (tokenData.source != "Magicbricks") {
        try {
          let contactData = await leadModel.find({
            organization_id: tokenData.organization_id, country_code: phoneResult.country_code,
            contact_no: phoneResult.contact_no,
            transfer_status: false
          })
          // console.log("contact data",contactData.data.data)
          if (contactData.length !== 0) {
            let uniqueId = generateUniqueId();
            fail_reason = "Duplicate Contact";
            // await sendSms(tokenData.organization_id, phoneResult.contact_no);
            await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
            return res.status(400).json({ success: false, message: "Contact Already Exists", error: "Contact Already Exists", leadId: uniqueId });
          }
        } catch (error) {
          console.log("An error occured while checking if lead exists", error);
        }
      }

    if (uid === "") {
      // console.log("uid",uid);
      const userData = await leadDistributionMongo(tokenData.organization_id, {
        ...reqData,
        source: tokenData.source,
      });

      // console.log("autoRotationData",userData);
      if (userData?.userData) {
        reqData.owner_email = userData.userData.user_email;
        uid = userData.userData.uid;
        autoRotationData = userData.autoRotationData;
      } else {
        // console.log("reqData ",reqData)
        if (reqData.oid) {
          const user = await userModel.findOne({ organization_id: tokenData.organization_id, user_oid: reqData.oid, status: "ACTIVE" });
          // console.log("user",user)
          if (user) {
            let userData = user;
            // console.log("userData",userData)
            uid = user.uid;
            reqData = { ...reqData, owner_email: user.user_email };
            oidUserExists = true;
          } else {
            if (reqData.oid_email) {
              const userDataViaEmail = await userModel.findOne({ organization_id: tokenData.organization_id, user_email: reqData.oid_email, status: "ACTIVE" });
              if (userDataViaEmail) {
                let userData = userDataViaEmail;
                // console.log("userData",userData)
                uid = userDataViaEmail.uid;
                reqData = { ...reqData, owner_email: userDataViaEmail.user_email };
                oidUserExists = true;
              }
            }
          }
        }
        else if (reqData.oid_email) {
          const userDataViaEmail = await userModel.findOne({ organization_id: tokenData.organization_id, user_email: reqData.oid_email, status: "ACTIVE" });
          if (userDataViaEmail) {
            let userData = userDataViaEmail;
            // console.log("userData",userData)
            uid = userDataViaEmail.uid;
            reqData = { ...reqData, owner_email: userDataViaEmail.user_email };
            oidUserExists = true;
          }
        }
        else if (reqData.soid && !oidUserExists) {
          const user = await userModel.findOne({ organization_id: tokenData.organization_id, user_oid: reqData.soid });
          // console.log("user 11 ",user)
          if (user) {
            let userData = user;
            // console.log("userData 11 ",userData)
            uid = user.uid;
            reqData = { ...reqData, owner_email: user.user_email };
          }
        } else {
          reqData.owner_email = tokenData.primary_lead_manager_email
            ? tokenData.primary_lead_manager_email
            : "";
          uid = tokenData.primary_lead_manager_uid
            ? tokenData.primary_lead_manager_uid
            : "";
        }
      }
    }
    let leadDistributionId;
    let autoRotationEnabled;
    let autoRotationOwners;
    let nextRotationAt;


    if (autoRotationData) {
      leadDistributionId = autoRotationData.leadDistributionId ? autoRotationData.leadDistributionId : "";
      autoRotationEnabled = autoRotationData.autoRotationEnabled ? autoRotationData.autoRotationEnabled : "OFF";
      autoRotationOwners = autoRotationData.autoRotationOwners ? autoRotationData.autoRotationOwners : [];
      nextRotationAt = autoRotationData.nextRotationAt ? autoRotationData.nextRotationAt : "";
    }
// console.log("reqData",reqData)
    const leadId = new ObjectId()
    const leadData = {
      Id: leadId,
      alternate_no: reqData.alternate_no ? reqData.alternate_no : "",
      associate_status: true,
      budget: reqData.budget ? reqData.budget : "",
      contact_no: phoneResult.contact_no,
      country_code: phoneResult.country_code,
      created_at: Date.now(),
      created_by: reqData.created_by ? reqData.created_by : "",
      customer_image: "",
      customer_name: reqData.customer_name,
      email: reqData.email ? reqData.email : "",
      lead_source: tokenData.source,
      lead_assign_time: Date.now(),
      location: reqData.location ? reqData.location : "",
      lead_type: "Leads",
      lost_reason: "",
      not_int_reason: "",
      other_not_int_reason: "",
      other_lost_reason: "",
      previous_owner: "",
      project: reqData.project ? reqData.project : "",
      property_stage: reqData.property_stage ? reqData.property_stage : "",
      property_type: reqData.property_type ? reqData.property_type : "",
      source_status: true,
      stage: reqData.stage ? String(reqData.stage).toUpperCase() : "FRESH",
      transfer_status: false,
      uid: uid,
      feedback_time: "",
      next_follow_up_type: "",
      next_follow_up_date_time: "",
      organization_id: tokenData.organization_id,
      contact_owner_email: reqData.owner_email ? reqData.owner_email : "",
      campaign: reqData.campaign ? reqData.campaign : "",
      addset: reqData.addset ? reqData.addset : "",
      api_forms: reqData.api_forms ? reqData.api_forms : "",
      state: reqData.state ? reqData.state : "",
      leadDistributionId: leadDistributionId,
      autoRotationEnabled: autoRotationEnabled,
      autoRotationOwners: autoRotationOwners,
      nextRotationAt: nextRotationAt,
      requirement_Type:reqData.requirement_type?reqData.requirement_type.toUpperCase():"NEW PROJECT",
      property_id: reqData.property_id ? reqData.property_id : "",
      country: reqData.country ? reqData.country : "",
      city: reqData.city ? reqData.city : "",
      contact_message_details: reqData.contact_message_details ?  reqData.contact_message_details : "",
      mb_contact_id: reqData.mb_contact_id ?  reqData.mb_contact_id : "",
    };
// console.log("leadData",leadData)
    const lead = await leadModel.create(leadData);


    await createSuccessAPIData(reqData, phoneResult, tokenData, leadId);
    if (reqData.duration) {

      try {

        let calldataBody = {
          leadId: leadId,
          organization_id: tokenData.organization_id,
          uid: uid,
          created_at: Date.now(),
          duration: Number(reqData.duration),
        }

        let callsData = await callLogsModel.create(calldataBody);

        // console.log("call added", callsData.data.data)
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "error occured in callLogs creation",
          error: error.message
        })
      }
    }


    if (reqData.voice_url) {
      try {

        let attachmnentsData = {
          created_at: new Date(),
          name: "IVR Call",
          url: reqData.voice_url,
          type: "audio",
        }


        // let modifiedAttachmentData = convertTimestampsToDate(attachmnentsData);
        const query = {
          leadId: leadId,
        };
        const update = {
          $push: { attachments: attachmnentsData },
        };
        const options = {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        };
        const updatedDocument = await contactResourceMongoModel.findOneAndUpdate(query, update, options);
        // return res.status(200).json({"success": true,});

      } catch (error) {
        // console.log("attachments add error", error);
        return res.status(400).json({
          success: false,
          message: MESSAGES.catchError,
          error: error.message

        })
      }
    }

    // return res.status(200).send({user:lead});
    let contactNumber = phoneResult.contact_no ? phoneResult.contact_no : "";
    let customerName = reqData.customer_name ? reqData.customer_name : "";
    // console.log("wdecwdc",customerName,contactNumber)
    let apiQuestionsData = {
      "leadId": leadId,
      "organization_id": tokenData.organization_id,
      "question_1": reqData.question_1 ? reqData.question_1 : null,
      "answer_1": reqData.answer_1 ? reqData.answer_1 : null,
      "question_2": reqData.question_2 ? reqData.question_2 : null,
      "answer_2": reqData.answer_2 ? reqData.answer_2 : null,
      "question_3": reqData.question_3 ? reqData.question_3 : null,
      "answer_3": reqData.answer_3 ? reqData.answer_3 : null,
      "question_4": reqData.question_4 ? reqData.question_4 : null,
      "answer_4": reqData.answer_4 ? reqData.answer_4 : null,
    }
    // const fcmTokens = (
    //   await admin.firestore().collection("fcmTokens").doc(tokenData.organization_id).get()
    // ).data();
    try {
      //   let userDocs = await firestore()
      // .collection("users")
      // .where("organization_id", "==", tokenData.organization_id)
      // .where("profile", "==", "Lead Manager")
      // .get();

      let userDocs = await userModel.find({ organization_id: tokenData.organization_id,  $or: [
        { profile: "Lead Manager" },
        { profile: "Admin" }
      ] }).lean()
      userDocs.forEach(async (doc) => {
        let uid = doc?.uid ? doc?.uid : "";
        let userFcmToken = doc?.fcm_token ? doc?.fcm_token  : "";
        // if(fcmToken){
        //   fcmTokensArray.push(fcmToken);
        // }
        // console.log("cdwejndcjdncjd",customerName,contactNumber);
        // await sendNotification(tokenData.organization_id, uid, leadId, customerName, contactNumber);
        await sendNotificationToSingleUser(userFcmToken, "API Lead",  `A new lead is searching for a property. Please take immediate action on the same.`);
        await createNotification(leadId, "API Lead", `A new lead is searching for a property. Please take immediate action on the same.`, tokenData.organization_id);
      })
      // await sendNotificationsToMultipleUsers(fcmTokensArray, "API Lead",  `A new lead is searching for a property. Please take immediate action on the same.`);

    } catch (err) {
      console.log(err)
      // console.log("api re enquired lead notification not sent",err);
      return res.status(400).json({
        success: false,
        error: err.message
      })
    }

    let user = await userModel.findOne({uid});
    let userFcmToken = user?.fcm_token ? user?.fcm_token  : "";
    if (autoRotationEnabled == "ON") {
      // await sendNotificationAutoRotation(tokenData.organization_id, uid, leadId, customerName, contactNumber);
      await sendNotificationToSingleUser(userFcmToken,"Lead expiring soon! ☹️", `A new API lead is here. Please take immediate action or this will be auto rotated.`);
      // await createNotification(uid,"New Leads",`1 leads assigned`,tokenData.organization_id)
      await createNotification(uid, "Lead expiring soon! ☹️", `A new API lead is here. Please take immediate action or this will be auto rotated.`, tokenData.organization_id);
    } else {
      // await sendNotification(tokenData.organization_id, uid, leadId, customerName, contactNumber);
      await sendNotificationToSingleUser(userFcmToken,"API Lead", `A new lead is searching for a property. Please take immediate action on the same.`);
      // await createNotification(uid,"New Leads",`1 leads assigned`,tokenData.organization_id)
      await createNotification(uid, "API Lead", `A new lead is searching for a property. Please take immediate action on the same.`, tokenData.organization_id);
    }
    // await sendSms(tokenData.organization_id, phoneResult.contact_no);
    // await addApiQuestions(apiQuestionsData);
    await apiQuestionsModel.create(apiQuestionsData);
    return res
      .status(200)
      .send({ message: "Thank You! We will get back to you soon", leadId: leadId });

  } 
}
catch (error) {
  // console.log("error: ",error)
  return res.status(400).json({
    success: false,
    error: error.message
  })
}
}

apiDataController.CreateAPILeadWithoutToken = async (req, res) => {
  try {
    const generateUniqueId = () => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let uniqueId = '';

      for (let i = 0; i < 20; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uniqueId += characters[randomIndex];
      }

      return uniqueId;
    }
    //  return res.status(200).send(generateUniqueId());
    let reqData = req.body;
    let autoRotationData;
    const splittedUrl = req.url.split("?");
    if (splittedUrl.length === 2) {
      reqData = qs.parse(splittedUrl[1]);
    }



    // if (reqData.token === undefined || reqData.token === "") {
    //   return res.status(400).send({ success: false, message: "Token Not Found", error: "token not found" });

    // }


    let uid = "";
    let fail_reason = "";

    // const tokenData = await apiTokenModel.findOne({ token: reqData.token });
    const tokenData = {
      organization_id: reqData.organization_id,
      source: reqData.integration_name,
    }
    let phoneResult = {
      contact_no: reqData.contact_no ? reqData.contact_no : "",
      country_code: reqData.country_code ? reqData.country_code : "",
    };

    // console.log("dfedfedfre",tokenData);


    // if (tokenData === undefined) {
    //   return res.status(400).json({ success: false, message: "Invalid Token", error: "token data not found" });

    // }
    // if (tokenData.status === "INACTIVE") {
    //   return res.status(400).json({ success: false, message: "Token is Inactive", error: "Token is Inactive" });

    // }

    if (
      typeof reqData.contact_no !== "string" ||
      reqData.contact_no === undefined ||
      reqData.contact_no === "" 
      // || contactValidator(reqData.contact_no)==="Invalid Phone No."
    ) {

      fail_reason = "Mobile Empty";
      await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
      return res.status(400).json({ success: false, message: "Mobile Empty", error: "Mobile Empty" });

    } else if (
      typeof reqData.customer_name !== "string" ||
      reqData.customer_name === undefined ||
      reqData.customer_name === "" 
      // || alphabetValidator(reqData.customer_name)==="Invalid Name"
    ) {
      fail_reason = "Invalid Customer Name";
      await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
      return res.status(400).json({ succes: false, message: "Invalid Customer Name" });

    }
    else if (
      reqData.property_type !== undefined &&
      typeof reqData.property_type !== "string"
    ) {
      fail_reason = "Invalid Property Type";
      await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
      return res.status(400).json({ success: false, message: "Invalid Property Type", error: "Invalid Property Type" });

    }
    else {
      let contact = reqData.contact_no.replace(/\D/g, "");
      if (contact.startsWith("0")) {
        contact = contact.slice(1);
      }
      if (reqData.country_code === "+91") {
        phoneResult = {
          country_code: "+91",
          contact_no: contact.substr(contact.length - 10),
        };
      } else if (reqData.country_code && reqData.country_code !== "") {
        let code = reqData.country_code;
        if (code.startsWith("+")) {
          phoneResult.country_code = code;
        } else {
          phoneResult.country_code = "+" + code;
        }
        phoneResult.contact_no = contact;
      } else {
        if (reqData.contact_no.startsWith("+")) {
          phoneResult = {
            country_code: "+" + contact.slice(0, 2),
            contact_no: contact.slice(2),
          };
        } else {
          phoneResult = {
            country_code: "+91",
            contact_no: contact,
          };
        }
      }

      if (reqData.owner_email) {
        // const user = await firestore()
        //   .collection("users")
        //   .where("organization_id", "==", tokenData.organization_id)
        //   .where("user_email", "==", reqData.owner_email)
        //   .get();
        let user = await userModel.findOne({ organization_id: tokenData.organization_id, user_email: reqData.owner_email });
        if (user) {
          uid = user.uid;
        } else {
          fail_reason = "Owner Not Found";
          // await createFailedAPI(reqData, phoneResult, fail_reason, tokenData);
          await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
          return res.status(400).json({ success: false, message: "Owner Not Found", error: "Invalid Owner" });
        }
      }
      if (reqData.associate_contact) {
        // const user = await firestore()
        //   .collection("users")
        //   .where("organization_id", "==", tokenData.organization_id)
        //   .where("contact_no", "==", reqData.associate_contact)
        //   .get();
          const user = await userModel.findOne({organization_id:tokenData.organization_id,contact_no: reqData.associate_contact});
        if (user) {
          let userData = user;
          uid = userData.uid;
          reqData = { ...reqData, owner_email: userData.user_email };
        } else {
          reqData.owner_email = tokenData.primary_lead_manager_email
            ? tokenData.primary_lead_manager_email
            : "";
          uid = tokenData.primary_lead_manager_uid
            ? tokenData.primary_lead_manager_uid
            : "";
        }
      }
      try {
        let contactData = await leadModel.find({ organization_id: tokenData.organization_id,country_code:phoneResult.country_code,
          contact_no:phoneResult.contact_no,
          transfer_status:false})
        // console.log("contact data",contactData.data.data)
        if (contactData.length !== 0) {
          let uniqueId = generateUniqueId();
          fail_reason = "Duplicate Contact";
          // await sendSms(tokenData.organization_id, phoneResult.contact_no);
          await createFailedAPIData(reqData, phoneResult, fail_reason, tokenData);
          return res.status(400).json({ success: false, message:  "Contact Already Exists", error: "Contact Already Exists", leadId:uniqueId  });
        }
      } catch (error) {
        // console.log("An error occured while checking if lead exists",error);
      }

    if (uid === "") {
      // console.log("uid",uid);
      const userData = await leadDistributionMongo(tokenData.organization_id, {
        ...reqData,
        source: tokenData.source,
      });

      // console.log("autoRotationData",userData);
      if (userData?.userData) {
        reqData.owner_email = userData.userData.user_email;
        uid = userData.userData.uid;
        autoRotationData = userData.autoRotationData;
      } else {
        reqData.owner_email = tokenData.primary_lead_manager_email
          ? tokenData.primary_lead_manager_email
          : "";
        uid = tokenData.primary_lead_manager_uid
          ? tokenData.primary_lead_manager_uid
          : "";
      }
    }
    let leadDistributionId;
    let autoRotationEnabled;
    let autoRotationOwners;
    let nextRotationAt;


    if (autoRotationData) {
      leadDistributionId = autoRotationData.leadDistributionId ? autoRotationData.leadDistributionId : "";
      autoRotationEnabled = autoRotationData.autoRotationEnabled ? autoRotationData.autoRotationEnabled : "OFF";
      autoRotationOwners = autoRotationData.autoRotationOwners ? autoRotationData.autoRotationOwners : [];
      nextRotationAt = autoRotationData.nextRotationAt ? autoRotationData.nextRotationAt : "";
    }

    const leadId = new ObjectId()
    const leadData = {
      Id: leadId,
      alternate_no: reqData.alternate_no ? reqData.alternate_no : "",
      associate_status: true,
      budget: reqData.budget ? reqData.budget : "",
      contact_no: phoneResult.contact_no,
      country_code: phoneResult.country_code,
      created_at: Date.now(),
      created_by: reqData.created_by ? reqData.created_by : "",
      customer_image: "",
      customer_name: reqData.customer_name,
      email: reqData.email ? reqData.email : "",
      lead_source: tokenData.source,
      lead_assign_time: Date.now(),
      location: reqData.location ? reqData.location : "",
      lead_type: "Leads",
      lost_reason: "",
      not_int_reason: "",
      other_not_int_reason: "",
      other_lost_reason: "",
      previous_owner: "",
      project: reqData.project ? reqData.project : "",
      property_stage: reqData.property_stage ? reqData.property_stage : "",
      property_type: reqData.property_type ? reqData.property_type : "",
      source_status: true,
      stage: reqData.stage ? String(reqData.stage).toUpperCase() : "FRESH",
      transfer_status: false,
      uid: uid,
      feedback_time: "",
      next_follow_up_type: "",
      next_follow_up_date_time: "",
      organization_id: tokenData.organization_id,
      contact_owner_email: reqData.owner_email ? reqData.owner_email : "",
      campaign: reqData.campaign ? reqData.campaign : "",
      addset: reqData.addset ? reqData.addset : "",
      api_forms: reqData.api_forms ? reqData.api_forms : "",
      state: reqData.state ? reqData.state : "",
      leadDistributionId: leadDistributionId,
      autoRotationEnabled: autoRotationEnabled,
      autoRotationOwners: autoRotationOwners,
      nextRotationAt: nextRotationAt,
      property_id: reqData.property_id ? reqData.property_id : "",
      country: reqData.country ? reqData.country : "",
      city: reqData.city ? reqData.city : "",
      contact_message_details: reqData.contact_message_details ?  reqData.contact_message_details : "",
      mb_contact_id: reqData.mb_contact_id ?  reqData.mb_contact_id : "",
    };

    const lead = await leadModel.create(leadData);


    await createSuccessAPIData(reqData, phoneResult, tokenData, leadId);
    if (reqData.duration) {

      try {

        let calldataBody = {
          leadId: leadId,
          organization_id: tokenData.organization_id,
          uid: uid,
          created_at: Date.now(),
          duration: Number(reqData.duration),
        }

        let callsData = await callLogsModel.create(calldataBody);

        // console.log("call added", callsData.data.data)
      } catch (error) {
        // return res.status(400).json({
        //   success: false,
        //   message: "error occured in callLogs creation",
        //   error: error.message
        // })
      }
    }


    if (reqData.voice_url) {
      try {

        let attachmnentsData = {
          created_at: new Date(),
          name: "IVR Call",
          url: reqData.voice_url,
          type: "audio",
        }


        // let modifiedAttachmentData = convertTimestampsToDate(attachmnentsData);
        const query = {
          leadId: leadId,
        };
        const update = {
          $push: { attachments: attachmnentsData },
        };
        const options = {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        };
        const updatedDocument = await contactResourceMongoModel.findOneAndUpdate(query, update, options);
        // return res.status(200).json({"success": true,});

      } catch (error) {
        // console.log("attachments add error", error);
        // return res.status(400).json({
        //   success: false,
        //   message: MESSAGES.catchError,
        //   error: error.message

        // })
      }
    }

    // return res.status(200).send({user:lead});
    let contactNumber = phoneResult.contact_no ? phoneResult.contact_no : "";
    let customerName = reqData.customer_name ? reqData.customer_name : "";
    // console.log("wdecwdc",customerName,contactNumber)
    let apiQuestionsData = {
      "leadId": leadId,
      "organization_id": tokenData.organization_id,
      "question_1": reqData.question_1 ? reqData.question_1 : null,
      "answer_1": reqData.answer_1 ? reqData.answer_1 : null,
      "question_2": reqData.question_2 ? reqData.question_2 : null,
      "answer_2": reqData.answer_2 ? reqData.answer_2 : null,
      "question_3": reqData.question_3 ? reqData.question_3 : null,
      "answer_3": reqData.answer_3 ? reqData.answer_3 : null,
      "question_4": reqData.question_4 ? reqData.question_4 : null,
      "answer_4": reqData.answer_4 ? reqData.answer_4 : null,
    }
    // const fcmTokens = (
    //   await admin.firestore().collection("fcmTokens").doc(tokenData.organization_id).get()
    // ).data();
    try {
      //   let userDocs = await firestore()
      // .collection("users")
      // .where("organization_id", "==", tokenData.organization_id)
      // .where("profile", "==", "Lead Manager")
      // .get();

      let userDocs = await userModel.find({ organization_id: tokenData.organization_id,  $or: [
        { profile: "Lead Manager" },
        { profile: "Admin" }
      ] }).lean()
      userDocs.forEach(async (doc) => {
        let uid = doc?.uid ? doc?.uid : "";
        let userFcmToken = doc?.fcm_token ? doc?.fcm_token  : "";
        // fcmTokensArray.push(fcmToken);
        // console.log("cdwejndcjdncjd",customerName,contactNumber);
        // await sendNotification(tokenData.organization_id, uid, leadId, customerName, contactNumber);
        await sendNotificationToSingleUser(userFcmToken, "API Lead",  `A new lead is searching for a property. Please take immediate action on the same.`);
        await createNotification(leadId, "API Lead", `A new lead is searching for a property. Please take immediate action on the same.`, tokenData.organization_id);
      })
      // await sendNotificationsToMultipleUsers(fcmTokensArray, "API Lead",  `A new lead is searching for a property. Please take immediate action on the same.`);


    } catch (err) {
      console.log(err)
      // console.log("api re enquired lead notification not sent",err);
      // return res.status(400).json({
      //   success: false,
      //   error: err.message
      // })
    }

    let user = await userModel.findOne({uid});
    let userFcmToken = user?.fcm_token ? user?.fcm_token  : "";
    if (autoRotationEnabled == "ON") {
      // await sendNotificationAutoRotation(tokenData.organization_id, uid, leadId, customerName, contactNumber);
      await sendNotificationToSingleUser(userFcmToken,"Lead expiring soon! ☹️", `A new API lead is here. Please take immediate action or this will be auto rotated.`);
      // await createNotification(uid,"New Leads",`1 leads assigned`,tokenData.organization_id)
      await createNotification(uid, "Lead expiring soon! ☹️", `A new API lead is here. Please take immediate action or this will be auto rotated.`, tokenData.organization_id);
    } else {
      // await sendNotification(tokenData.organization_id, uid, leadId, customerName, contactNumber);
      await sendNotificationToSingleUser(userFcmToken,"API Lead", `A new lead is searching for a property. Please take immediate action on the same.`);
      // await createNotification(uid,"New Leads",`1 leads assigned`,tokenData.organization_id)
      await createNotification(uid, "API Lead", `A new lead is searching for a property. Please take immediate action on the same.`, tokenData.organization_id);;
    }
    // await sendSms(tokenData.organization_id, phoneResult.contact_no);
    // await addApiQuestions(apiQuestionsData);
    await apiQuestionsModel.create(apiQuestionsData);
    return res
      .status(200)
      .send({ message: "Thank You! We will get back to you soon", leadId: leadId });

  } 
}
catch (error) {
  // console.log("error: ",error)
  return res.status(400).json({
    success: false,
    error: error.message,
    message: "Server Error"
  })
}
}

module.exports = apiDataController;