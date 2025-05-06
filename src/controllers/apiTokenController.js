var ObjectId = require('mongoose').Types.ObjectId;
const apiTokenModel = require('../models/apiTokenSchema');
const crypto = require('crypto');

const apiTokenController = {};

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time"
];

// apiTokenController.Insert = (req, res) => {
//   const data = new apiTokenModel(req.body);
//   data.save();
//   res.send('api Token inserted');
// };

// apiTokenController.Update = (req, res) => {
//   //const result = await leadModel.find({ id: req.body.id });
//   if (ObjectId.isValid(req.body.id)) {
//     //res.send("true");
//     const data = JSON.parse(JSON.stringify(req.body));
//     const id = data.id;
//     delete data.id;
//     //const updateData=JSON.parse(JSON.stringify(req.body.data))
//     apiTokenModel
//       .findOneAndUpdate({ _id: id }, { $set: data })
//       .exec(function (err, result) {
//         if (err) {
//           console.log(err);
//           res.status(500).send(err);
//         } else {
//           res.status(200).send('Updation DONE!');
//         }
//       });
//   } else {
//     const data = JSON.parse(JSON.stringify(req.body));
//     const id = data.id;
//     delete data.id;
//     //const updateData=JSON.parse(JSON.stringify(req.body.data))
//     apiTokenModel
//       .findOneAndUpdate({ id: id }, { $set: data })
//       .exec(function (err, result) {
//         if (err) {
//           console.log(err);
//           res.status(500).send(err);
//         } else {
//           res.status(200).send('Updation DONE!');
//         }
//       });
//   }
// };

const generateToken = (length) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') // Convert to hexadecimal format
    .slice(0, length); // Trim to desired length
}

// Create API token - POST request
apiTokenController.Create = async (req, res) => {
  try {
    const { organization_id, source, country_code, created_by, modified_by } = req.body;
    if (!organization_id || !source || !created_by || !modified_by) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const apiTokenExists = await apiTokenModel.findOne({organization_id,source});
    if(apiTokenExists){
      return res.status(400).json({
        success: false,
        message: "Source already exists",
        error: "Source already exists",
      });
    }

    if(source == "Self Generated"){
      return res.status(400).json({
        success: false,
        message: "Self Generated lead source cannot be created for API",
        error: "Self Generated lead source cannot be created for API",
      });
    }

    const token = generateToken(20);
    const apiToken = await apiTokenModel.create({
      organization_id,
      source,
      country_code,
      created_by,
      modified_by,
      token
    });
    // res.status(201).json(apiToken);
    return res.status(201).json({
      success: true,
      message: "API Token created successfully"
    });
  } catch (error) {
    // console.log("error api token",error);
    // res.status(400).json({ error: error.message });
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
}

// Get all API tokens - GET request
apiTokenController.FetchAll = async (req, res) => {
  try {
    let parsedFilters = {};
    const { organization_id, page, limit, sort, filters, search } = req.query;
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
      parsedFilters["source"] = { $regex: new RegExp(search, 'i') };
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
    const apiTokensData = await apiTokenModel.find({ organization_id: organization_id, ...parsedFilters }, { __v: 0 }).lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);
    const apiTokensCount = await apiTokenModel.countDocuments({ organization_id, ...parsedFilters });
    return res.status(200).json({
      success: true,
      message: "API Data fetched successfully",
      data: {
        apiTokensData,
        apiTokensCount
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

// Get a single API token by ID - GET request
apiTokenController.FetchToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const apiToken = await apiTokenModel.findOne({ token });
    return res.status(200).json({
      success: true,
      message: "API Data fetched successfully",
      data: apiToken
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

// Update API token by ID - PUT request
apiTokenController.Update = async (req, res) => {
  try {

    const updateData = req.body.data;
    updateData.modified_at = new Date();
    const id = req.body.id;
    const organization_id = req.body.organization_id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    const apiTokenExists = await apiTokenModel.findOne({organization_id, source: updateData.source });
    if(apiTokenExists){
      return res.status(400).json({
        success: false,
        message: "Source already exists",
        error: "Source already exists",
      });
    }

    if(updateData.source == "Self Generated"){
      return res.status(400).json({
        success: false,
        message: "Self Generated lead source cannot be created for API",
        error: "Self Generated lead source cannot be created for API",
      });
    }

    const apiToken = await apiTokenModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "API Data updated successfully",
      data: apiToken
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

// Delete API token by ID - DELETE request
apiTokenController.Delete = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const deletedToken = await apiTokenModel.findByIdAndDelete(id);
    if (!deletedToken) {
      return res.status(400).json({
        success: false,
        message: "Token not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "API Token deleted successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

// Get all API tokens - GET request
apiTokenController.FilterValues = async (req, res) => {
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
        token: { $addToSet: "$token" },
        country_code: { $addToSet: "$country_code" },
        status: { $addToSet: "$status" },
        source: { $addToSet: "$source" },
      }
    }

    const filterValuesForAPITokens = await apiTokenModel.aggregate([
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

module.exports = apiTokenController;
