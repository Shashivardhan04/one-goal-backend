const dataUploadRequestModel = require('../models/dataUploadRequestSchema');
var ObjectId = require("mongoose").Types.ObjectId;
const express = require("express");
const https = require("https");
const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const storage = require("firebase/storage");
var router = express.Router();
const admin = require("../../firebaseAdmin");
const leadModel = require("../models/leadsSchema");
const contactResourcesMongoModel = require('../models/contactResourcesMongoSchema');
const leadDistributionModel = require("../models/leadDistributionSchema");
const projectsModel = require("../models/projectsSchema");
const moment = require("moment");
const AWS = require('aws-sdk');
const crypto = require('crypto');
const userModel = require("../models/userSchema");
const organResourcesModel = require('../models/organizationResourcesSchema');
const { sendNotificationsToMultipleUsers, sendNotificationToSingleUser } = require('../functions/sendNotification');
const {sendNotificationForNewProject}=require("../functions/projectNotification")


 const isValidMobile = (mobile) => {
  // Check if the mobile number is numeric and has a length between 10 and 15
  if (!/^\d{7,15}$/.test(mobile)) {
      return  "Mobile number should be of min. 7 digits. Please re-enter" ;
  }

  // Check if the mobile number starts with a 0
  if (mobile.startsWith("0")) {
      return "Mobile number should not start with 0. Please re-enter.";
  }

  return "";
}
// Set up AWS credentials and S3 configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_BUCKET_REGION
});

// Create an S3 instance
const s3 = new AWS.S3();

const uploadFileToS3 = async (request_id, Key) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: Key, // Specify the key (filename) for the file in S3
      Body: fs.createReadStream(`${request_id}.csv`)
    };
    const data = await s3.upload(params).promise();
    return data.Location;
  } catch (error) {
    throw error;
  }
}

const generateS3KeyName = (Id, name) => {
  // Construct key for the uploaded file
  const date = new Date();
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2); // Add leading zero if month is single digit
  let fileId = new ObjectId();
  let fileName = `${fileId}-${name}`;
  // const fileFormat = req.file.mimetype.split('/')[1]; 
  let key = `readpro/${year}/${month}/${Id}/${fileName}`;
  return key;
}

const bucket = admin.storage().bucket();

const dataUploadRequestController = {};

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time"
];

const fields = [
  "Customer Name",
  "Country Code",
  "Customer Mobile No.",
  "Customer Alternate No.",
  "Customer Email Id",
  "Lead Assignee Email",
  "Lead Source",
  "Budget",
  "Project",
  "Location",
  "Lead Type",
  "Campaign",
  "Notes",
  "State",
  "Success/Failed",
  "Failed Reason",
];

const contactImportFields = [
  "Customer Name",
  "Country Code",
  "Customer Mobile No.",
  "Customer Alternate No.",
  "Customer Email Id",
  "Lead Assignee Email",
  "Lead Source",
  "Budget",
  "Project",
  "Location",
  "Campaign",
  "Notes",
  "State",
]

const projectField = [
  "Project Name",
  "Developer Name",
  "Address",
  "Property Type",
  "Project Status",
  "Property Stage",
  "Rera Link",
  "Walkthrough Link",
  "Success/Failed",
  "Failed Reason",
];

const projectImportFields = [
  "Project Name",
  "Developer Name",
  "Address",
  "Property Type",
  "Project Status",
  "Property Stage",
  "Rera Link",
  "Walkthrough Link",
];

const createProjectDataToInsert = async (
  projectList,
  organization_id,
  created_by,
  bulkProjects
) => {
  let uniqueProjectData = [];
  let finalUniqueProjectData = [];
  // let tmp = new Set();
  // let project_id;

  let projectsData = await projectsModel.find({ organization_id });
  if (projectsData) {
    const oldDataPojectName = new Set(projectsData.map(({ project_name }) => project_name));
    uniqueProjectData = [
      ...projectList.filter((item) => !oldDataPojectName.has(item["Project Name"]))
    ];

    uniqueProjectData?.map((list) => {
      if (("Project Name" in list) && ("Address" in list) && ("Developer Name" in list) && ("Property Type" in list) && ("Project Status" in list) && ("Property Stage" in list) && ("Rera Link" in list) && ("Walkthrough Link" in list)) {
        return bulkProjects.push(
          {
            "project_name": list["Project Name"].trim(),
            "developer_name": list["Developer Name"].trim(),
            "address": list["Address"],
            "property_type": list["Property Type"],
            "project_status": list["Project Status"],
            "property_stage": list["Property Stage"],
            "rera_link": list["Rera Link"],
            "walkthrough_link": list["Walkthrough Link"],
            "organization_id": organization_id,
            "modified_by": created_by,
            "created_by": created_by,
            "project_id": new ObjectId()
          });
      }
    });
  }
};

const validateContactCSVHeaders = (headers) => {
  let isCSVHeaderValid = true;
  headers.forEach(header => {
    if (!contactImportFields.includes(header)) {
      isCSVHeaderValid = false;
    }
  })
  contactImportFields.forEach(field => {
    if (!headers.includes(field)) {
      isCSVHeaderValid = false;
    }
  })
  return isCSVHeaderValid;
};

const validateProjectCSVHeaders = (headers) => {
  let isCSVHeaderValid = true;
  headers.forEach(header => {
    if (!projectImportFields.includes(header)) {
      isCSVHeaderValid = false;
    }
  })
  projectImportFields.forEach(field => {
    if (!headers.includes(field)) {
      isCSVHeaderValid = false;
    }
  })
  return isCSVHeaderValid;
};
// const generateToken = (length) => {
//   return crypto.randomBytes(Math.ceil(length / 2))
//     .toString('hex') // Convert to hexadecimal format
//     .slice(0, length); // Trim to desired length
// }

// const getOrganizationResources = async (organization_id) => {
//   const resources = await admin
//     .firestore()
//     .collection("organizationResources")
//     .doc(organization_id)
//     .get();

//   const resourcesData = resources.data() || {}; // Default to an empty object if resources.data() is undefined

//   const leadSources = (resourcesData?.leadSources || []).map((data) => data.leadSource);
//   const budget = (resourcesData?.budgets || []).map((data) => data.budget);
//   const location = (resourcesData?.locations || []).map((data) => data.location_name);
//   const project = (resourcesData?.projects || []).map((data) => data.project_name);
//   const state = (resourcesData?.state || []).map((data) => data.state_name);
//   return {
//     leadSources,
//     budget,
//     location,
//     project,
//     state,
//     comTypes: resourcesData.comTypes ? resourcesData.comTypes : [],
//     resTypes: resourcesData.resTypes ? resourcesData.resTypes : [],
//   };
// };

const getOrganizationResourcesMongo = async (organization_id) => {
  const resource = await organResourcesModel.findOne({organization_id,resource_type: "leadSources"});

  const leadSources = (resource?.leadSources || []).map((data) => data.leadSource);
  // const budget = (resourcesData?.budgets || []).map((data) => data.budget);
  // const location = (resourcesData?.locations || []).map((data) => data.location_name);
  // const project = (resourcesData?.projects || []).map((data) => data.project_name);
  // const state = (resourcesData?.state || []).map((data) => data.state_name);
  return {
    leadSources,
    // budget,
    // location,
    // project,
    // state,
    // comTypes: resourcesData.comTypes ? resourcesData.comTypes : [],
    // resTypes: resourcesData.resTypes ? resourcesData.resTypes : [],
  };
};

const getProjects = async (organization_id) => {
  const projects = await projectsModel.find({ organization_id });
  if (projects.length > 0) {
    let projectNames = projects.map((project) => project.project_name);
    return {
      projectNames
    };
  } else {
    return {
      projectNames: []
    };
  }
};

// const getUserMap = async (organization_id) => {
//   let usersMap = {};
//   const userDocs = await admin
//     .firestore()
//     .collection("users")
//     .where("organization_id", "==", organization_id)
//     .get();
//   userDocs.docs.forEach((doc) => {
//     const user = doc.data();
//     usersMap[user.user_email] = {
//       uid: user.uid,
//       reporting_to: user.reporting_to,
//     };
//   });
//   return usersMap;
// };

const getUserMapMongo = async (organization_id) => {
  let usersMap = {};
  const userData = await userModel.find({organization_id});
  userData.forEach((user) => {
    usersMap[user.user_email] = {
      uid: user.uid,
      reporting_to: user.reporting_to,
    };
  });
  return usersMap;
};

const checkProjectName = async (organization_id, chunk, result) => {
  const docs = await admin
    .firestore()
    .collection("organizationResources")
    .where("organization_id", "==", organization_id)
    .where("project_name", "in", chunk)
    .get();
  if (docs.docs.length !== 0) {
    docs.docs.forEach((doc) => {
      const data = doc.data();
      result.push(data.project_name);

    });
  }
};


const checkFresh = (contact, resources) => {
  if (
    contact["Budget"] !== "" &&
    !resources.budget.includes(contact["Budget"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Budget Not Found",
    };
  } else if (
    contact["Location"] !== "" &&
    !resources.location.includes(contact["Location"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Location Not Found",
    };
  }
  else if (
    contact["State"] && contact["State"] !== "" &&
    !resources.state.includes(contact["State"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "State Not Found",
    };
  }
  else if (
    contact["Project"] !== "" &&
    !resources.project.includes(contact["Project"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Project Not Found",
    };
  } else if (
    contact["Property Stage"] === "Commercial" &&
    !resources.comTypes.includes(contact["Property Sub Type"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Property Sub Type Not Found",
    };
  } else if (
    contact["Property Stage"] === "Residential" &&
    !resources.resTypes.includes(contact["Property Sub Type"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Property Sub Type Not Found",
    };
  }
  return {
    "Success/Failed": "Success",
    "Failed Reason": "",
  };
};

const checkInterested = (contact, resources) => {
  if (!resources.budget.includes(contact["Budget"])) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Interested Lead - Budget Not Found",
    };
  } else if (!resources.location.includes(contact["Location"])) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Interested Lead - Location Not Found",
    };
  }
  else if (contact["State"] && !resources.state.includes(contact["State"])) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Interested Lead - State Not Found",
    };
  }
  else if (!resources.project.includes(contact["Project"])) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Interested Lead - Project Not Found",
    };
  } else if (
    contact["Property Stage"] !== "Commercial" &&
    contact["Property Stage"] !== "Residential"
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Invalid Property Type",
    };
  } else if (
    contact["Property Stage"] === "Commercial" &&
    !resources.comTypes.includes(contact["Property Sub Type"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Interested Lead - Property Sub Type Not Found",
    };
  } else if (
    contact["Property Stage"] === "Residential" &&
    !resources.resTypes.includes(contact["Property Sub Type"])
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Interested Lead - Property Sub Type Not Found",
    };
  } else if (
    contact["Next follow up type"] !== "Call Back" &&
    contact["Next follow up type"] !== "Site Visit" &&
    contact["Next follow up type"] !== "Meeting"
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Invalid Next Follow Up Type",
    };
  } else if (
    !moment(contact["Next follow up date and time"], "MM/DD/YY HH:mm").isValid()
  ) {
    return {
      "Success/Failed": "Failed",
      "Failed Reason": "Invalid Next follow up date and time",
    };
  }
  return {
    "Success/Failed": "Success",
    "Failed Reason": "",
  };
};

const checkCallBack = (contact, resources) => {
  const result = checkFresh(contact, resources);
  if (result["Failed Reason"] === "") {
    if (contact["Next follow up type"] !== "Call Back") {
      return {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Next Follow Up Type",
      };
    } else if (
      !moment(
        contact["Next follow up date and time"],
        "MM/DD/YY HH:mm"
      ).isValid()
    ) {
      return {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Next follow up date and time",
      };
    } else if (
      contact["Call back reason"] !== "Switched Off" &&
      contact["Call back reason"] !== "Not Reachable" &&
      contact["Call back reason"] !== "On Request" &&
      contact["Call back reason"] !== "Not Picked"
    ) {
      return {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Call back reason",
      };
    }
    return {
      "Success/Failed": "Success",
      "Failed Reason": "",
    };
  } else {
    return result;
  }
};

const checkNotInterested = (contact, resources) => {
  const result = checkFresh(contact, resources);
  if (result["Failed Reason"] === "") {
    if (contact["Not Interested Reason"] === "") {
      return {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Not Interested Reason",
      };
    }
    return {
      "Success/Failed": "Success",
      "Failed Reason": "",
    };
  } else {
    return result;
  }
};

const checkLost = (contact, resources) => {
  const result = checkInterested(contact, resources);
  if (result["Failed Reason"] === "") {
    if (contact["Lost reason"] === "") {
      return {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Lost reason",
      };
    }
    return {
      "Success/Failed": "Success",
      "Failed Reason": "",
    };
  } else {
    return result;
  }
};

const checkWon = (contact, resources) => {
  return checkInterested(contact, resources);
};

const validateCSVData = (contactsList, usersMap, resources, projects) => {
  const phoneNumbers = {};
  contactsList.forEach((contact, index) => {
    contact["Stage"] = "FRESH";
    let resultData = {
      "Success/Failed": "Success",
      "Failed Reason": "",
    };

    if (usersMap[contact["Lead Assignee Email"]] === undefined) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Lead Assignee Email Not Found",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["Customer Name"] === "") {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Customer Name Empty",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["Customer Mobile No."] === "") {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Mobile No. Empty",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["Customer Mobile No."].match(/^[0-9]+$/) == null) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Mobile no.",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (
      contact["Customer Alternate No."] !== "" &&
      contact["Customer Alternate No."].match(/^[0-9]+$/) == null
    ) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Alternate No.",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["Country Code"] === "+") {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Country Code Empty",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["Lead Source"] === "") {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Lead Source Empty",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else {
       const vlid=isValidMobile(contact["Customer Mobile No."])
      if(vlid!==""){
        resultData = {
          "Success/Failed": "Failed",
          "Failed Reason": vlid,
        };
        contactsList[index] = { ...contact, ...resultData };
        return;
      }

      if(contact["Customer Mobile No."].length!==10 && (contact["Country Code"]==="+91" || contact["Country Code"]==="91")){
        resultData = {
          "Success/Failed": "Failed",
          "Failed Reason": "Invalid mobile No. length",
        };
        contactsList[index] = { ...contact, ...resultData };
        return;
      }
      if (phoneNumbers[contact["Customer Mobile No."]]) {
        resultData = {
          "Success/Failed": "Failed",
          "Failed Reason": "Repeated Contact No.",
        };
        contactsList[index] = { ...contact, ...resultData };
        return;
      } else {
        phoneNumbers[contact["Customer Mobile No."]] = true;
      }

      if (!resources.leadSources.includes(contact["Lead Source"])) {
        resultData = {
          "Success/Failed": "Failed",
          "Failed Reason": "Lead source doesn't exists",
        };
        contactsList[index] = { ...contact, ...resultData };
        return;
      }
      else{
        contactsList[index] = { ...contact, ...resultData };
      }
      // if (!resources.budget.includes(contact["Budget"])) {
      //   resultData = {
      //     "Success/Failed": "Failed",
      //     "Failed Reason": "Budget doesn't exists",
      //   };
      //   contactsList[index] = { ...contact, ...resultData };
      //   return;
      // }
      // if (!resources.location.includes(contact["Location"])) {
      //   resultData = {
      //     "Success/Failed": "Failed",
      //     "Failed Reason": "Location doesn't exists",
      //   };
      //   contactsList[index] = { ...contact, ...resultData };
      //   return;
      // }
      // if (!resources.state.includes(contact["State"])) {
      //   resultData = {
      //     "Success/Failed": "Failed",
      //     "Failed Reason": "State doesn't exists",
      //   };
      //   contactsList[index] = { ...contact, ...resultData };
      //   return;
      // }
      // if (!projects.projectNames.includes(contact["Project"])) {
      //   resultData = {
      //     "Success/Failed": "Failed",
      //     "Failed Reason": "Project doesn't exists",
      //   };
      //   contactsList[index] = { ...contact, ...resultData };
      //   return;
      // }
    }
  });
};

let csvProcessed = [];
let csvProcessedFinal = [];
const projectValidateCSVData = async (projectList, usersMap, resources, organization_id, created_by) => {

  let duplicateProjectsData = [];
  let uniqueProjectsData = [];
  let uniqueProjData = [];

  let projectsData = await projectsModel.find({ organization_id });

  if (projectsData) {
    const oldDataPojectName = new Set(projectsData.map(({ project_name }) => project_name));

    uniqueProjectsData = [
      ...projectList.filter((item) => !oldDataPojectName.has(item["Project Name"]))
    ];

    uniqueProjectsData?.map((list) => {
      return uniqueProjData.push({ ...list, "Failed Reason": "", "Success/Failed": "success"})
    });


    let duplicateData = [
      ...projectList.filter((item) => oldDataPojectName.has(item["Project Name"]))
    ];
    duplicateData?.map((list) => {
      return duplicateProjectsData.push({ ...list, "Failed Reason": "Project Name  already exists", "Success/Failed": "failed" })
    });
    csvProcessed = duplicateProjectsData.concat(uniqueProjData);

    csvProcessed?.map((list) => {
      if (!("Project Name" in list)) {
        return csvProcessed.push({ ...list, "Failed Reason": "Header not available : Project Name", "Success/Failed": "failed" })
      }
    });
  }
  else {
    projectList?.map((list) => {
      return csvProcessed.push({ ...list, "Failed Reason": "", "Success/Failed": "success" })
    });
    csvProcessed?.map((list) => {
      if (!("Project Name" in list)) {
        return csvProcessed.push({ ...list, "Failed Reason": "Header not available : Project Name", "Success/Failed": "failed" })
      }
    });

  }

};

const chunk = (arr, chunkSize) => {
  if (chunkSize <= 0) {
    return [];
  }
  var R = [];
  for (var i = 0, len = arr.length; i < len; i += chunkSize)
    R.push(arr.slice(i, i + chunkSize));
  return R;
};


const checkContactNoMongo = async (organization_id, chunk, result) => {
  try {
    let data = await leadModel.find({ contact_no: { $in: chunk }, organization_id: organization_id, transfer_status: false });
    if (data) {
      data.map((doc) => {
        result.push(doc.contact_no);
      });
    }
  } catch (err) {
    console.log("error in checking lead exist", err);
  }
};

const createLeadsDataToInsert = async (
  contact,
  organization_id,
  userMap,
  created_by,
  leadIds,
  bulkLeads,
  bulkNotes
) => {
  let leadId = new ObjectId();
  let leadData = {};
  let contactResourceDoc = {};
  let uid = userMap[contact["Lead Assignee Email"]].uid;
  if (leadIds[uid]) {
    leadIds[uid].push(leadId);
  } else {
    leadIds[uid] = [leadId];
  }

  leadData = {
    Id: leadId,
    alternate_no: contact["Customer Alternate No."],
    organization_id: organization_id,
    associate_status: true,
    budget: contact["Budget"],
    contact_no: contact["Customer Mobile No."],
    country_code: contact["Country Code"],
    created_at: new Date(),
    created_by: created_by,
    customer_name: contact["Customer Name"],
    email: contact["Customer Email Id"],
    lead_source: contact["Lead Source"],
    lead_assign_time: new Date(),
    modified_at: new Date(),
    campaign: contact["Campaign"],
    stage_change_at: new Date(),
    location: contact["Location"],
    lead_type: contact["Lead Type"],
    previous_owner: "",
    project: contact["Project"],
    source_status: true,
    stage: contact["Stage"].toUpperCase(),
    transfer_status: false,
    uid: userMap[contact["Lead Assignee Email"]].uid,
    contact_owner_email: contact["Lead Assignee Email"],
    feedback_time: "",
    state: contact["State"] ? contact["State"] : "",
  }

  bulkLeads.push(leadData);

  if (contact["Notes"] !== "") {
    let noteData = {
      note: contact["Notes"],
      created_at: new Date(),
    };

    contactResourceDoc = {
      leadId,
      notes: [
        noteData
      ],
      attachments: []
    };

    bulkNotes.push(contactResourceDoc);
  }

};

const createUploadRequest = async (requestData) => {
  try {
    const dataUploadRequest = await dataUploadRequestModel.create({
      request_id: requestData.request_id,
      organization_id: requestData.organization_id,
      file_url: requestData.file_url,
      status: requestData.status,
      type: requestData.type,
      created_by: requestData.createdBy,
      uid: requestData.uid,
    });
    return dataUploadRequest;
  } catch (err) {
    return {};
  }
}

const updateUploadRequest = async (request_id, updateData) => {
  try {
    const id = request_id;
    const dataUploadRequest = await dataUploadRequestModel.findOneAndUpdate(
      { request_id: id },
      { $set: updateData },
      { new: true }
    );
    return dataUploadRequest;
  } catch (error) {
    return {};
  }
}

dataUploadRequestController.UploadContacts = async (req, res) => {
  try {
    const fileUrl = req.body.fileUrl ? req.body.fileUrl : "";
    const request_id = req.body.request_id ? req.body.request_id : "";
    const organization_id = req.body.organization_id ? req.body.organization_id : "";
    const created_by = req.body.created_by ? req.body.created_by : "";
    const uid = req.body.uid ? req.body.uid : "";
    if (!fileUrl || !request_id || !organization_id || !created_by || !uid) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }
    let fileName = `r-${request_id}.csv`;
    const processedFileLocation = generateS3KeyName(request_id, fileName);

    const contactUploadRequest = {
      request_id,
      organization_id,
      file_url: fileUrl,
      status: "Uploaded",
      type: "Contacts",
      created_by,
      uid,
    }

    const dataUploadRequest = await createUploadRequest(contactUploadRequest);
    const contactsList = [];
    const header = fields.map((feild) => {
      return { id: feild, title: feild };
    });
    const csvWriter = createCsvWriter({
      path: `${request_id}.csv`,
      header,
    });
    let nameFeild = undefined;
    // let validateCSVHeadersRan = false;
    let areCSVHeadersValid = true;
    let csvHeaders;
    const request = https.get(fileUrl, function (response) {
      response
        .pipe(csv())
        .on("data", async (data) => {
          csvHeaders = Object.keys(data);
          areCSVHeadersValid = validateContactCSVHeaders(csvHeaders);
          if (nameFeild === undefined) {
            nameFeild = Object.keys(data)[0];
          }
          if (
            nameFeild !== "Customer Name" &&
            nameFeild.includes("Customer Name")
          ) {
            data["Customer Name"] = data[nameFeild];
            delete data[nameFeild];
          }
          if (data["Country Code"] && (!data["Country Code"].startsWith("+"))) {
            data["Country Code"] = "+" + data["Country Code"];
          }
          contactsList.push(data);
        })
        .on("end", async () => {
          if (areCSVHeadersValid === false) {
            return res.status(400).json({
              success: false,
              message: "Imported CSV is not in required format, Please use the template provided in Import Contacts Panel"
            });
          }
          const usersMap = await getUserMapMongo(organization_id);
          const resources = await getOrganizationResourcesMongo(organization_id);
          const projects = await getProjects(organization_id);
          validateCSVData(contactsList, usersMap, resources, projects);
          const contact_map = {};

          if (contactsList.length > 10000) {
            return res.status(400).json({
              success: false,
              message: "Maximum of 10,000 records allowed to import at once",
              error: "Maxium import limit breached",
            });
          }

          let contact_nos = contactsList.map((contact, index) => {
            if (contact["Failed Reason"] === "") {
              contact_map[contact["Customer Mobile No."]] = index;
              return contact["Customer Mobile No."];
            }
          });
          contact_nos = contact_nos.filter((contact) => contact !== undefined);

          const chunks = chunk(contact_nos, 5000);

          const contactCheckResult = [];
          for (let i = 0; i < chunks.length; i++) {
            await checkContactNoMongo(organization_id, chunks[i], contactCheckResult);
          }


          if (contactCheckResult.length !== 0) {
            contactCheckResult.forEach((contact_no) => {
              const index = contact_map[contact_no];
              contactsList[index] = {
                ...contactsList[index],
                "Success/Failed": "Failed",
                "Failed Reason": "Mobile No. Already Exists",
              };
            });
          }
          // const promises = [];
          let count = 0;
          let notifications = {};
          let leadIds = {};
          let bulkLeads = [];
          let bulkNotes = [];
          contactsList.forEach((contact) => {
            if (contact["Failed Reason"] === "") {
              createLeadsDataToInsert(
                contact,
                organization_id,
                usersMap,
                created_by,
                leadIds,
                bulkLeads,
                bulkNotes
              );

              count += 1;

              let uid = usersMap[contact["Lead Assignee Email"]].uid;
              if (notifications[uid]) {
                notifications[uid] += 1;
              } else {
                notifications[uid] = 1;
              }
            }
          });

          let leadsData = await leadModel.insertMany(bulkLeads);
          let contactResourcesData = await contactResourcesMongoModel.insertMany(bulkNotes);

          // const fcmTokens = (
          //   await admin
          //     .firestore()
          //     .collection("fcmTokens")
          //     .doc(organization_id)
          //     .get()
          // ).data();
          Object.keys(notifications).forEach(async (uid) => {
            let user = await userModel.findOne({uid});
            let userFcmToken = user?.fcm_token ? user?.fcm_token  : "";
            await sendNotificationToSingleUser(userFcmToken,"New Leads",`${leadIds[uid].length} leads assigned`);
            // let user = await userModel.findOne({uid});
            // if (user && user["fcm_token"] && user["fcm_token"] !== "") {
            //   admin.messaging().sendToDevice(
            //     user["fcm_token"],
            //     {
            //       notification: {
            //         title: "New Leads",
            //         body: `${leadIds[uid].length} leads assigned`,
            //         body: `leads assigned`,
            //         sound: "default",
            //       },
            //     },
            //     { contentAvailable: false, priority: "high" }
            //   );
            // }
          });
          await csvWriter.writeRecords(contactsList);
          const fileUrl = await uploadFileToS3(request_id, processedFileLocation);
          const updateDataForUploadRequest = { status: "Processed", upload_count: count, response_url: fileUrl };
          const dataUploadRequest = await updateUploadRequest(request_id, updateDataForUploadRequest);
          await fs.unlink(`${request_id}.csv`, async () => {
          });
          return res.status(201).json({
            success: true,
            message: "Data imported successfully"
          });
        });
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: err.message,
    });
  }
};

dataUploadRequestController.UploadProjects = async (req, res) => {
  try {
    const fileUrl = req.body.fileUrl ? req.body.fileUrl : "";
    const request_id = req.body.request_id ? req.body.request_id : "";
    const organization_id = req.body.organization_id ? req.body.organization_id : "";
    const created_by = req.body.created_by ? req.body.created_by : "";
    const uid = req.body.uid ? req.body.uid : "";
    if (!fileUrl || !request_id || !organization_id || !created_by || !uid) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }
    let fileName = `r-${request_id}.csv`;
    const processedFileLocation = generateS3KeyName(request_id, fileName);

    const projectsUploadRequest = {
      request_id,
      organization_id,
      file_url: fileUrl,
      status: "Uploaded",
      type: "Projects",
      created_by,
      uid,
    }

    const dataUploadRequest = await createUploadRequest(projectsUploadRequest);

    const projectList = [];
    const header = projectField.map((feild) => {
      return { id: feild, title: feild };
    });
    const csvWriter = createCsvWriter({
      path: `${request_id}.csv`,
      header,
    });
    let nameFeild = undefined;
    let areCSVHeadersValid = true;
    const request = https.get(fileUrl, function (response) {
      response
        .pipe(csv())
        .on("data", async (data) => {
          csvHeaders = Object.keys(data);
          areCSVHeadersValid = validateProjectCSVHeaders(csvHeaders);
          if (nameFeild === undefined) {
            nameFeild = Object.keys(data)[0];
          }
          if (
            nameFeild !== "Project Name" &&
            nameFeild.includes("Project Name")
          ) {
            data["Project Name"] = data[nameFeild];
            delete data[nameFeild];
          }
          // if (!data["Country Code"].startsWith("+")) {
          //   data["Country Code"] = "+" + data["Country Code"];
          // }
          projectList.push(data);
        })
        .on("end", async () => {
          if (areCSVHeadersValid === false) {
            return res.status(400).json({
              success: false,
              message: "Imported CSV is not in required format, Please use the template provided in Import Projects Panel"
            });
          }
          const projectPromises = [];
          const usersMap = await getUserMapMongo(organization_id);
          const resources = await getOrganizationResourcesMongo(organization_id);
          const validatePromise = projectValidateCSVData(projectList, usersMap, resources, organization_id, created_by);
          projectPromises.push(validatePromise);
          await Promise.all(projectPromises);
          const project_map = {};
          let bulkProjects = [];

          if (projectList.length > 10000) {
            return res.status(400).json({
              success: false,
              message: "Maximum of 10,000 records allowed to import at once",
              error: "Maxium import limit breached",
            });
          }

          let project_nos = projectList.map((project, index) => {

            if (project["Failed Reason"] === "") {
              project_map[project["Project Name"]] = index;
              return project["Project Name"];
            }
            else {
              return project["Project Name"];
            }
          });
          project_nos = project_nos.filter((project) => project !== undefined);

          const chunks = chunk(project_nos, 10);
          const promises = [];
          let count = 0;
          let notifications = {};
          let leadIds = {};
          await createProjectDataToInsert(
            projectList,
            organization_id,
            created_by,
            bulkProjects
          );

          // console
          let projectsData = await projectsModel.insertMany(bulkProjects);

          count = bulkProjects.length;

         if(bulkProjects.length >0 && bulkProjects[0].organization_id){
          await sendNotificationForNewProject(bulkProjects[0].organization_id);
         }
          
          
          await csvWriter.writeRecords(csvProcessed);
          const fileUrl = await uploadFileToS3(request_id, processedFileLocation);
          const updateDataForUploadRequest = { status: "Processed", upload_count: count, response_url: fileUrl };
          const dataUploadRequest = await updateUploadRequest(request_id, updateDataForUploadRequest);
          await fs.unlink(`${request_id}.csv`, async () => {
          });
          return res.status(201).json({
            success: true,
            message: "Data imported successfully"
          });
        });
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: err.message,
    });
  }
};

// // Get all API tokens - GET request
dataUploadRequestController.FetchAll = async (req, res) => {
  try {
    let sort = { created_at: -1 }
    const { organization_id,uid, type
    } = req.query;
    if (!organization_id || !uid || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }

    const dataUploadRequests = await dataUploadRequestModel.find({ organization_id: organization_id,uid: uid, type: type }, { __v: 0 }).lean()
      .sort(sort)
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: dataUploadRequests
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

module.exports = dataUploadRequestController;
