// const subscriptionDetailsModel = require('../models/subscriptionDetailsSchema.js');
// const app=require("../../firebase");
const admin = require("../../firebaseAdmin");
const apiTokenModel= require("../models/apiTokenSchema")
const crypto = require('crypto');
const axios = require('axios');
const packageDetailsModel= require("../models/packageDetailsSchema")
const nodemailer = require('nodemailer');
const { generateSalt, hashPassword } = require("../functions/authScrypt")
const organizationModel=require("../models/organizationSchema")
const mongoose = require('mongoose');
const userModel=require("../models/userSchema")
const organResourcesModel= require("../models/organizationResourcesSchema")
var ObjectId = require('mongoose').Types.ObjectId;
const {query} = require('../../src/database/mariaDb');

const MB_URL = process.env.MB_URL;
const MB_LMS_URL = process.env.MB_LMS_URL;

const subscriptionDetailsController = {};

// Create a transporter object using the SMTP details without authentication
const transporter = nodemailer.createTransport({
  host: 'read-pro.smtp.mbrsl.mb',
  port: 25,
  secure: false, // true for 465, false for other ports
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});

const generateToken = (length) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') // Convert to hexadecimal format
    .slice(0, length); // Trim to desired length
}

const createTokenGenration= async(organization_id,organizationUid,session)=>{
  try {
    const token = generateToken(20);
    await apiTokenModel.create([{
      organization_id:organization_id,
      source:"Magicbricks",
      country_code:"",
      created_by:organizationUid,
      modified_by:organizationUid,
      token
    }],{session});

    return token;
  } catch (error) {
    throw new Error(error.message);
  }
}

const callThirdPartyAPI=async(oid, apiToken,organization_name)=>{
  try {
  const thirdPartyUrl =  `${MB_LMS_URL}/propertyServiceCRMApi/createReadProEntry`;
  const requestBody = {
    orgName: organization_name,
    url: "https://api.read-pro.com/createContacts",
    oid: oid,
    token: apiToken
  };

 console.log("request body of third part api",requestBody)
    const response = await axios.post(thirdPartyUrl, requestBody);
console.log("response calling third-party API :",response)
    // Return response data
    return response.data;
  } catch (error) {
    // If an error occurs, handle it here
    console.log("Error calling third-party API Time :", new Date())
    console.log("loggg Error calling third-party API:",error.message)
    console.error("Error calling third-party API:", error.message);
    return null;
  }
}

const getSubUsers = async (userId) => {
  try {
    const thirdPartyUrl = `${MB_URL}/userauthapi/get-subusers?userId=${userId}`;

    const config = {
      headers: {
        'Authorization': 'ReadProRequest'
      }
    };

    const response = await axios.get(thirdPartyUrl, config);
    // Return response data
    console.log("getSubUsers date : ",new Date() )
    console.log("getSubUsers from MB",response.data)
    return response.data;
  } catch (error) {
    // If an error occurs, handle it here
    console.error("Error calling getSubUsers API:", error.message);
    return null;
  }
}

const createSubUsers = async (subUserdata,admin,organization_id,session) => {
  console.log("subUserdata in createSubUsers",subUserdata)
  try {
    if(subUserdata.length===0){
      return "Sub User Not recived Form MB"
    }

    console.log("hddjjksjksk )))))))))))))) ")
    let createdUsers = [];
    let errors = [];

    for (let userData of subUserdata) {
      const { user_email, user_mobile, user_oid, user_first_name, user_last_name, user_super_oid } = userData;
console.log(" in for userData",userData)
      // Check if the user already exists in ReadPro
      let userAlreadyExistsInReadpro = await userModel.findOne({ user_email });

      if (userAlreadyExistsInReadpro) {
        errors.push({
          user_email,
          message: "User already exists"
        });
        continue;
      }

      let userAlreadyExistsInReadproMobile = await userModel.findOne({ contact_no:user_mobile });

      if (userAlreadyExistsInReadproMobile) {
        errors.push({
          user_mobile,
          message: "User already exists"
        });
        continue;
      }

      // Check if the user already exists in the organization
      // let userAlreadyExistsInOrg = await checkUserExistsInOrganization(user_super_oid, user_email, user_mobile, user_oid);

      // if (userAlreadyExistsInOrg) {
      //   errors.push({
      //     user_email,
      //     message: "User with the same contact number or employee ID already exists in the organization"
      //   });
      //   continue;
      // }

      let password = "";

      const mobileDigits = user_mobile.toString().slice(0, 4);
      if (user_first_name.length >= 4) {
        password = user_first_name.slice(0, 4).toUpperCase();
      } else {
        password = user_first_name.toUpperCase();
        if (user_last_name) {
          password += user_last_name.slice(0, 4 - user_first_name.length).toUpperCase();
        }
        while (password.length < 4) {
          password += "0";
        }
      }
      password += "@" + mobileDigits;
console.log("Sub password",password)
      let passwordSalt = generateSalt();
      let hashedPassword = await hashPassword(password, passwordSalt);
      console.log("passwordSalt date : ",new Date() )
      console.log("passwordSalt : ",passwordSalt)
      console.log("hashedPassword : ",hashedPassword)
      let uid = new ObjectId();
      let admin_first_name = admin.admin_first_name ? admin.admin_first_name :""
      let admin_last_name = admin.admin_last_name ? admin.admin_last_name :""
      let admin_name = admin_first_name+admin_last_name
      const newUser ={
        contact_no: user_mobile,
        created_by: admin_name,
        designation: "Sales",
        branch: "",
        device_id: "",
        organization_id: organization_id,
        profile: "Sales",
        reporting_to: admin.admin_email_id,
        status: "ACTIVE",
        team: "",
        uid: uid,
        user_email: user_email,
        user_first_name: user_first_name,
        user_image: "",
        user_last_name: user_last_name?user_last_name:"",
        branchPermission: "",
        leadView: "",
        group_head_name: admin_name,
        employee_id: "",
        password: hashedPassword,
        passwordSalt: passwordSalt,
        role: "Sales",
        first_login: true,
        user_oid: user_oid,
        user_super_oid: user_super_oid
      };
      console.log("createSubUsers date : ",new Date() )
      console.log("user_email : ",user_email)
      console.log("password : ",password)
      createdUsers.push(newUser);
    }
    console.log("All createSubUsers date : ",new Date() )
    console.log("All createdUsers : ",createdUsers)
    const multiUser = await userModel.insertMany(createdUsers, { session });


      return true;

  } catch (error) {
    console.log("error in sub ",error)
    return "Sub User API Failed"
  }
};


const updateOrganizationInMongo= async (packageDetails, organization_id,no_of_employees,session) => {
  try {
    let currentTime = new Date();
    let valid_From = new Date(packageDetails.valid_from);
    valid_From.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    let valid_Till = new Date(packageDetails.valid_till);
    valid_Till.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    let currentNoOfEmployees = no_of_employees; // Save the value of no_of_employees

    let totalNoOfEmployees=parseInt(packageDetails.no_of_employees)+parseInt(currentNoOfEmployees)

    await organizationModel.findOneAndUpdate({organization_id:organization_id},{
      no_of_employees: totalNoOfEmployees.toString(), // Update the number of employees
      status: "ACTIVE",
      cost_per_license: 0,
      valid_from: valid_From,
      valid_till: valid_Till,
      current_active_status: true,
      organization_active_status: true,
      service_id: packageDetails.service_id,
      package_id: packageDetails.package_id,
      plus_valid_till:packageDetails.package_type,
    },{ session: session });

    // Create the package details document
    await packageDetailsModel.create([{
      organization_id: organization_id,
      service_id: packageDetails.service_id,
      package_id: packageDetails.package_id,
      issued_licences: packageDetails.no_of_employees,
      oid: packageDetails.oid,
      valid_till: valid_Till,
      valid_from: valid_From,
      package_email_id: packageDetails.admin_email_id,
      package_status: "active",
      package_name: packageDetails.package_name,
      package_amount: packageDetails.package_amount,
      no_of_unit: packageDetails.no_of_unit
    }],{ session: session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    console.log("Error", error);
    throw error.message;
  }
};

// const updateCallRecordingPackageInMongo= async (packageDetails, organization_id,session) => {
//   try {
//     let currentTime = new Date();
//     let valid_From = new Date(packageDetails.valid_from);
//     valid_From.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
//     // let vf = admin.firestore.Timestamp.fromDate(valid_From);

//     let valid_Till = new Date(packageDetails.valid_till);
//     valid_Till.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

//     await organizationModel.findOneAndUpdate({organization_id:organization_id},{
//       is_call_recording_enabled: true,
//       is_call_recording_subscribed: true
//     },{ session: session });

//     // Create the package details document
//     await packageDetailsModel.create([{
//       organization_id: organization_id,
//       service_id: packageDetails.service_id,
//       package_id: packageDetails.package_id,
//       issued_licences: "0",
//       oid: packageDetails.oid,
//       valid_till: valid_Till,
//       valid_from: valid_From,
//       package_email_id: packageDetails.admin_email_id,
//       package_status: "active"
//     }],{ session: session });

//     await session.commitTransaction();
//     session.endSession();
//   } catch (error) {
//     // await session.abortTransaction();
//     // session.endSession();
//     console.log("Error", error);
//     throw error.message;
//   }
// };

/**
 * Updates organization and package details in MongoDB.
 * 
 * @param {Object} packageDetails - The details of the package being updated.
 * @param {string} organization_id - The unique identifier for the organization.
 * @param {Object} session - The MongoDB transaction session.
 * @param {boolean} isNewOrgCreation - Flag indicating if this is a new organization creation.
 */
const updateOtherPackagesInMongo = async (packageDetails, organization_id, session, isNewOrgCreation) => {
  try {
    // Ensure current date and time is used consistently for 'valid_from' and 'valid_till'
    let currentTime = new Date();
    let valid_From = new Date(packageDetails.valid_from);
    valid_From.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    let valid_Till = new Date(packageDetails.valid_till);
    valid_Till.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    // Check if the service requires call recording features to be enabled for the organization
    if (packageDetails.service_id === "13738") {
      await organizationModel.findOneAndUpdate(
        { organization_id: organization_id },
        {
          is_call_recording_enabled: true,
          is_call_recording_subscribed: true,
        },
        { session: session }
      );
    }

    // Create a new document in the 'packageDetailsModel' collection for the given package
    await packageDetailsModel.create(
      [
        {
          organization_id: organization_id,
          service_id: packageDetails.service_id,
          package_id: packageDetails.package_id,
          issued_licences: "0", // Default value (As this package is not a licensing package);
          oid: packageDetails.oid,
          valid_till: valid_Till,
          valid_from: valid_From,
          package_email_id: packageDetails.admin_email_id,
          package_status: "active",
          package_name: packageDetails.package_name,
          package_amount: packageDetails.package_amount,
          no_of_unit: packageDetails.no_of_unit,
        },
      ],
      { session: session }
    );

    // Commit the transaction and end the session
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    // Abort the transaction and end the session in case of an error
    // if (session.inTransaction()) {
    //   await session.abortTransaction();
    // }
    // session.endSession();

    // Log the error for debugging
    console.log("Error in updateOtherPackagesInMongo:", error);

    // Rethrow the error unless it's a new organization creation
    if (!isNewOrgCreation) {
      throw new Error(error.message || "An error occurred during the package update process.");
    }
  }
};

const createOtherPackagesInMongo = async (packageDetails, organization_id, session, isNewOrgCreation) => {
  try {
    // Ensure current date and time is used consistently for 'valid_from' and 'valid_till'
    let currentTime = new Date();
    let valid_From = new Date(packageDetails.valid_from);
    valid_From.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    let valid_Till = new Date(packageDetails.valid_till);
    valid_Till.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    // Check if the service requires call recording features to be enabled for the organization
    if (packageDetails.service_id === "13738") {
      await organizationModel.findOneAndUpdate(
        { organization_id: organization_id },
        {
          is_call_recording_enabled: true,
          is_call_recording_subscribed: true,
        },
        { session: session }
      );
    }

    // Create a new document in the 'packageDetailsModel' collection for the given package
    await packageDetailsModel.create(
      [
        {
          organization_id: organization_id,
          service_id: packageDetails.service_id,
          package_id: packageDetails.package_id,
          issued_licences: "0", // Default value (As this package is not a licensing package);
          oid: packageDetails.oid,
          valid_till: valid_Till,
          valid_from: valid_From,
          package_email_id: packageDetails.admin_email_id,
          package_status: "active",
          package_name: packageDetails.package_name,
          package_amount: packageDetails.package_amount,
          no_of_unit: packageDetails.no_of_unit,
        },
      ],
      { session: session }
    );

    // Commit the transaction and end the session
    // await session.commitTransaction();
    // session.endSession();
  } catch (error) {
    // Abort the transaction and end the session in case of an error
    // if (session.inTransaction()) {
    //   await session.abortTransaction();
    // }
    // session.endSession();

    // Log the error for debugging
    console.log("Error in updateOtherPackagesInMongo:", error);

    // Rethrow the error unless it's a new organization creation
    if (!isNewOrgCreation) {
      throw new Error(error.message || "An error occurred during the package update process.");
    }
  }
};

// const addService = async (packageDetails, organization_id, isNewOrgCreation) => {
//   try {
//     // Get the current timestamp
//     const currentTime = new Date();

//     // Adjust valid_from and valid_till timestamps
//     const valid_From = new Date(packageDetails.valid_from);
//     valid_From.setHours(
//       currentTime.getHours(),
//       currentTime.getMinutes(),
//       currentTime.getSeconds(),
//       currentTime.getMilliseconds()
//     );

//     const valid_Till = new Date(packageDetails.valid_till);
//     valid_Till.setHours(
//       currentTime.getHours(),
//       currentTime.getMinutes(),
//       currentTime.getSeconds(),
//       currentTime.getMilliseconds()
//     );

//     if(packageDetails.service_id == "13738"){
//       await organizationModel.findOneAndUpdate({organization_id:organization_id},{
//         is_call_recording_enabled: true,
//         is_call_recording_subscribed: true
//       },{ session: session });
//     }

//     // SQL query string with placeholders
//     const sql = `
//       INSERT INTO pkg_services 
//       (organization_id, package_id, oid, valid_till, valid_from, isactive,
//        createdate, service_id, no_of_units, unit_used, package_name, package_amount) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//     // Execute the query with provided values
//     const result = await query(sql, [
//       organization_id,
//       packageDetails.package_id,
//       packageDetails.oid,
//       valid_Till,
//       valid_From,
//       "active",
//       currentTime,
//       packageDetails.service_id,
//       packageDetails.no_of_unit,
//       "",
//       packageDetails.package_name,
//       packageDetails.package_amount,
//     ]);

//     // Log successful execution
//     console.log(`[${new Date().toISOString()}] Service added successfully.`);

//   } catch (error) {
//     // Log the error with a timestamp and stack trace
//     console.log(
//       `[${new Date().toISOString()}] Error in addService: Service couldn't be added.\n` +
//       `Details:\nOrganization ID: ${organization_id}\nPackage Details: ${JSON.stringify(packageDetails, null, 2)}\n` +
//       `Error Message: ${error.message}\nError Stack:\n${error.stack}`
//     );
//     if(isNewOrgCreation === false){
//       throw new Error("Error occurred in addService. Please check logs for details.");
//     }
//   }
// };

subscriptionDetailsController.updateSubscriptionDetails = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const session2 = await mongoose.startSession();
  try {
    console.log(`Time - ${new Date()}, api endpoint - subscriptionDetails/updateSubscriptionDetails, Api Hit Successful`);
    // const { organization_id, source, country_code, created_by, modified_by } = req.body;
    // const token = generateToken(20);

    let data = req.body;

    // Start - Call Recording Package Handling Function 

    // if (data.service_id == "13738") {
    //   if (
    //     !data.organization_name ||
    //     !data.mobile_number ||
    //     !data.email_id ||
    //     !data.address ||
    //     !data.country ||
    //     !data.state ||
    //     !data.city ||
    //     !data.pincode ||
    //     !data.admin_first_name ||
    //     !data.admin_contact_number ||
    //     !data.admin_email_id ||
    //     // !data.no_of_licenses ||
    //     !data.valid_from ||
    //     !data.valid_till ||
    //     !data.service_id ||
    //     !data.package_id ||
    //     !data.oid
    //   ) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Missing required parameters"
    //     });
    //   }
    //   let isOrganizationExistAlready = await organizationModel.findOne({ admin_email_id: data.admin_email_id.toLowerCase() });
    //   let currentTime = new Date();
    //   let validTill = new Date(data.valid_till);
    //   validTill.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
    //   let validFrom = new Date(data.valid_from);
    //   validFrom.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
    //   let subscriptionData = {
    //     organization_name: data.organization_name,
    //     mobile_number: data.mobile_number,
    //     email_id: data.email_id,
    //     address: data.address,
    //     country: data.country,
    //     state: data.state,
    //     city: data.city,
    //     pincode: data.pincode,
    //     admin_first_name: data.admin_first_name,
    //     admin_last_name: data.admin_last_name ? data.admin_last_name : "",
    //     admin_contact_number: data.admin_contact_number,
    //     admin_email_id: data.admin_email_id.toLowerCase(),
    //     // no_of_employees: data.no_of_licenses,
    //     valid_from: validFrom,
    //     valid_till: validTill,
    //     service_id: data.service_id,
    //     package_id: data.package_id,
    //     oid: data.oid,
    //     // plus_valid_till: data.plus_valid_till ? data.plus_valid_till : isOrganizationExistAlready?.plus_valid_till ? isOrganizationExistAlready?.plus_valid_till : null,
    //   }


    //   if (!isOrganizationExistAlready) {
    //     isOrganizationExistAlready = await organizationModel.findOne({ oid: data.oid });
    //   }

    //   if (isOrganizationExistAlready) {
    //     let organizationId = isOrganizationExistAlready.organization_id;

    //     let orgUpdatedPackage = await updateCallRecordingPackageInMongo(subscriptionData, organizationId, session);
    //     // await session.commitTransaction();
    //     // session.endSession();
    //     return res.status(201).json({
    //       success: true,
    //       message: "Package added successfully"
    //     });
    //   } else {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Organization doesn't exists",
    //       error: "Organization doesn't exists"
    //     });
    //   }
    // }

    // End - Call Recording Package Handling Function 
    if (
      !data.organization_name ||
      !data.mobile_number ||
      !data.email_id ||
      !data.address ||
      !data.country ||
      !data.state ||
      !data.city ||
      !data.pincode ||
      !data.admin_first_name ||
      !data.admin_contact_number ||
      !data.admin_email_id ||
      // !data.no_of_licenses ||
      !data.valid_from ||
      !data.valid_till ||
      !data.service_id ||
      !data.package_id ||
      !data.oid
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    if (
      (data.service_id == "13737" || data.service_id == "13733") && !data.no_of_licenses
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    if ((data.service_id == "13737" || data.service_id == "13733") && isNaN(parseInt(data.no_of_licenses))) {
      return res.status(400).json({
        success: false,
        message: "Number of licenses is not a number"
      });
    }


    let isOrganizationExistAlready;
    isOrganizationExistAlready = await organizationModel.findOne({ admin_email_id: data.admin_email_id.toLowerCase() });

    if (!isOrganizationExistAlready) {
      isOrganizationExistAlready = await organizationModel.findOne({ oid: data.oid });
    }

    let currentTime = new Date();
    let validTill = new Date(data.valid_till);
    validTill.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
    let validFrom = new Date(data.valid_from);
    validFrom.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    let subscriptionData = {
      organization_name: data.organization_name,
      mobile_number: data.mobile_number,
      email_id: data.email_id,
      address: data.address,
      country: data.country,
      state: data.state,
      city: data.city,
      pincode: data.pincode,
      admin_first_name: data.admin_first_name,
      admin_last_name: data.admin_last_name ? data.admin_last_name : "",
      admin_contact_number: data.admin_contact_number,
      admin_email_id: data.admin_email_id.toLowerCase(),
      no_of_employees: data.no_of_licenses ? data.no_of_licenses : 0,
      valid_from: validFrom,
      valid_till: validTill,
      service_id: data.service_id,
      package_id: data.package_id,
      oid: data.oid,
      plus_valid_till: data.plus_valid_till ? data.plus_valid_till : isOrganizationExistAlready?.plus_valid_till ? isOrganizationExistAlready?.plus_valid_till : null,
      no_of_unit: data.no_of_unit ? data.no_of_unit : "",
      package_name: data.package_name ? data.package_name : "",
      package_amount: data.package_amount ? data.package_amount : ""
    }

    if (isOrganizationExistAlready) {
      let organizationId = isOrganizationExistAlready.organization_id;

      if (data.service_id == "13737" || data.service_id == "13733") {
        let orgUpdatedPackage = await updateOrganizationInMongo(subscriptionData, organizationId, isOrganizationExistAlready.no_of_employees, session);
      } else {
        // let serviceAdded = await addService(subscriptionData, organizationId, false);
        let otherPackageAdded = await updateOtherPackagesInMongo(subscriptionData, organizationId, session,false);
      }
      // await session.commitTransaction();
      // session.endSession();
      return res.status(201).json({
        success: true,
        message: "Subscription updated successfully"
      });
    } else {
      const orgId = new ObjectId();
      const uid = new ObjectId();
      const organizationData = {
        ...subscriptionData,
        organization_id: orgId,
        auth_id: uid,
        created_by: "AUTO",
        business_domain: "Real Estate"
      };

      let apiToken
      try {
        const org = await organizationModel.create([organizationData], { session });

        if (data.service_id == "13737" || data.service_id == "13733") {
          const package = await packageDetailsModel.create([{
            organization_id: orgId,
            service_id: data.service_id,
            package_id: data.package_id,
            issued_licences: data.no_of_licenses,
            oid: data.oid,
            valid_till: validTill,
            valid_from: validFrom,
            package_email_id: data.admin_email_id.toLowerCase(),
            package_status: "active",
            package_name: data.package_name ? data.package_name : "",
            package_amount: data.package_amount ? data.package_amount : "",
            no_of_unit: data.no_of_unit ? data.no_of_unit : ""
          }], { session });
        } else {
          // let serviceAdded = await addService(subscriptionData, orgId, true);
          let otherPackageAdded = await createOtherPackagesInMongo(subscriptionData, orgId, session,true);
        }

        let password = "";

        const mobileDigits = data.admin_contact_number.toString().slice(0, 4);
        if (data.admin_first_name.length >= 4) {
          password = data.admin_first_name.slice(0, 4).toUpperCase();
        } else {
          password = data.admin_first_name.toUpperCase();
          if (data.admin_last_name) {
            password += data.admin_last_name.slice(0, 4 - data.admin_first_name.length).toUpperCase();
          }
          while (password.length < 4) {
            password += "0";
          }
        }
        password += "@" + mobileDigits;
        const salt = generateSalt();
        const NewPassword = await hashPassword(password, salt);

        const check = await userModel.findOne({ user_email: data.admin_email_id });

        if (check) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: "user already exists"
          });
        }

        const userAdmin = await userModel.create([{
          user_first_name: data.admin_first_name,
          user_last_name: data.admin_last_name,
          user_email: data.admin_email_id.toLowerCase(),
          team: "",
          reporting_to: "",
          contact_no: data.admin_contact_number,
          designation: "Organization Admin",
          status: "ACTIVE",
          organization_id: orgId,
          created_by: "Super Admin",
          profile: "Admin",
          uid: uid,
          user_image: "",
          device_id: "",
          country: data.country,
          state: data.state,
          password: NewPassword,
          passwordSalt: salt,
          role: "organization",
          first_login: true,
          user_oid: data.oid,
          user_super_oid: data.oid
        }], { session });

        const organizationResource = await organResourcesModel.create([{
          organization_id: orgId,
          permission: {
            "Sales": [
              "Budget",
              "Contact No.",
              "Created At",
              "Customer Name",
              "Email",
              "Source",
              "Assign Time",
              "Owner",
              "Follow Up Date Time",
              "Follow Up Type",
              "Property Type",
              "Property Stage",
              "Project",
              "Location"
            ],
            "Team Lead": [
              "Budget",
              "Contact No.",
              "Created At",
              "Created By",
              "Customer Name",
              "Email",
              "Source",
              "Assign Time",
              "Location",
              "Project",
              "Property Stage",
              "Property Type",
              "Follow Up Date Time",
              "Owner"
            ]
          }
        }], { session });

        apiToken = await createTokenGenration(orgId, uid, session);
        await session.commitTransaction();
        session.endSession();
      }
      catch (error) {
        console.log(`Time - ${new Date()}, api endpoint - subscriptionDetails/updateSubscriptionDetails, error - ${error}`);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Organization not created"
        });
      }

      const orgName = data.admin_first_name + (data.admin_last_name ? data.admin_last_name : "");

      const response = await callThirdPartyAPI(data.oid, apiToken, orgName);
      if (response !== null) {
        await organizationModel.findOneAndUpdate({ admin_email_id: data.admin_email_id.toLowerCase() }, {
          fail_at: "LMS"
        });
      }

      session2.startTransaction();
      const subUsers = await getSubUsers(data.oid)
      console.log("getSubUsers @@@ Date-Time", new Date())
      console.log("getSubUsers @@@ subUsers", subUsers)

      const create = await createSubUsers(subUsers, data, orgId, session2)
      console.log("createSubUsers Date-Time", new Date())
      console.log("createSubUsers", create)
      if (create === true) {
        await session2.commitTransaction();
        session2.endSession();
      } else {
        await organizationModel.findOneAndUpdate({ admin_email_id: data.admin_email_id.toLowerCase() }, {
          fail_at: create
        });
        await session2.abortTransaction();
        session2.endSession();
      }

      let id = data.admin_email_id.toLowerCase();

      let welcomeMail = `<div style="margin:0;background:#ffffff">
      <table width="100%" style="max-width:550px;background:#ffffff;border-left:1px solid #e4e4e4;border-right:1px solid #e4e4e4;border-bottom:1px solid #e4e4e4;font-family:Arial,Helvetica,sans-serif" border="0" cellpadding="0" cellspacing="0" align="center">
         <tbody>
            <tr>
               <td style="border-top:solid 4px #d8232a;line-height:1;background-color:#ffffff">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:1px solid #e4e4e4;border-top:none">
                     <tbody>
                        <tr>
                           <td align="left" valign="top" style="padding:14px 0 0 11px"> <img src="https://ci3.googleusercontent.com/meips/ADKq_NazVxcRAwDdtbbyKlLKw0wnK5H5LMM5RqP-_9IpgiVGa1TgoaPZdaL8-_MmAiX4nPSq3gldIUSPPDKpjWb5YAhL8PmLHjvhdJjnsw=s0-d-e1-ft#http://cdn.staticmb.com/images/mailer/m-b-logo_mm.png" alt="http://www.magicbricks.com" class="CToWUd" data-bit="iit"> </td>
                           <td align="right" valign="top" style="padding:12px 11px 7px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000"><img src="https://ci3.googleusercontent.com/meips/ADKq_NaJK4gB2iL0rcsCfhQ58ztbIly-TKj7EILmIqy7j8JjJmHif5xyaTYbUl2vxXb23hvf-_QPuKEZmmdvQIbzXB85sbmQfeEKMnaH=s0-d-e1-ft#http://cdn.staticmb.com/mbimages/appimages/noOne.png" alt="India's No.1 Propety Site" class="CToWUd" data-bit="iit"></td>
                        </tr>
                     </tbody>
                  </table>
               </td>
            </tr>
            <tr>
               <td style="padding:30px 16px 24px">
                  <div>
                     <div style="font-family:Arial,Helvetica,sans-serif;color:#606060;font-size:16px;line-height:20px;padding-bottom:16px">Dear User,</div>
                     <div style="font-family:Arial,Helvetica,sans-serif;color:#303030;font-size:16px;padding-bottom:16px;line-height:24px">Greetings from Magicbricks Support!</div>
                     <div style="font-family:Arial,Helvetica,sans-serif;color:#303030;font-size:16px;padding-bottom:24px;line-height:24px">It is truly an honor for&nbsp;’Magic Bricks’&nbsp;to be partnered with your<br>esteemed organisation for the&nbsp;READ PRO CRM.<br>We would like to assure you that we are committed to providing the best CRM software and support services to meet your organisation needs.<br>To ensure effective and formal communication, we kindly request you to<br>contact us at&nbsp;”<a href="mailto:support@magicbricks.com" target="_blank">support@magicbricks.com</a>”&nbsp;<wbr>for all future correspondence. This will<br>enable us to maintain strong and well-documented communication channels with your organisation.<br>Please feel free to contact us for any additional feedback, suggestions, or<br>questions. We are always available to assist you and ensure a smooth<br>collaboration.<br><br>Please find below the Login Credentials of Organisation Admin Profile.<br><br>Please find below the Admin Profile tutorial &amp; Import Template, Feedback Form and attached manual for your reference.<br><br>Tutorial Drive Link :-<br><br>Admin Profile demo Videos :: <a href="https://drive.google.com/drive/folders/1t8BAPfiqnZHvtQFG49tF-tOAFve965Sz?usp=drive_link" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://drive.google.com/drive/folders/1GkI9WAZ9eScH5uocbTZJdgWrWTxt7TAL?usp%3Dsharing&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw1h-Ll6in9hIjgAbqWZ9bJg">https://drive.google.com/<wbr>drive/folders/<wbr>1GkI9WAZ9eScH5uocbTZJdgWrWTxt7<wbr>TAL?usp=sharing</a><br>Lead Manager Profile Videos :: <a href="https://drive.google.com/drive/folders/1MWaMkzcC3vvTEHE-q5IizqLa2Ujw5BXx" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://drive.google.com/drive/folders/1MWaMkzcC3vvTEHE-q5IizqLa2Ujw5BXx&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw3AZkwUEeqrUPtkuSayg0SD">https://drive.google.com/<wbr>drive/folders/<wbr>1MWaMkzcC3vvTEHE-<wbr>q5IizqLa2Ujw5BXx</a><br>Sales Profile Videos :: <a href="https://drive.google.com/drive/folders/1b09rmquanvosSh_ZWPSrrGzuP2Rz6Leg" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://drive.google.com/drive/folders/1b09rmquanvosSh_ZWPSrrGzuP2Rz6Leg&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw0BQ6b2XUTrL-wbYAy2sKDM">https://drive.google.com/<wbr>drive/folders/1b09rmquanvosSh_<wbr>ZWPSrrGzuP2Rz6Leg</a> <br><br>Feedback Form :: <a href="https://docs.google.com/forms/d/e/1FAIpQLSc8MknbJdouktHZHnaASP2GT7P1b5cDfj89qlJuiVOK9UsVbg/viewform" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://docs.google.com/forms/d/e/1FAIpQLSc8MknbJdouktHZHnaASP2GT7P1b5cDfj89qlJuiVOK9UsVbg/viewform&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw3urW8L_274GzcsEB6kd8vQ">https://docs.google.com/forms/<wbr>d/e/<wbr>1FAIpQLSc8MknbJdouktHZHnaASP2G<wbr>T7P1b5cDfj89qlJuiVOK9UsVbg/<wbr>viewform</a><br><br>Read Pro Web URL :: <a href="https://read-pro.in/" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://read-pro.in/&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw08Oa3Y7Mie2ofT9AWAD9x6">https://read-pro.in/</a><br><br>Read Pro Play store URL(To download Application) :: <a href="https://play.google.com/store/apps/details?id=com.readpro" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://play.google.com/store/apps/details?id%3Dcom.readpro&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw3g6_F10Ad2rcg__N-cjAQM">https://play.google.com/store/<wbr>apps/details?id=com.readpro</a><br><br>Read Pro App Store URL(To download Application) :: <a href="https://apps.apple.com/in/app/read-pro/id1566457452" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://apps.apple.com/in/app/read-pro/id1566457452&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw2FW8ZameNes4DrYOOudqSA">https://apps.apple.com/in/app/<wbr>read-pro/id1566457452</a><br><br>Find the link for the API key format for API integration :: <a href="https://docs.google.com/spreadsheets/d/1MS4O-bd4-t42UbPujjvqkxdyHqRdDtnN/edit?usp=drive_link&amp;ouid=112241269483488544871&amp;rtpof=true&amp;sd=true" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://docs.google.com/spreadsheets/d/1MS4O-bd4-t42UbPujjvqkxdyHqRdDtnN/edit?usp%3Ddrive_link%26ouid%3D112241269483488544871%26rtpof%3Dtrue%26sd%3Dtrue&amp;source=gmail&amp;ust=1718185892202000&amp;usg=AOvVaw2HGVd5ptcP4nyxrqtNBJnw">https://docs.google.com/<wbr>spreadsheets/d/1MS4O-bd4-<wbr>t42UbPujjvqkxdyHqRdDtnN/edit?<wbr>usp=drive_link&amp;ouid=<wbr>112241269483488544871&amp;rtpof=<wbr>true&amp;sd=true</a><br>and ensure that you create your API token from the Admin profile and fill it in&nbsp;this&nbsp;format.</div>
                     <div style="font-family:Arial,Helvetica,sans-serif;color:#303030;font-size:16px;line-height:24px">In case you still need any further assistance, please feel free to write back to us. <span style="font-weight:bold">We would be happy to help!</span></div>
                  </div>
               </td>
            </tr>
        
            <tr>
               <td style="padding:24px 16px 0">
                  <div style="background:#fffcf2;border-radius:4px;border:solid 1px #ffebb3;padding:16px;font-size:14px;line-height:20px">
                     <div style="padding-bottom:24px;color:#303030">Have a question?</div>
                     <div style="font-size:14px;font-weight:bold;line-height:20px;color:#d8232a;padding-bottom:22px;border-bottom:solid 1px #ffebb3"> <span style="width:24px;height:24px;display:inline-block;vertical-align:middle;padding-right:11px"><img src="https://ci3.googleusercontent.com/meips/ADKq_NZllrPD_vkS5tTwshR9qGaR_r7j0zEHi3jHS8ak9gWD7Fjxkw8wYa2inGIPqisKWNW30gWZs4fnZ2EquUfXsvruqVQdrml7cikIlquuxy5blfOQbnLtw-kscApQe_7W9m30D6qremM=s0-d-e1-ft#https://img.staticmb.com/mbimages/appimages/mailers/b2c-2021-chat-withus-icon.png" alt="" width="24" class="CToWUd" data-bit="iit"></span> <a href="https://www.magicbricks.com/contactUs" style="text-decoration:none;display:inline-block;vertical-align:top" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://www.magicbricks.com/contactUs&amp;source=gmail&amp;ust=1718185892203000&amp;usg=AOvVaw3xl7cvYaj3Hox1z5Au8aeq"> <span style="display:inline-block;vertical-align:middle;color:#d8232a">Chat with Us</span> <span style="width:12px;height:11px;vertical-align:middle;padding-left:5px"><img src="https://ci3.googleusercontent.com/meips/ADKq_NZTOALQkcSJx_nbx7PZOmFQhJWtR4NxxKRfOHRl-5IefORNfQoMxjqd3nCkMLMfOCt1svtTuA3dlmDVrDkT3-kcURhoXxJr5U_Mkdq-JDR9RxOELEhyrkiH0Vo=s0-d-e1-ft#https://img.staticmb.com/mbimages/appimages/mailers/icon-arrow-pr.png" alt="" width="12" class="CToWUd" data-bit="iit"></span></a> </div>
                     <div style="font-size:14px;font-weight:bold;line-height:20px;color:#d8232a;padding-bottom:4px;padding-top:16px"> <span style="width:24px;height:24px;display:inline-block;vertical-align:middle;padding-right:11px"><img src="https://ci3.googleusercontent.com/meips/ADKq_NagG-TH42wds5MyDovI1b4zHY1HO1BhIgUxrxi5DA9AsmU9bU2Hp-RK_5lbLSaZ1XMZ4GXChe_3e6rxUXdGmOhNzrxNEE0GOuEhP4LQ7j16hs7bA8TKmZ7T6JWPIz6pIS7MIrU=s0-d-e1-ft#https://img.staticmb.com/mbimages/appimages/mailers/b2c-2021-callback-icon.png" alt="" width="24" class="CToWUd" data-bit="iit"></span> <a href="https://www.magicbricks.com/help" style="text-decoration:none;display:inline-block;vertical-align:top" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://www.magicbricks.com/help&amp;source=gmail&amp;ust=1718185892203000&amp;usg=AOvVaw3RH5l535hhCiJoEdU24n6E"> <span style="display:inline-block;vertical-align:middle;color:#d8232a">Visit Help Center</span> <span style="width:12px;height:11px;vertical-align:middle;padding-left:5px"><img src="https://ci3.googleusercontent.com/meips/ADKq_NZTOALQkcSJx_nbx7PZOmFQhJWtR4NxxKRfOHRl-5IefORNfQoMxjqd3nCkMLMfOCt1svtTuA3dlmDVrDkT3-kcURhoXxJr5U_Mkdq-JDR9RxOELEhyrkiH0Vo=s0-d-e1-ft#https://img.staticmb.com/mbimages/appimages/mailers/icon-arrow-pr.png" alt="" width="12" class="CToWUd" data-bit="iit"></span></a> </div>
                  </div>
                  <div style="font-size:14px;line-height:20px;color:#909090;padding-bottom:24px"> <span>Regards<span style="display:block">Team Magicbricks</span></span> </div>
               </td>
            </tr>
            <tr>
               <td style="background-color:#fff7e1;padding:12px 8px 12px 16px">
                  <div>
                     <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tbody>
                           <tr>
                              <td valign="top" style="width:44px;padding-top:4px"> <img style="width:44px;height:55px;vertical-align:top" align="top" src="https://ci3.googleusercontent.com/meips/ADKq_NblC63Z_aqW8aOAmJMsFI5X2kG-yvDI7awyIb_RAqsagn5ttDHnil3VQawGwnzBkCKeXW5CxOsefFzL0XmX4ysk7wnLT5UmhhXCqcBGgrkEiNKojQKZMA=s0-d-e1-ft#https://img.staticmb.com/mbimages/appimages/qr-code-fraudster.png" alt="" class="CToWUd" data-bit="iit"> </td>
                              <td valign="top" style="padding-left:12px">
                                 <div style="font-size:14px;font-weight:bold;padding-bottom:12px;line-height:20px;color:#303030"><span style="color:#d8232a;font-weight:normal">Warning!</span> Beware of fraudsters asking you to scan QR code for receiving payments </div>
                                 <div style="font-size:14px;line-height:20px;color:#d8232a"> <a href="https://property.magicbricks.com/microsite/magicbricks_advisory.pdf" style="color:#d8232a;text-decoration:underline" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://property.magicbricks.com/microsite/magicbricks_advisory.pdf&amp;source=gmail&amp;ust=1718185892203000&amp;usg=AOvVaw3iEAbWJdx4jWCpntDeFv7h">Know more</a> </div>
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </td>
            </tr>
            <tr>
               <td align="center" style="padding:0 16px 16px 16px;border-top:4px solid #b71c1c;line-height:18px">
                  <div style="padding:15px 0 0 0;text-align:left;font-size:12px;font-weight:normal">
                     <div style="color:#909090;font-size:11px;font-family:Arial,Helvetica,sans-serif;display:inline-block;margin-right:6px;padding-bottom:5px">© Copyright 2024 Magicbricks Realty Services Limited.</div>
                  </div>
               </td>
            </tr>
         </tbody>
      </table>
   </div>`

      //  if(response!==null){
      transporter.sendMail({
        from: 'noreply@magicbricks.com', // sender address
        to: data.admin_email_id, // list of receivers
        subject: "Greetings from Magicbricks Support", // Subject line
        // text: 'Hello world?', // plain text body
        html: welcomeMail // html body
      })
      // await session.commitTransaction();
      // session.endSession();
      return res.status(201).json({
        success: true,
        message: "Subscription created successfully"
      });
    }

  } catch (error) {
    console.log(`Time - ${new Date()}, api endpoint - subscriptionDetails/updateSubscriptionDetails, error - ${error}`);
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
}

module.exports = subscriptionDetailsController;
