var ObjectId = require('mongoose').Types.ObjectId;
const projectsModel = require('../models/projectsSchema');
const crypto = require('crypto');
const userModel=require("../models/userSchema")
const {sanitizationString}=require("../constants/constants.js")
const {getTimeDifferenceInSeconds}=require("../constants/constants.js")
const {sendNotificationForNewProject}=require("../functions/projectNotification.js")


const projectsController = {};

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time"
];

// apiTokenController.Insert = (req, res) => {
//   const data = new projectsModel(req.body);
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
//     projectsModel
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
//     projectsModel
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
projectsController.Create = async (req, res) => {
  try {
    const { organization_id, uid } = req.body;
    const project_id = new ObjectId();
    if (!organization_id || !uid) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    const checkUser= await userModel.findOne({organization_id:organization_id,uid:uid},{profile:1}).lean();

    if(!checkUser){
      return res.status(400).json({
        success: false,
        message: "user Not found"
      });
    }

   if(checkUser.profile !== "Lead Manager" && checkUser.profile!=="Admin"){
    return res.status(400).json({
      success: false,
      message: "profile is not allowed to create projects"
    });
   }

    const address=sanitizationString(req.body.address);
    const developerName=sanitizationString(req.body.developer_name)
    const projectname=sanitizationString(req.body.project_name)
    const unitNo=sanitizationString( req.body.unitRef)
    const project = await projectsModel.create({
      address: address ? address : "",
      business_vertical: req.body.business_vertical ? req.body.business_vertical : "",
      organization_id: req.body.organization_id,
      created_by: req.body.uid,
      modified_by: req.body.uid,
      developer_name: developerName ? developerName : "",
      project_id: project_id,
      project_name: projectname ? projectname : "",
      project_status: req.body.project_status ? req.body.project_status : "",
      property_stage: req.body.property_stage ? req.body.property_stage : "",
      property_type: req.body.property_type ? req.body.property_type : "",
      rera_link: req.body.rera_link ? req.body.rera_link : "",
      walkthrough_link: req.body.walkthrough_link ? req.body.walkthrough_link : "",
      owner_name:req.body.ownerNameRef ? req.body.ownerNameRef:"",
      owner_contact_no:req.body.ownerContactRef ? req.body.ownerContactRef:"",
      type : req.body.type ?  req.body.type :"NEW PROJECT",
      price :  req.body.priceRef ?  req.body.priceRef : "",
      unit_no :  unitNo ?  unitNo :"",
      description : req.body.description ? req.body.description : ""
    });
    
    const check=await sendNotificationForNewProject(organization_id);

    if(check===false){
      console.log("notification failed while creating listing ")
    }

    // res.status(201).json(apiToken);
    return res.status(201).json({
      success: true,
      message: "Project created successfully"
    });
  } catch (error) {
    // res.status(400).json({ error: error.message });
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
}

// Get all API tokens - GET request
projectsController.FetchAll = async (req, res) => {
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
        else if (key==="listing_created_by"){
          parsedFilters["created_by"]={ $in: parsedFilters[key] }
          delete parsedFilters[key]
        }
        else {
          parsedFilters[key] = { $in: parsedFilters[key] };
        }
      }
    }
    if (search) {
      parsedFilters["project_name"] = { $regex: new RegExp(search, 'i') };
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

    // console.log("rishabh Gupta",parsedFilters)
    // console.log("page", parsedFilters, parsedSort, skip, limitNumber);
    const projectsData = await projectsModel.find({ organization_id: organization_id, ...parsedFilters }, { __v: 0 }).lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);
    const projectsCount = await projectsModel.countDocuments({ organization_id, ...parsedFilters });

    /////////////////////////////////////////////////////////////////////////////
    const uniqueUserIds = [...new Set(projectsData
      .map((val) => val.created_by)
      .filter((id) => id !== null && id !== "")
    )];

    const modifiedData = await userModel.find({ uid: { $in: uniqueUserIds } }, { user_first_name: 1, user_last_name: 1, uid: 1, _id: 0 });


    const userMapping = {};
    modifiedData.forEach(user => {
      userMapping[user.uid] = `${user.user_first_name} ${user.user_last_name}`;
    });

    projectsData.forEach((val) => {
      val.listing_created_by = userMapping[val.created_by] !== undefined ? userMapping[val.created_by] : val.created_by;
    });
    
 
  /////////////////////////////////////////////////////////////////////////////////
    
    
    return res.status(200).json({
      success: true,
      message: "API Data fetched successfully",
      data: {
        projectsData,
        projectsCount
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

// Get all API tokens - GET request
projectsController.FetchAllProjects = async (req, res) => {
  try {
    const { organization_id} = req.query;
    let apiStart = new Date();
    let timeTakenOverall;
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }
    // console.log("page", parsedFilters, parsedSort, skip, limitNumber);
    const projectsData = await projectsModel.find({ organization_id: organization_id }, { __v: 0 }).lean();

    let query1 = new Date();
    let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
    console.log(`api endpoint - projects/fetchAllProjects, time taken for query 1, ${timeTakenQuery1}`);

    let apiEnd = new Date();
    timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
    console.log(`api endpoint - projects/fetchAllProjects, time taken overall, ${timeTakenOverall}`);

    return res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      data: projectsData
    });
  } catch (error) {
    let apiEnd = new Date();
    timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
    console.log(`api endpoint - projects/fetchAllProjects, time taken overall, ${timeTakenOverall}`);

    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

// Get a single API token by ID - GET request
// projectsController.FetchToken = async (req, res) => {
//   try {
//     const { token } = req.params;
//     if (!token) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required parameters"
//       });
//     }
//     const apiToken = await projectsModel.findOne({ token });
//     return res.status(200).json({
//       success: true,
//       message: "API Data fetched successfully",
//       data: apiToken
//     });
//   } catch (error) {
//     return res.status(400).json({
//       success: false,
//       message: "An error occured, Please try again",
//       error: error.message,
//     });
//   }
// };

// Update API token by ID - PUT request
projectsController.Update = async (req, res) => {
  try {

    const updateData = req.body.data;
    updateData.modified_at = new Date();
    const id = req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    updateData["developer_name"]=sanitizationString(updateData.developer_name);
    updateData["project_name"]=sanitizationString(updateData.project_name);
    updateData["unit_no"]=sanitizationString(updateData.unit_no);
    const project = await projectsModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project
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
projectsController.FilterValues = async (req, res) => {
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
        address: { $addToSet: "$address" },
        business_vertical: { $addToSet: "$business_vertical" },
        created_by: { $addToSet: "$created_by" },
        modified_by: { $addToSet: "$modified_by" },
        developer_name: { $addToSet: "$developer_name" },
        project_name:  { $addToSet: "$project_name" },
        project_status:  { $addToSet: "$project_status" },
        property_stage:  { $addToSet: "$property_stage" },
        property_type:  { $addToSet: "$property_type" },
        rera_link:  { $addToSet: "$rera_link" },
        walkthrough_link:  { $addToSet: "$walkthrough_link" },
        type:  { $addToSet: "$type" },
        unit_no:  { $addToSet: "$unit_no" },
        price:  { $addToSet: "$price" },
        owner_name:  { $addToSet: "$owner_name" },
        owner_contact_no:  { $addToSet: "$owner_contact_no" },
      }
    }

    const filterValuesForProjects = await projectsModel.aggregate([
      {
        $match: { organization_id }
      },
      groupStage
    ])


    /////////////////////////////////////////////////////////////////////

    const modification = await userModel.find({ uid: { $in: [...filterValuesForProjects[0].created_by] } },{ user_first_name: 1, user_last_name: 1, uid: 1, _id: 0 })
     
    const userMapping = {};
    modification.forEach(user => {
        userMapping[user.uid] =`${user.user_first_name} ${user.user_last_name}`;
    });
  
    
    const created_by_modification = filterValuesForProjects[0].created_by.map((val) => ({
      label: userMapping[val] !== undefined ? userMapping[val] : val,
      value: val
    }));
    filterValuesForProjects[0].listing_created_by = created_by_modification;
    // delete  filterValuesForProjects[0].created_by
    

    ///////////////////////////////////////////////////////////////////////
    return res.status(200).json({
      success: true,
      message: "Filter Values fetched successfully",
      data: filterValuesForProjects
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
projectsController.Delete = async (req, res) => {
  try {
    const { projectIds } = req.body;
    if (projectIds.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    await projectsModel.deleteMany({_id:{$in:projectIds}});
    return res.status(200).json({
      success: true,
      message: "Project deleted successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

module.exports = projectsController;
