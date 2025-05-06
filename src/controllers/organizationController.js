const organizationModel = require('../models/organizationSchema');
const packageDetailsModel = require('../models/packageDetailsSchema');
const userModel = require("../models/userSchema")
const organizationResourcesModel = require("../models/organizationResourcesSchema")
var ObjectId = require('mongoose').Types.ObjectId;
const { generateSalt, hashPassword } = require("../functions/authScrypt")
const mongoose = require('mongoose');
const { MESSAGES } = require("../constants/constants")
// const {createOrganization}=require("../functions/organization")

const organizationController = {};

organizationController.Insert = (req, res) => {
  const data = new organizationModel({
    address: req.body.address,
    admin_contact_number: req.body.admin_contact_number,
    admin_email_id: req.body.admin_email_id,
    admin_first_name: req.body.admin_first_name,
    admin_last_name: req.body.admin_last_name,
    auth_id: req.body.auth_id,
    city: req.body.city,
    country: req.body.country,
    created_at:
      typeof req.body.created_at == 'object'
        ? req.body.created_at.toDate()
        : new Date(0),
    designations: req.body.designations,
    email_id: req.body.email_id,
    mobile_number: req.body.mobile_number,
    no_of_employees: req.body.no_of_employees,
    organization_name: req.body.organization_name,
    state: req.body.state,
    status: req.body.status,
    teams: req.body.teams,
  });
  data.save();
  res.send('organization created');
};

organizationController.updateData = (req, res) => {
  const updateData = JSON.parse(JSON.stringify(req.body.data));
  //console.log(updateData);
  //console.log(updateData);
  if (ObjectId.isValid(req.body.organization_id)) {
    organizationModel
      .findOneAndUpdate({ _id: req.body.id }, { $set: updateData })
      .exec(function (err, result) {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send('Updation DONE!');
        }
      });
  } else {
    organizationModel
      .findOneAndUpdate({ id: req.body.id }, { $set: updateData })
      .exec(function (err, result) {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send('Updation DONE!');
        }
      });
  }
};

organizationController.fetch = (req, res) => {
  if (ObjectId.isValid(req.body.organization_id)) {
    organizationModel.find({ _id: req.body.organization_id }, (err, result) => {
      if (err) {
        res.send(err);
      } else {
        res.send(result);
      }
    });
  } else {
    organizationModel.find({ id: req.body.organization_id }, (err, result) => {
      if (err) {
        res.send(err);
      } else {
        res.send(result);
      }
    });
  }
};


///////////////////// after migration from firebase to mongodb/////////////////////////////////////

organizationController.createOrganizationWithAuth = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      organization_name,
      mobile_number,
      email_id,
      address,
      country,
      state,
      city,
      pincode,
      admin_first_name,
      admin_last_name,
      admin_contact_number,
      admin_email_id,
      no_of_employees,
      valid_from,
      valid_till,
      service_id,
      package_id,
      oid,
      cost_per_license,
      business_domain,
      shift_active_status,
      organization_active_status,
      GSTIN
    } = req.body;

    // Validate required parameters
    if (!organization_name ||
      !mobile_number ||
      !email_id ||
      !address ||
      !country ||
      !state ||
      !city ||
      !pincode ||
      !admin_first_name ||
      !admin_contact_number ||
      !admin_email_id ||
      !no_of_employees ||
      !valid_from ||
      !valid_till) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    const orgId = new ObjectId();
    const uid = new ObjectId();
    let currentTime = new Date();
    let validTill = new Date(valid_till);
    validTill.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
    let validFrom = new Date(valid_from);
    validFrom.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());

    const organizationData = {
      organization_name: organization_name,
      mobile_number: mobile_number,
      email_id: email_id,
      address: address,
      country: country,
      state: state,
      city: city,
      pincode: pincode,
      admin_first_name: admin_first_name,
      admin_last_name: admin_last_name ? admin_last_name : "",
      admin_contact_number: admin_contact_number,
      admin_email_id: admin_email_id.toLowerCase(),
      no_of_employees: no_of_employees,
      cost_per_license:cost_per_license?cost_per_license:0,
      business_domain:business_domain?business_domain:"Real Estate",
      grace_period:0,
      valid_from: validFrom,
      valid_till: validTill,
      service_id:service_id?service_id:"13733" ,
      package_id: "",
      oid: "",
      organization_id: orgId,
      auth_id: uid,
      GSTIN:GSTIN?GSTIN:"",
      current_active_status:shift_active_status?shift_active_status:true,
      organization_active_status:organization_active_status?organization_active_status:true,
      created_by:"MANUAL"
    }

    const check = await organizationModel.findOne({ admin_email_id: admin_email_id }).session(session);

    if (check) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "organization already exist",
        error: "organization already exist"
      })
    }

    const org = await organizationModel.create([organizationData], { session });

    // const package = await packageDetailsModel.create([{
    //   organization_id: orgId,
    //   package_id: package_id,
    //   issued_licences: no_of_employees,
    //   oid: oid,
    //   valid_till: new Date(valid_till),
    //   valid_from: new Date(valid_from),
    //   package_email_id: admin_email_id,
    //   package_status: "active"
    // }], { session });

    let password = "";
    if (admin_first_name.length < 4) {
      password =
        admin_first_name.toUpperCase() +
        admin_last_name
          .slice(0, 4 - admin_first_name.length)
          .toUpperCase() +
        "@" +
        admin_contact_number.toString().slice(0, 4);
    } else {
      password =
        admin_first_name.slice(0, 4).toUpperCase() +
        "@" +
        admin_contact_number.toString().slice(0, 4);
    }
    const salt = generateSalt();
    password = await hashPassword(password, salt);

    const userAdmin = await userModel.create([{
      user_first_name: admin_first_name,
      user_last_name: admin_last_name,
      user_email: admin_email_id.toLowerCase(),
      team: "",
      reporting_to: "",
      contact_no: admin_contact_number,
      designation: "Organization Admin",
      status: "ACTIVE",
      organization_id: orgId,
      created_by: "Super Admin",
      profile: "Admin",
      uid: uid,
      user_image: "",
      device_id: "",
      country: country,
      state: state,
      password: password,
      passwordSalt: salt,
      role: "organization",
      first_login: true
    }], { session });

    const organizationResource = await organizationResourcesModel.create([{
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

    await session.commitTransaction();
    session.endSession();

    // console.log("prgrendc",organizationCreation)
    return res.status(201).json({
      success: true,
      message: "Organization created successfully"
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
};

organizationController.updateOrganization = async (req, res) => {
  try {
    const { organization_id, valid_from, valid_till } = req.body;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        error: "organization_id required"
      });
    }

    const check = await organizationModel.findOne({ organization_id: organization_id });

    if (!check) {
      return res.status(400).json({
        success: false,
        message: "organization doesn't exist",
        error: "organization doesn't exist"
      });
    }

    let data = req.body;

    if (data.organization_id) {
      delete data.organization_id;
    }

    if (data.admin_email_id) {
      delete data.admin_email_id;
    }

    if (data.oid) {
      delete data.oid;
    }



    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please send at least one parameter to update",
        error: "Please send at least one parameter to update"
      });
    }

    let currentTime = new Date();
    // Add a modifiedAt field with the current timestamp
    if (valid_till) {
      let validTill = new Date(valid_till);
      validTill.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
      data["valid_till"] = validTill
    }

    if (valid_from) {
      let validFrom = new Date(valid_from);
      validFrom.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
      data["valid_from"] = validFrom
    }


    data.modified_at = new Date();
    const update = await organizationModel.findOneAndUpdate(
      { organization_id: organization_id },
      { $set: data },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "organization updated successfully"
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
}

organizationController.fetchAll = async (req, res) => {
  try {
    const { page, limit, sort, filters } = req.query;



    let parsedFilters = {};
    try {
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
            parsedFilters[key] = { $all: parsedFilters[key] };
          }
        }
      }

      // const result=await userModel.find({ user_email: { $in: parsedFilters[key]} });
      // parsedFilters[key]=result.map((user) => user.uid)
      // parsedFilters[key] = { $all: parsedFilters[key] };

      // console.log("efewfbwebfhiwebfywbf",parsedFilters);

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid parameter ",
        error: error.message
      });
    }

    // Convert page and limit to integers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber) {
      if (isNaN(pageNumber) || pageNumber < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid page value",
          error: "Invalid page value"
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
    //  console.log("dfsdf",parsedSort,pageNumber,limitNumber);
    // fetch cout of all data in the organization 
    const count = await organizationModel.countDocuments({ ...parsedFilters });

    // all data fetched from the organization 
    const data = await organizationModel
      .find({ ...parsedFilters }, { __v: 0 }).lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);


    // await emailMapper(data);

    return res.status(200).json({
      success: true,
      message: "Fetched all organization successfully",
      data: data,
      count: count
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
};

organizationController.fetchSingleOrganization = async (req, res) => {
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        error: "organization_id required"
      });
    }

    const data = await organizationModel.findOne({ organization_id: organization_id })

    return res.status(200).json({
      success: true,
      message: "organization fetched successfully",
      data:data
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
}





module.exports = organizationController;
