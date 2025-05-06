var ObjectId = require('mongoose').Types.ObjectId;
const apiDataModel = require('../models/apiDataSchema');
const leadDistributionModel=require("../models/leadDistributionSchema")
const userModel=require("../models/userSchema")
const crypto = require('crypto');

exports.createFailedAPIData = async (
  reqData,
  phoneResult,
  fail_reason,
  tokenData
) => {
  try {
    await apiDataModel.create({
      status: "FAIL",
      alternate_no: reqData.alternate_no ? reqData.alternate_no : "",
      budget: reqData.budget ? reqData.budget : "",
      contact_no: phoneResult.contact_no ? phoneResult.contact_no : "",
      country_code: phoneResult.country_code ? phoneResult.country_code : "",
      created_by: reqData.created_by ? reqData.created_by : "",
      customer_name: reqData.customer_name ? reqData.customer_name : "",
      email: reqData.email ? reqData.email : "",
      lead_source: tokenData.source,
      location: reqData.location ? reqData.location : "",
      project: reqData.project ? reqData.project : "",
      property_stage: reqData.property_stage ? reqData.property_stage : "",
      property_type: reqData.property_type ? reqData.property_type : "",
      stage: reqData.stage ? String(reqData.stage).toUpperCase() : "FRESH",
      organization_id: tokenData.organization_id,
      contact_owner_email: reqData.owner_email ? reqData.owner_email : "",
      api_forms: reqData.api_forms ? reqData.api_forms : "",
      associate_contact: reqData.associate_contact
        ? reqData.associate_contact
        : "",
      fail_reason,
      state: reqData.state ? reqData.state : "",
    });
    return;
  } catch (error) {
    console.log("error in catch",error.message)
    return;
  }

};

exports.createSuccessAPIData = async (
  reqData,
  phoneResult,
  tokenData,
  leadId
) => {
  try {
    await apiDataModel.create({
      status: "SUCCESS",
      leadId: leadId,
      alternate_no: reqData.alternate_no ? reqData.alternate_no : "",
      budget: reqData.budget ? reqData.budget : "",
      contact_no: phoneResult.contact_no ? phoneResult.contact_no : "",
      country_code: phoneResult.country_code ? phoneResult.country_code : "",
      created_by: reqData.created_by ? reqData.created_by : "",
      customer_name: reqData.customer_name,
      email: reqData.email ? reqData.email : "",
      lead_source: tokenData.source,
      location: reqData.location ? reqData.location : "",
      project: reqData.project ? reqData.project : "",
      property_stage: reqData.property_stage ? reqData.property_stage : "",
      property_type: reqData.property_type ? reqData.property_type : "",
      stage: reqData.stage ? String(reqData.stage).toUpperCase() : "FRESH",
      organization_id: tokenData.organization_id,
      contact_owner_email: reqData.owner_email ? reqData.owner_email : "",
      api_forms: reqData.api_forms ? reqData.api_forms : "",
      associate_contact: reqData.associate_contact
        ? reqData.associate_contact
        : "",
      state: reqData.state ? reqData.state : "",
    });
    return;
  } catch (error) {
    console.log("error in catch",error.message);
    return ;
  }
};

exports.fetchLeadDistribution = async (
  organization_id
) => {
  try {

    // all data fetched from the organization 
    const data = await leadDistributionModel
      .find({ organization_id: organization_id }, { __v: 0 }).lean()


    // await emailMapper(data);

    const uniqueUserIds = [...new Set(data.flatMap(key => [...key.users, key.returnLeadTo].filter((id) => id != "")))];
    const modifiedData = await userModel.find({ uid: { $in: uniqueUserIds } }, { user_email: 1, uid: 1, _id: 0 });

    const userMapping = {};
    modifiedData.forEach(user => {
      userMapping[user.uid] = user.user_email;
    });

    data.forEach((val) => {
      val.usersWithUid = val.users.map((user) => ({ uid: user, user_email: userMapping[user] }));
      val.users = val.users.map((user) => userMapping[user]);
      val.returnLeadTo = val.returnLeadTo ? userMapping[val.returnLeadTo] : "";
    });


    return data;
  } catch (error) {
    console.log("error occured in catch", error.message)
    return [] ;
  }
}

exports.updateLeadDistribution = async (
  Id, data
) => {
  try {

    // Add a modifiedAt field with the current timestamp
    data.modified_at = new Date();
    const update = await leadDistributionModel.findOneAndUpdate(
        { _id: Id },
        { $set: data },
      
    );

    return ;

} catch (error) {
    console.log("cathc error ",error.message);
    return undefined;
}

}