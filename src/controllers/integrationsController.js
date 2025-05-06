var ObjectId = require("mongoose").Types.ObjectId;
const integrationsModel = require("../models/integrationsSchema");
const { google } = require("googleapis");
const userModel = require("../models/userSchema")
const moment = require("moment");

const axios = require('axios');
const https = require('https');

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

const fbAppId = process.env.FB_APP_ID;
const fbAppSecret = process.env.FB_APP_SECRET;

const getLongLivedUserAccessToken = async (shortLivedFBUserAccessToken) => {
    try {
        const response = await axiosInstance.get(`https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${shortLivedFBUserAccessToken}`);
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting long-lived user access token:', error);
        throw error;
    }
}

const getLongLivedPageAccessToken = async (longLivedFBUserAccessToken, fbPageId) => {
  try {
      const response = await axiosInstance.get(`https://graph.facebook.com/v20.0/${fbPageId}?fields=access_token&access_token=${longLivedFBUserAccessToken}`);
      return response.data.access_token;
  } catch (error) {
      console.error('Error getting long-lived page access token:', error);
      throw error;
  }
}

const fetchFBFormFields = async (fb_form_id, fb_page_access_token) => {
  try {
      const url = `https://graph.facebook.com/v20.0/${fb_form_id}?access_token=${fb_page_access_token}&fields=questions`;
      const response = await axiosInstance.get(url);
      let data = response.data.questions.map(item => {
        return item.key;
      });
      return data;
  } catch (error) {
      console.error('Error fetching form fields:', error);
      throw error;
  }
}

const convertToDateFormat = (dateStr) => {
  if (dateStr) {
    const dateObj = moment(dateStr);

    // Format the Moment object into the desired string format
    const formattedDate = dateObj.format("D MMMM YYYY");
    return formattedDate;
  } else {
    return "";
  }
}

const integrationsController = {};

integrationsController.CreateIntegration = async (req, res) => {
  try {
    const {
      organization_id,
      integration_type,
      integration_name,
      integration_status,
      integration_mapped_fields,
      created_by,
      modified_by,
    } = req.body;
    if (
      !organization_id ||
      !integration_type ||
      !integration_name ||
      !integration_status ||
      !integration_mapped_fields ||
      !created_by ||
      !modified_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    let isIntegrationNameAlreadyExists = await integrationsModel.find({organization_id,integration_name});
    if(isIntegrationNameAlreadyExists.length > 0){
      return res.status(400).json({
        success: false,
        message: "Integration name should be unique",
      });
    }

    if (integration_type === "FB LEADS") {
      const { fb_page_name, fb_form_name, fb_page_access_token, fb_form_id, fb_user_access_token, fb_page_id } = req.body;
      if (!fb_page_name || !fb_form_name || !fb_page_access_token || !fb_form_id || !fb_user_access_token || !fb_page_id) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters",
        });
      }
      const longLivedFBUserAccessToken = await getLongLivedUserAccessToken(fb_user_access_token);
      const longLivedFBPageAccessToken = await getLongLivedPageAccessToken(longLivedFBUserAccessToken,fb_page_id);

      const integration = await integrationsModel.create({
        organization_id,
        integration_type,
        integration_name,
        integration_status,
        integration_mapped_fields,
        created_by,
        modified_by,
        fb_page_name,
        fb_form_name,
        fb_page_access_token: longLivedFBPageAccessToken,
        fb_form_id
      });
      // res.status(201).json(apiToken);
      return res.status(201).json({
        success: true,
        message: "Integration created successfully",
      });
    }
    if (integration_type === "GOOGLE SHEET") {
      const {
        google_sheet_url,
        google_sheet_name,
        google_sheet_id,
        google_sheet_batch_interval,
      } = req.body;
      if (
        !google_sheet_url ||
        !google_sheet_name ||
        !google_sheet_id ||
        !google_sheet_batch_interval
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters",
        });
      }
      let isGsheetUrlAlreadyExists = await integrationsModel.find({organization_id,google_sheet_id,google_sheet_name});
      if(isGsheetUrlAlreadyExists.length > 0){
        return res.status(400).json({
          success: false,
          message: "This sheet is already integrated.",
        });
      }

      const integration = await integrationsModel.create({
        organization_id,
        integration_type,
        integration_name,
        integration_status,
        integration_mapped_fields,
        created_by,
        modified_by,
        google_sheet_url,
        google_sheet_name,
        google_sheet_id,
        google_sheet_batch_interval,
      });
      // res.status(201).json(apiToken);
      return res.status(201).json({
        success: true,
        message: "Integration created successfully",
      });
    }
  } catch (error) {
    // res.status(400).json({ error: error.message });
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

integrationsController.GetGoogleSheetData = async (req, res) => {
  try {
// console.log("req.google_sheet_id",req.body)
      const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
      });
    
      // Create client instance for auth
      const client = await auth.getClient();
      // Instance of Google Sheets API
      const googleSheets = google.sheets({ version: "v4", auth: client });
      // const SheetURL = "https://docs.google.com/spreadsheets/d/1PRMEeWh8Uv6zgqvTFuMSSDjzvLvupu0miqDkif4gcWw/edit#gid=0"

      const SheetURL = "https://docs.google.com/spreadsheets/d/1QZ3elZiM_rP7Lorici9VM2Db_Fr7LBptcqViresJrhY/edit#gid=0"
    
      let spreadsheetId = req.body.google_sheet_id;

    // const SheetURL = "https://docs.google.com/spreadsheets/d/1QZ3elZiM_rP7Lorici9VM2Db_Fr7LBptcqViresJrhY/edit#gid=0"

    // const spreadsheetId = "1QZ3elZiM_rP7Lorici9VM2Db_Fr7LBptcqViresJrhY";

    // Get metadata about spreadsheet
    const metaData = await googleSheets.spreadsheets.get({
      auth,
      spreadsheetId,
    });

    // Read rows from spreadsheet
    const getRows = await googleSheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: `${req.body.google_sheet_name}!A:Z`,
    });
    // Transform data to desired format and skip the first object
    // const transformedData = getRows.data.values.map(row => {
    //   const obj = {};
    //   row.forEach((value, index) => {
    //     const header = getRows.data.values[0][index]; // Assuming the first row contains headers
    //     obj[header] = value;
    //   });
    //   return obj;
    // });

// console.log("transformedData",transformedData)
//       return res.json({ success: true, data: transformedData });
const headers = getRows.data.values[0];

    console.log("headers", headers);
    if(res.status===403){return res.json({ success: false,message: "Access Pending", headers: headers ,access:false });}else{return res.json({ success: true,message: "Access Done", headers: headers,access:false  });}

  } catch (error) {
    // console.error("Data upload error:", error);
    return res
      .status(400)
      .json({ success: false, message: "Access Pending", error: error,access:false  });
  }
};

integrationsController.FetchAll = async (req, res) => {
  try {
    let parsedFilters = {};
    const { organization_id, page, limit, sort, filters, search, integration_type } = req.query;
    if (!organization_id || !integration_type) {
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
      parsedFilters["integration_name"] = { $regex: new RegExp(search, 'i') };
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
    // console.log("page", parsedFilters, parsedSort, skip, limitNumber);
    const integrationsData = await integrationsModel.find({ organization_id: organization_id, integration_type, ...parsedFilters }, { __v: 0 }).lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);
    const integrationsCount = await integrationsModel.countDocuments({ organization_id, integration_type, ...parsedFilters });

    /////////////////////////////////////////////////////////////////////////
    let userIds = [];
    integrationsData.map((integration) => {
      let created_by = integration.created_by ? integration.created_by : "";
      let modified_by = integration.modified_by ? integration.modified_by : "";
      userIds.push(created_by);
      userIds.push(modified_by);
    })
    const uniqueUserIds = [...new Set(userIds)];

    const modifiedData = await userModel.find({ uid: { $in: uniqueUserIds } }, { user_first_name: 1, user_last_name: 1, uid: 1, _id: 0 });


    const userMapping = {};
    modifiedData.forEach(user => {
      userMapping[user.uid] = `${user.user_first_name} ${user.user_last_name}`;
    });
    ////////////////////////////////////////////////////////////////////////////

    integrationsData.forEach((val) => {
      val.created_at = convertToDateFormat(val.created_at);
      val.modified_at = convertToDateFormat(val.modified_at);
      val.created_by = userMapping[val.created_by] ? userMapping[val.created_by] : "";
      val.modified_by = userMapping[val.modified_by] ? userMapping[val.modified_by] : "";
    });


    ///////////////////////////////////////////////////////////////////////////////


    return res.status(200).json({
      success: true,
      message: "Integrations fetched successfully",
      data: {
        integrationsData,
        integrationsCount
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


integrationsController.UpdateIntegration = async (req, res) => {
  const { organization_id, google_sheet_id, google_sheet_name, updateFields } = req.body;

  // Validate required fields
  if (!organization_id || !google_sheet_id || !google_sheet_name) {
    return res.status(400).send('organization_id, google_sheet_id, and google_sheet_name are required');
  }

  // Validate updateFields
  if (!updateFields || typeof updateFields !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'updateFields is required and must be an object'
    });
  }
  try {
    const updatedIntegration = await integrationsModel.findOneAndUpdate(
      { organization_id, google_sheet_id, google_sheet_name },
      { ...updateFields, modified_at: Date.now() },
      { new: true }
    );

    if (!updatedIntegration) {
      return res.status(404).send('Integration not found');
    }

    res.status(200).json(updatedIntegration);

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};


integrationsController.DeleteIntegration = async (req, res) => {
  const { organization_id, google_sheet_id, google_sheet_name } = req.body;

  // Validate required fields
  if (!organization_id || !google_sheet_id || !google_sheet_name) {
    return res.status(400).json({
      success: false,
      message: 'organization_id, google_sheet_id, and google_sheet_name are required'
    });
  }

  try {
    // Delete integration document
    const deletedIntegration = await integrationsModel.findOneAndDelete({
      organization_id,
      google_sheet_id,
      google_sheet_name
    });

    // Check if the document was found and deleted
    if (!deletedIntegration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Integration deleted successfully',
      data: deletedIntegration
    });

  } catch (error) {
    // Handle errors
    return res.status(500).json({
      success: false,
      message: 'An error occurred, please try again',
      error: error.message
    });
  }
};


integrationsController.ChangeIntegrationStatus = async (req, res) => {
  const { organization_id, google_sheet_id, google_sheet_name } = req.body;

  if (!organization_id || !google_sheet_id || !google_sheet_name) {
    return res.status(400).json({
      success: false,
      message: 'organization_id, google_sheet_id, and google_sheet_name are required'
    });
  }

  try {
    // Find the current document
    const integration = await integrationsModel.findOne({
      organization_id,
      google_sheet_id,
      google_sheet_name
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Toggle the status
    const newStatus = integration.integration_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Update the document with the new status
    integration.integration_status = newStatus;
    integration.modified_at = new Date();
    await integration.save();

    res.status(200).json({
      success: true,
      message: 'Integration status updated successfully',
      data: integration
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'An error occurred, please try again',
      error: error.message
    });
  }
};

integrationsController.Delete = async (req, res) => {
  try {
    const { integration_name, organization_id } = req.body;
    if (!integration_name || !organization_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    await integrationsModel.deleteMany({organization_id,integration_name});
    return res.status(200).json({
      success: true,
      message: "Integrations deleted successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

integrationsController.Update = async (req, res) => {
  try {

    const updateData = req.body.data;
    updateData.modified_at = new Date();
    // const id = req.body.id;
    const { integration_name, organization_id } = req.body;
    if (!integration_name || !organization_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const integrationData = await integrationsModel.findOne(
      { organization_id, integration_name },
    );
    if(Object.keys(integrationData.integration_mapped_fields).length === 0 && Object.keys(updateData.integration_mapped_fields).length === 0){
      return res.status(400).json({
        success: false,
        message: "Please get the fields mapped first before activating this integration",
      });
    }
    const integrationUpdate = await integrationsModel.findOneAndUpdate(
      { organization_id, integration_name },
      { $set: updateData },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "Integration updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

integrationsController.GetFBFormFields = async (req, res) => {
  try {
    const {
      organization_id,
      integration_name
    } = req.body;
    if (
      !organization_id ||
      !integration_name
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }
    const integration = await integrationsModel.findOne({
      organization_id,
      integration_name
    });

    let fbFormId = integration.fb_form_id;
    let fbPageAccessToken = integration.fb_page_access_token;
    const formFields = await fetchFBFormFields(fbFormId,fbPageAccessToken);
    return res.status(201).json({
      success: true,
      message: "Integration Form Questions Fetched successfully",
      data: {
        formFields
      }
    });
  } catch (error) {
    // res.status(400).json({ error: error.message });
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};


module.exports = integrationsController;
