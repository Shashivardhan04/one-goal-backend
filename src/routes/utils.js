var ObjectId = require("mongoose").Types.ObjectId;
const express = require("express");
const https = require("https");
const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
// const admin = require("firebase-admin");
const storage = require("firebase/storage");
var router = express.Router();
const admin = require("../../firebaseAdmin");
const leadModel = require("../models/leadsSchema");
const contactResourcesMongoModel = require('../models/contactResourcesMongoSchema');
const leadDistributionModel = require("../models/leadDistributionSchema");
const userModel = require("../models/userSchema");
// const serviceAccount = require("../../read-pro-firebase-adminsdk-yj5wq-69599c58f5.json");
const moment = require("moment");

const app=require("../../firebase");

const auth=app.auth();

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   storageBucket: "read-pro.appspot.com",
// });

const bucket = admin.storage().bucket();

const fields = [
  "Customer Name",
  "Country Code",
  "Mobile No.",
  "Alternate No.",
  "Email Id",
  "Stage",
  "Owner",
  "Lead Source",
  "Budget",
  "Call back reason",
  "Project",
  "Property type",
  "Property Sub Type",
  "Property Stage",
  "Location",
  "Lead Type",
  "Lost reason",
  "Not Interested Reason",
  "Other Lost Reason",
  "Other Not interested reason",
  "Next follow up type",
  "Next follow up date and time",
  "Created By",
  "Created At",
  "Lead Assign At",
  "Stage Change At",
  "Addset",
  "Campaign",
  "Inventory Type",
  "Notes",
  "Success/Failed",
  "Failed Reason",
];

// const projectField = [
//   "Created By",
//   "Property Type",
//   "Rera Link",
//   "Project Image",
//   "Devloper Name",
//   "Walkthough Link",
//   "Address",
//   "Created At",
//   "Project Id",
//   "Project Name",
// ];

const projectField = [
  "address",
  "created_by",
  "developer_name",
  "project_id",
  "project_image",
  "project_name",
  "property_type",
  "rera_link",
  "status",
  "walkthough_link",
  "success/failed",
  "failed_reason"
];

const apiDataFields = [
  "alternate_no",
  "associate_contact",
  "budget",
  "contact_no",
  "contact_owner_email",
  "country_code",
  "created_at",
  "created_by",
  "customer_name",
  "email",
  // "lead_id",
  "lead_source",
  "location",
  // "organization_id",
  "project",
  "property_stage",
  "property_type",
  "stage",
  "status",
  "success/failed",
  "failed_reason"
];

const createLeadFirebase = async (
  contact,
  organization_id,
  userMap,
  created_by,
  leadIds
) => {
  const doc = admin.firestore().collection("contacts").doc();
  let uid = userMap[contact["Owner"]].uid;
  if (leadIds[uid]) {
    leadIds[uid].push(doc.id);
  } else {
    leadIds[uid] = [doc.id];
  }
  await doc.create({
    alternate_no: contact["Alternate No."],
    organization_id: organization_id,
    associate_status: true,
    budget: contact["Budget"],
    contact_no: contact["Mobile No."],
    country_code: contact["Country Code"],
    created_at:
      contact["Created At"] !== ""
        ? moment(contact["Created At"], "MM/DD/YY HH:mm").toDate()
        : admin.firestore.Timestamp.now(),
    created_by:
      contact["Created By"] !== "" ? contact["Created By"] : created_by,
    call_back_reason: contact["Call back reason"],
    customer_image: "",
    customer_name: contact["Customer Name"],
    email: contact["Email Id"],
    lead_source: contact["Lead Source"],
    lead_assign_time:
      contact["Lead Assign At"] !== ""
        ? moment(contact["Lead Assign At"], "MM/DD/YY HH:mm").toDate()
        : admin.firestore.Timestamp.now(),
    modified_at: admin.firestore.Timestamp.now(),
    addset: contact["Addset"],
    campaign: contact["Campaign"],
    stage_change_at:
      contact["Stage Change At"] !== ""
        ? moment(contact["Stage Change At"], "MM/DD/YY HH:mm").toDate()
        : admin.firestore.Timestamp.now(),
    location: contact["Location"],
    lost_reason: contact["Lost reason"],
    not_int_reason: contact["Not Interested Reason"],
    other_not_int_reason: contact["Other Not interested reason"],
    other_lost_reason: contact["Other Lost Reason"],
    lead_type: contact["Lead Type"],
    previous_owner: "",
    project: contact["Project"],
    property_stage: contact["Property Stage"],
    property_type: contact["Property type"],
    property_sub_type: contact["Property Sub Type"],
    source_status: true,
    inventory_type: contact["Inventory Type"],
    stage: contact["Stage"].toUpperCase(),
    transfer_status: false,
    uid: userMap[contact["Owner"]].uid,
    contact_owner_email: contact["Owner"],
    feedback_time: "",
    next_follow_up_type: contact["Next follow up type"],
    next_follow_up_date_time:
      contact["Next follow up date and time"] !== ""
        ? moment(
          contact["Next follow up date and time"],
          "MM/DD/YY HH:mm"
        ).toDate()
        : "",
  });
  if (contact["Notes"] !== "") {
    const resDoc = admin.firestore().collection("contactResources").doc(doc.id);
    await resDoc.create({
      notes: [
        {
          note: contact["Notes"],
          created_at: admin.firestore.Timestamp.now(),
        },
      ],
    });
  }
};

const createApiDataFirebase = async (
  apiData,
  organization_id,
  userMap,
  created_by,
  leadIds
) => {
  const doc = admin.firestore().collection("API-Data").doc();
  // let uid = userMap[contact["Owner"]].uid;
  // if (leadIds[uid]) {
  //   leadIds[uid].push(doc.id);
  // } else {
  //   leadIds[uid] = [doc.id];
  // }
  await doc.create({
    alternate_no: apiData["alternate_no"],
    associate_contact: apiData["associate_contact"],
    organization_id: organization_id,
    budget: apiData["budget"],
    contact_no: apiData["contact_no"],
    country_code: apiData["country_code"],
    created_at: admin.firestore.Timestamp.now(),
    created_by:
      apiData["created_by"] !== "" ? apiData["created_by"] : created_by,
    customer_name: apiData["customer_name"],
    email: apiData["email"],
    lead_source: apiData["lead_source"],
    // lead_assign_time:
    //   apiData["lead_assign_at"] !== ""
    //     ? moment(apiData["lead_assign_at"], "MM/DD/YY HH:mm").toDate()
    //     : admin.firestore.Timestamp.now(),
    location: apiData["location"],
    project: apiData["project"],
    property_stage: apiData["property_stage"],
    property_type: apiData["property_type"],
    stage: apiData["stage"],
    contact_owner_email: apiData["contact_owner_email"],
    status: apiData["status"]
  });
};

const createProjectFirebase = async (
  projectList,
  organization_id,
  created_by,
) => {
  let duplicateProjectData = [];
  let uniqueProjectData = [];
  let finalUniqueProjectData = [];
  let finalProject = [];
  let newDocumentBody = {};
  // let tmp = new Set();
  // let project_id;
  const testingdata = await admin.firestore().collection("organizationResources").doc(organization_id).onSnapshot((projects) => {
    if (projects) {
      let projectData = projects.data();
      const oldDataPojectName = new Set(projectData.projects.map(({ project_name }) => project_name));

      uniqueProjectData = [
        ...projectList.filter(({ project_name }) => !oldDataPojectName.has(project_name))
      ];

      uniqueProjectData?.map((list) => {
        if(("project_name" in list) && ("address" in list) && ("developer_name" in list) && ("created_by" in list) && ("property_type" in list) && ("rera_link" in list) &&("status" in list) && ("walkthough_link" in list) ){
          return finalUniqueProjectData.push({...list, "created_by": created_by, "created_at":new Date() })
        } 
      });
      let duplicateData = [
        ...projectList.filter(({ project_name }) => oldDataPojectName.has(project_name))
      ];
      duplicateData?.map((list) => {
        return duplicateProjectData.push({ project_name: list.project_name, message: "Project Name  already exists" })
      });

      for (let i = 0; i < finalUniqueProjectData.length; i++) {
        const doc = admin.firestore()
          .collection("projectResources")
          .doc();
        doc.set(
          {
            brochures: [],
            priceLists: [],
            forms: [],
            layouts: [],
            organization_id: organization_id,
          },
          { merge: true }
        );
        finalUniqueProjectData[i]["project_id"] = doc.id;
      }
      finalProject = projectData.projects.concat(finalUniqueProjectData);
      newDocumentBody = {
        projects: finalProject
      }
    }
  });
  const testingdata1 = await admin.firestore().collection("organizationResources").where("organization_id", "==", organization_id).get()
    .then(response => {
      let batch = admin.firestore().batch()
      response.docs.forEach((doc) => {
        const docRef = admin.firestore().collection("organizationResources").doc(doc.id)
        batch.update(docRef, newDocumentBody)
      })
      batch.commit().then(() => {

      })
    })

};


const getOrganizationResources = async (organization_id) => {
  const resources = await admin
    .firestore()
    .collection("organizationResources")
    .doc(organization_id)
    .get();
  const resourcesData = resources.data();
  const leadSources = resourcesData?.leadSources.map((data) => data.leadSource);
  const budget = resourcesData?.budgets.map((data) => data.budget);
  const location = resourcesData?.locations.map((data) => data.location_name);
  const project = resourcesData?.projects.map((data) => data.project_name);
  const state = resourcesData?.state?.map((data) => data.state_name);
  return {
    leadSources,
    budget,
    location,
    project,
    state : state ? state : [],
    comTypes: resourcesData.comTypes ? resourcesData.comTypes : [],
    resTypes: resourcesData.resTypes ? resourcesData.resTypes : [],
  };
};

const getUserMap = async (organization_id) => {
  let usersMap = {};
  const userDocs = await admin
    .firestore()
    .collection("users")
    .where("organization_id", "==", organization_id)
    .get();
  userDocs.docs.forEach((doc) => {
    const user = doc.data();
    usersMap[user.user_email] = {
      uid: user.uid,
      reporting_to: user.reporting_to,
    };
  });
  return usersMap;
};

const checkContactNo = async (organization_id, chunk, result) => {
  const docs = await admin
    .firestore()
    .collection("contacts")
    .where("organization_id", "==", organization_id)
    .where("contact_no", "in", chunk)
    .where("transfer_status", "==", false)
    .get();
  if (docs.docs.length !== 0) {
    docs.docs.forEach((doc) => {
      const data = doc.data();
      result.push(data.contact_no);
    });
  }
};

const checkApidataContactNo = async (organization_id, chunk, result) => {
  const docs = await admin
    .firestore()
    .collection("API-Data")
    .where("organization_id", "==", organization_id)
    .where("contact_no", "in", chunk)
    .get();
  if (docs.docs.length !== 0) {
    docs.docs.forEach((doc) => {
      const data = doc.data();
      result.push(data.contact_no);
    });
  }
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
    contact["State"]  && contact["State"] !== "" &&
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

const validateCSVData = (contactsList, usersMap, resources) => {
  const phoneNumbers = {};
  contactsList.forEach((contact, index) => {
    contact["Stage"] = contact["Stage"] === "" ? "FRESH" : contact["Stage"];
    let resultData = {
      "Success/Failed": "Success",
      "Failed Reason": "",
    };

    if (usersMap[contact["Owner"]] === undefined) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Owner Not Found",
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
    }else if(!(contact["Lead Type"] === "Data" || contact["Lead Type"] === "Leads")){
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Lead Type",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["Mobile No."] === "") {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Mobile No. Empty",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["Mobile No."].match(/^[0-9]+$/) == null) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Mobile no.",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (
      contact["Alternate No."] !== "" &&
      contact["Alternate No."].match(/^[0-9]+$/) == null
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
    } else if (
      contact["Inventory Type"] !== "" &&
      contact["Inventory Type"] !== "Primary" &&
      contact["Inventory Type"] !== "Secondary"
    ) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Inventory Type",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (
      contact["Created At"] !== "" &&
      !moment(contact["Created At"], "MM/DD/YY HH:mm").isValid()
    ) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Created At",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (
      contact["Lead Assign At"] !== "" &&
      !moment(contact["Lead Assign At"], "MM/DD/YY HH:mm").isValid()
    ) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Lead Assign At",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else if (
      contact["Stage Change At"] !== "" &&
      !moment(contact["Stage Change At"], "MM/DD/YY HH:mm").isValid()
    ) {
      resultData = {
        "Success/Failed": "Failed",
        "Failed Reason": "Invalid Stage Change At",
      };
      contactsList[index] = { ...contact, ...resultData };
      return;
    } else {
      if (phoneNumbers[contact["Mobile No."]]) {
        resultData = {
          "Success/Failed": "Failed",
          "Failed Reason": "Repeated Contact No.",
        };
        contactsList[index] = { ...contact, ...resultData };
        return;
      } else {
        phoneNumbers[contact["Mobile No."]] = true;
      }

      if (!resources.leadSources.includes(contact["Lead Source"])) {
        resultData = {
          "Success/Failed": "Failed",
          "Failed Reason": "Lead source not exist",
        };
        contactsList[index] = { ...contact, ...resultData };
        return;
      }
      if (contact["Stage"].toLowerCase() === "fresh") {
        resultData = checkFresh(contact, resources);
        contactsList[index] = { ...contact, ...resultData };
      } else if (contact["Stage"].toLowerCase() === "call back") {
        resultData = checkCallBack(contact, resources);
        contactsList[index] = { ...contact, ...resultData };
      } else if (contact["Stage"].toLowerCase() === "interested") {
        resultData = checkInterested(contact, resources);
        contactsList[index] = { ...contact, ...resultData };
      } else if (contact["Stage"].toLowerCase() === "not interested") {
        resultData = checkNotInterested(contact, resources);
        contactsList[index] = { ...contact, ...resultData };
      } else if (contact["Stage"].toLowerCase() === "won") {
        resultData = checkWon(contact, resources);
        contactsList[index] = { ...contact, ...resultData };
      } else if (contact["Stage"].toLowerCase() === "lost") {
        resultData = checkLost(contact, resources);
        contactsList[index] = { ...contact, ...resultData };
      } else {
        resultData = {
          "Success/Failed": "Failed",
          "Failed Reason": "Invalid Stage",
        };
        contactsList[index] = { ...contact, ...resultData };
      }
    }
  });
};

let csvProcessed = [];
let csvProcessedFinal = [];
const projectValidateCSVData = async (projectList, usersMap, resources, organization_id, created_by) => {

  let duplicateProjectsData = [];
  let uniqueProjectsData = [];
  let uniqueProjData = [];

  const previousProject = await admin.firestore().collection("organizationResources").doc(organization_id).onSnapshot((projects) => {
    if (projects) {
      let projectData = projects.data();
      const oldDataPojectName = new Set(projectData.projects.map(({ project_name }) => project_name));

      uniqueProjectsData = [
        ...projectList.filter(({ project_name }) => !oldDataPojectName.has(project_name))
      ];

      uniqueProjectsData?.map((list) => {
        return uniqueProjData.push({ ...list, failed_reason: "", "success/failed": "success", created_by: created_by })
      });


      let duplicateData = [
        ...projectList.filter(({ project_name }) => oldDataPojectName.has(project_name))
      ];
      duplicateData?.map((list) => {
        return duplicateProjectsData.push({ ...list, failed_reason: "Project Name  already exists", "success/failed": "failed" })
      });
      csvProcessed = duplicateProjectsData.concat(uniqueProjData);

      csvProcessed?.map((list) => {
        if(!("project_name" in list)){
          return csvProcessed.push({ ...list, failed_reason: "Header not available : project_name", "success/failed": "failed"})
        }
      });
    }
  });

};



const apiValidateCSVData = (apiDataList, usersMap, resources) => {
  const phoneNumbers = {};
  apiDataList.forEach((contact, index) => {
    contact["stage"] = contact["stage"] === "" ? "FRESH" : contact["stage"];
    let resultData = {
      "success/failed": "Success",
      "failed_reason": "",
    };

    if (usersMap[contact["contact_owner_email"]] === undefined) {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Owner Not Found",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["customer_name"] === "") {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Customer Name Empty",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["contact_no"] === "") {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Contact Number Empty",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["contact_no"].match(/^[0-9]+$/) == null) {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Invalid Contact no.",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else if (
      contact["alternate_no"] !== "" &&
      contact["alternate_no"].match(/^[0-9]+$/) == null
    ) {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Invalid Alternate No.",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["country_code"] === "+") {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Country Code Empty",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else if (contact["lead_source"] === "") {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Lead Source Empty",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else if (!resources.leadSources.includes(contact["lead_source"])) {
      resultData = {
        "success/failed": "Failed",
        "failed_reason": "Lead source not exist",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
    } else {
      resultData = {
        "success/failed": "Success",
        "failed_reason": "",
      };
      apiDataList[index] = { ...contact, ...resultData };
      return;
      // if (phoneNumbers[contact["contact_no"]]) {
      //   resultData = {
      //     "success/failed": "Failed",
      //     "failed_reason": "Repeated Contact No.",
      //   };
      //   apiDataList[index] = { ...contact, ...resultData };
      //   return;
      // } else {
      //   phoneNumbers[contact["contact_no"]] = true;
      // }
    }
  });
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

// Before Migration

// router.post("/uploadContactsTest", (req, res) => {
//   const fileUrl = req.body.fileUrl;
//   const request_id = req.body.request_id;
//   const organization_id = req.body.organization_id;
//   const created_by = req.body.created_by ? req.body.created_by : "";
//   const contactsList = [];
//   const header = fields.map((feild) => {
//     return { id: feild, title: feild };
//   });
//   const csvWriter = createCsvWriter({
//     path: `${request_id}.csv`,
//     header,
//   });
//   let nameFeild = undefined;
//   const request = https.get(fileUrl, function (response) {
//     response
//       .pipe(csv())
//       .on("data", async (data) => {
//         if (nameFeild === undefined) {
//           nameFeild = Object.keys(data)[0];
//         }
//         if (
//           nameFeild !== "Customer Name" &&
//           nameFeild.includes("Customer Name")
//         ) {
//           data["Customer Name"] = data[nameFeild];
//           delete data[nameFeild];
//         }
//         if (!data["Country Code"].startsWith("+")) {
//           data["Country Code"] = "+" + data["Country Code"];
//         }
//         contactsList.push(data);
//       })
//       .on("end", async () => {
//         const usersMap = await getUserMap(organization_id);
//         const resources = await getOrganizationResources(organization_id);
//         validateCSVData(contactsList, usersMap, resources);
//         const contact_map = {};

//         let contact_nos = contactsList.map((contact, index) => {
//           if (contact["Failed Reason"] === "") {
//             contact_map[contact["Mobile No."]] = index;
//             return contact["Mobile No."];
//           }
//         });
//         contact_nos = contact_nos.filter((contact) => contact !== undefined);

//         const chunks = chunk(contact_nos, 10);
//         const contactCheckResult = [];
//         for (let i = 0; i < chunks.length; i++) {
//           await checkContactNo(organization_id, chunks[i], contactCheckResult);
//         }

//         if (contactCheckResult.length !== 0) {
//           contactCheckResult.forEach((contact_no) => {
//             const index = contact_map[contact_no];
//             contactsList[index] = {
//               ...contactsList[index],
//               "Success/Failed": "Failed",
//               "Failed Reason": "Mobile No. Already Exists",
//             };
//           });
//         }
//         const promises = [];
//         let count = 0;
//         let notifications = {};
//         let leadIds = {};
//         contactsList.forEach((contact) => {
//           if (contact["Failed Reason"] === "") {
//             const promise = createLeadFirebase(
//               contact,
//               organization_id,
//               usersMap,
//               created_by,
//               leadIds
//             );
//             count += 1;
//             promises.push(promise);
//             let uid = usersMap[contact["Owner"]].uid;
//             if (notifications[uid]) {
//               notifications[uid] += 1;
//             } else {
//               notifications[uid] = 1;
//             }
//           }
//         });
//         await Promise.all(promises);
//         const fcmTokens = (
//           await admin
//             .firestore()
//             .collection("fcmTokens")
//             .doc(organization_id)
//             .get()
//         ).data();
//         Object.keys(notifications).forEach((uid) => {
//           if (fcmTokens && fcmTokens[uid] && fcmTokens[uid] !== "") {
//             admin.messaging().sendToDevice(
//               fcmTokens[uid],
//               {
//                 notification: {
//                   title: "New Leads",
//                   body: `${leadIds[uid].length} leads assigned`,
//                   sound: "default",
//                 },
//                 // data: {
//                 //   id: doc.id,
//                 // },
//               },
//               { contentAvailable: false, priority: "high" }
//             );
//           }
//         });
//         await csvWriter.writeRecords(contactsList);

//         bucket
//           .upload(`${request_id}.csv`, {
//             destination: `contactsUploadDataTest/${organization_id}/r-${request_id}.csv`,
//           })
//           .then(async () => {
//             fs.unlink(`${request_id}.csv`, async () => {
//               await admin
//                 .firestore()
//                 .collection("contactsUploadRequestTest")
//                 .doc(request_id)
//                 .set(
//                   { status: "Processed", uploadCount: count },
//                   { merge: true }
//                 );
//               res.send("Done");
//             });
//           });
//       });
//   });
// });

// router.post("/uploadProject", (req, res) => {
//   const fileUrl = req.body.fileUrl;
//   const request_id = req.body.request_id;
//   const organization_id = req.body.organization_id;
//   const created_by = req.body.created_by ? req.body.created_by : "";
//   const projectList = [];
//   const header = projectField.map((feild) => {
//     return { id: feild, title: feild };
//   });
//   const csvWriter = createCsvWriter({
//     path: `${request_id}.csv`,
//     header,
//   });
//   let nameFeild = undefined;
//   const request = https.get(fileUrl, function (response) {
//     response
//       .pipe(csv())
//       .on("data", async (data) => {
//         if (nameFeild === undefined) {
//           nameFeild = Object.keys(data)[0];
//         }
//         if (
//           nameFeild !== "Project Name" &&
//           nameFeild.includes("Project Name")
//         ) {
//           data["Project Name"] = data[nameFeild];
//           delete data[nameFeild];
//         }
//         // if (!data["Country Code"].startsWith("+")) {
//         //   data["Country Code"] = "+" + data["Country Code"];
//         // }
//         projectList.push(data);
//       })
//       .on("end", async () => {
//         const projectPromises = [];
//         const usersMap = await getUserMap(organization_id);
//         const resources = await getOrganizationResources(organization_id);
//         const validatePromise = projectValidateCSVData(projectList, usersMap, resources, organization_id, created_by);
//         projectPromises.push(validatePromise);
//         await Promise.all(projectPromises);
//         const project_map = {};

//         let project_nos = projectList.map((project, index) => {

//           if (project["Failed Reason"] === "") {
//             project_map[project["Project Name"]] = index;
//             return project["Project Name"];
//           }
//           else {
//             return project["Project Name"];
//           }
//         });
//         project_nos = project_nos.filter((project) => project !== undefined);

//         const chunks = chunk(project_nos, 10);
//         const promises = [];
//         let count = 0;
//         let notifications = {};
//         let leadIds = {};
//         const promise = createProjectFirebase(
//           projectList,
//           organization_id,
//           created_by,
//         );
//         count = projectList.length;
//         promises.push(promise);
//         await Promise.all(promises);

//         await csvWriter.writeRecords(csvProcessed);

//         bucket
//           .upload(`${request_id}.csv`, {
//             destination: `projectUploadData/${organization_id}/r-${request_id}.csv`,
//           })
//           .then(async () => {
//             fs.unlink(`${request_id}.csv`, async () => {
//               await admin
//                 .firestore()
//                 .collection("projectUploadRequest")
//                 .doc(request_id)
//                 .set(
//                   { status: "Processed", uploadCount: count },
//                   { merge: true }
//                 );
//               res.send("Done");
//             });
//           });
//       });
//   });
// });



router.post("/uploadApiData", (req, res) => {
  const fileUrl = req.body.fileUrl;
  const request_id = req.body.request_id;
  const organization_id = req.body.organization_id;
  const created_by = req.body.created_by ? req.body.created_by : "";
  const apiDataList = [];
  const header = apiDataFields.map((feild) => {
    return { id: feild, title: feild };
  });
  const csvWriter = createCsvWriter({
    path: `${request_id}.csv`,
    header,
  });
  let nameFeild = undefined;
  const request = https.get(fileUrl, function (response) {
    response
      .pipe(csv())
      .on("data", async (data) => {
        if (nameFeild === undefined) {
          nameFeild = Object.keys(data)[0];
        }
        if (
          nameFeild !== "customer_name" &&
          nameFeild.includes("customer_name")
        ) {
          data["customer_name"] = data[nameFeild];
          delete data[nameFeild];
        }
        if (!data["country_code"].startsWith("+")) {
          data["country_code"] = "+" + data["country_code"];
        }
        apiDataList.push(data);
      })
      .on("end", async () => {
        const usersMap = await getUserMap(organization_id);
        const resources = await getOrganizationResources(organization_id);
        apiValidateCSVData(apiDataList, usersMap, resources);
        const apidata_map = {};

        let apidata_nos = apiDataList.map((contact, index) => {
          if (contact["failed_reason"] === "") {
            apidata_map[contact["contact_no"]] = index;
            return contact["contact_no"];
          }
        });
        apidata_nos = apidata_nos.filter((contact) => contact !== undefined);

        const chunks = chunk(apidata_nos, 10);
        const apiDataCheckResult = [];
        for (let i = 0; i < chunks.length; i++) {
          await checkApidataContactNo(organization_id, chunks[i], apiDataCheckResult);
        }

        if (apiDataCheckResult.length !== 0) {
          apiDataCheckResult.forEach((contact_no) => {
            const index = apidata_map[contact_no];
            apiDataList[index] = {
              ...apiDataList[index],
              "success/failed": "Failed",
              "failed_reason": "Contact Number Already Exists",
            };
          });
        }
        const promises = [];
        let count = 0;
        let leadIds = {};
        apiDataList.forEach((contact) => {
          if (contact["failed_reason"] === "") {
            const promise = createApiDataFirebase(
              contact,
              organization_id,
              usersMap,
              created_by,
              leadIds
            );
            count += 1;
            promises.push(promise);
          }
        });
        await Promise.all(promises);
        await csvWriter.writeRecords(apiDataList);

        bucket
          .upload(`${request_id}.csv`, {
            destination: `apiUploadData/${organization_id}/r-${request_id}.csv`,
          })
          .then(async () => {
            fs.unlink(`${request_id}.csv`, async () => {
              await admin
                .firestore()
                .collection("apiUploadRequest")
                .doc(request_id)
                .set(
                  { status: "Processed", uploadCount: count },
                  { merge: true }
                );
              res.send("Done");
            });
          });
      });
  });
});

router.post("/updatePasswordUser",async (req,res)=>{
  let uid = req.body.uid;
  let password = req.body.password;
  await admin.auth()
  .updateUser(uid, {
    password: password,
  })
  .then((userRecord) => {
    // See the UserRecord reference doc for the contents of userRecord.
    console.log('Successfully updated user', userRecord.toJSON());
    res.status(200).json({success:true})
  })
  .catch((error) => {
    console.log('Error updating user:', error);
    res.status(400).json({success:false})
  });
})


// After this migration code starts

const checkContactNoMongo = async (organization_id, chunk, result) => {
    try{
      let data = await leadModel.find({contact_no:{$in:chunk},organization_id:organization_id,transfer_status:false});
      if(data){
        data.map((doc) => {
          result.push(doc.contact_no);
        });
      }
    }catch(err){
      console.log("error in checking lead exist", err);
    }
};

const createLeadMongo = async (
  contact,
  organization_id,
  userMap,
  created_by,
  leadIds
) => {
  let leadId = new ObjectId()
  let uid = userMap[contact["Owner"]].uid;
  if (leadIds[uid]) {
    leadIds[uid].push(leadId);
  } else {
    leadIds[uid] = [leadId];
  }
  const newLead = new leadModel({
    Id: leadId,
    alternate_no: contact["Alternate No."],
    organization_id: organization_id,
    associate_status: true,
    budget: contact["Budget"],
    contact_no: contact["Mobile No."],
    country_code: contact["Country Code"],
    created_at:
      contact["Created At"] !== ""
        ? moment(contact["Created At"], "MM/DD/YY HH:mm").toDate()
        : new Date(),
    created_by:
      contact["Created By"] !== "" ? contact["Created By"] : created_by,
    call_back_reason: contact["Call back reason"],
    customer_image: "",
    customer_name: contact["Customer Name"],
    email: contact["Email Id"],
    lead_source: contact["Lead Source"],
    lead_assign_time:
      contact["Lead Assign At"] !== ""
        ? moment(contact["Lead Assign At"], "MM/DD/YY HH:mm").toDate()
        : new Date(),
    modified_at: new Date(),
    addset: contact["Addset"],
    campaign: contact["Campaign"],
    stage_change_at:
      contact["Stage Change At"] !== ""
        ? moment(contact["Stage Change At"], "MM/DD/YY HH:mm").toDate()
        : new Date(),
    location: contact["Location"],
    lost_reason: contact["Lost reason"],
    not_int_reason: contact["Not Interested Reason"],
    other_not_int_reason: contact["Other Not interested reason"],
    other_lost_reason: contact["Other Lost Reason"],
    lead_type: contact["Lead Type"],
    previous_owner: "",
    project: contact["Project"],
    property_stage: contact["Property Stage"],
    property_type: contact["Property type"],
    property_sub_type: contact["Property Sub Type"],
    source_status: true,
    inventory_type: contact["Inventory Type"],
    stage: contact["Stage"].toUpperCase(),
    transfer_status: false,
    uid: userMap[contact["Owner"]].uid,
    contact_owner_email: contact["Owner"],
    feedback_time: "",
    next_follow_up_type: contact["Next follow up type"],
    next_follow_up_date_time:
      contact["Next follow up date and time"] !== ""
        ? moment(
          contact["Next follow up date and time"],
          "MM/DD/YY HH:mm"
        ).toDate()
        : "",
        state: contact["State"] ? contact["State"] : "",
  });
  await newLead.save();

  if (contact["Notes"] !== "") {
      let noteData = {
        note: contact["Notes"],
        created_at: new Date(),
      };
     
      const query = {
        leadId: leadId,
      };
      const update = {
        $push: { notes:  noteData},
        uid:uid,
        organization_id:organization_id,
        leadId:leadId
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
     await contactResourcesMongoModel.findOneAndUpdate(query, update, options);
  }
};

// After Migration

router.post("/uploadContacts", (req, res) => {
  const fileUrl = req.body.fileUrl;
  const request_id = req.body.request_id;
  const organization_id = req.body.organization_id;
  const created_by = req.body.created_by ? req.body.created_by : "";
  const contactsList = [];
  const header = fields.map((feild) => {
    return { id: feild, title: feild };
  });
  const csvWriter = createCsvWriter({
    path: `${request_id}.csv`,
    header,
  });
  let nameFeild = undefined;
  const request = https.get(fileUrl, function (response) {
    response
      .pipe(csv())
      .on("data", async (data) => {
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
        if (!data["Country Code"].startsWith("+")) {
          data["Country Code"] = "+" + data["Country Code"];
        }
        contactsList.push(data);
      })
      .on("end", async () => {
        const usersMap = await getUserMap(organization_id);
        const resources = await getOrganizationResources(organization_id);
        validateCSVData(contactsList, usersMap, resources);
        const contact_map = {};

        let contact_nos = contactsList.map((contact, index) => {
          if (contact["Failed Reason"] === "") {
            contact_map[contact["Mobile No."]] = index;
            return contact["Mobile No."];
          }
        });
        contact_nos = contact_nos.filter((contact) => contact !== undefined);

        const chunks = chunk(contact_nos, 10);
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
        const promises = [];
        let count = 0;
        let notifications = {};
        let leadIds = {};
        contactsList.forEach((contact) => {
          if (contact["Failed Reason"] === "") {
            const promise = createLeadMongo(
              contact,
              organization_id,
              usersMap,
              created_by,
              leadIds
            );
            count += 1;
            promises.push(promise);
            let uid = usersMap[contact["Owner"]].uid;
            if (notifications[uid]) {
              notifications[uid] += 1;
            } else {
              notifications[uid] = 1;
            }
          }
        });
        await Promise.all(promises);
        // const fcmTokens = (
        //   await admin
        //     .firestore()
        //     .collection("fcmTokens")
        //     .doc(organization_id)
        //     .get()
        // ).data();
        Object.keys(notifications).forEach(async (uid) => {
          let user = await userModel.findOne({uid});
          if (user && user["fcm_token"] && user["fcm_token"] !== "") {
            admin.messaging().sendToDevice(
              user["fcm_token"],
              {
                notification: {
                  title: "New Leads",
                  body: `${leadIds[uid].length} leads assigned`,
                  sound: "default",
                },
                // data: {
                //   id: doc.id,
                // },
              },
              { contentAvailable: false, priority: "high" }
            );
          }
        });
        await csvWriter.writeRecords(contactsList);

        bucket
          .upload(`${request_id}.csv`, {
            destination: `contactsUploadData/${organization_id}/r-${request_id}.csv`,
          })
          .then(async () => {
            fs.unlink(`${request_id}.csv`, async () => {
              await admin
                .firestore()
                .collection("contactsUploadRequest")
                .doc(request_id)
                .set(
                  { status: "Processed", uploadCount: count },
                  { merge: true }
                );
              res.send("Done");
            });
          });
      });
  });
});

router.post("/changeRole",async (req,res)=>{
  try {
    const user = await admin.auth().getUser(req.body.uid);
    admin.auth().setCustomUserClaims(req.body.uid, {
      ...user.customClaims,
      role: "organization",
    });
    res.status(200).json({success:true})
  } catch (error) {
    console.log("akaaka",error)
    res.status(400).json({success:false})
  }
})

// logic to transfer data of distribution logic collection from firebase to mongodb 


const getDistributionLogic = async (organization_id) => {
  try {
    const doc = await admin
      .firestore()
      .collection("leadDistribution")
      .where("organization_id", "!=", null)
      .get();
    let data = [];
    doc.docs.map(doc => 
      {
        data.push(doc.data());
      }
      );
      return data;
  } catch (error) {
    throw new Error(`Error fetching distribution logic: ${error.message}`);
  }
};

router.post("/transferDistributionLogic", async (req, res) => {
  try {
    const { organization_id } = req.body;

    let distributionLogics = await getDistributionLogic(organization_id);


    // let check = await leadDistributionModel.findOne({ organization_id: organization_id });

    // if (check) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "this organization data is already present"
    //   })
    // }

    // You might want to use the distributionLogic data in some way here

    // distributionLogic.created_at = new Date(distributionLogic.created_at._seconds * 1000 + Math.round(distributionLogic.created_at._nanoseconds / 1e6));
    // distributionLogic.modified_at = new Date(distributionLogic.modified_at._seconds * 1000 + Math.round(distributionLogic.modified_at._nanoseconds / 1e6));

    // return res.status(201).json({
    //   success: true,
    //   message: "Logic created successfully",
    //   data: distributionLogic
    // });
    let count = 0;

    distributionLogics.map(async (distributionLogic) => {
      let logics = distributionLogic.logic

      logics.forEach((logic) => {
        logic.created_at = logic.created_at.toDate();
        logic.modify_at = logic.modify_at.toDate();
        logic["users"] = logic.users.map(val => val.uid);

      })


      // distributionLogic["logic"] = logics;


      if (distributionLogic.userIndex) {
        Object.keys(distributionLogic.userIndex).forEach((val) => {
          let temp = distributionLogic.logic[val];
          if (distributionLogic.logic[val]) {
            distributionLogic.logic[val] = { ["current_index"]: distributionLogic.userIndex[val], ...temp }
          }

        })
      }


      delete distributionLogic.userIndex;

      const leadDistributionPromises = distributionLogic.logic.map(async (val) => {
        let obj = {
          source: val.source,
          organization_id: distributionLogic.organization_id,
          budget: val.budget || [],
          created_at: val.created_at,
          modified_at: val.modify_at,
          location: val.location || [],
          project: val.project || [],
          users: val.users || [],
          property_type: val.property_type || [],
          api_forms: val.api_forms || [],
          current_index: parseInt(val.current_index, 10) || 0,
        };
        count++;
        console.log("aman obj n",obj,count);

        return leadDistributionModel.create(obj);
      });

      await Promise.all(leadDistributionPromises);
    })

    return res.status(201).json({
      success: true,
      message: "Logic created successfully",
      data: "success"
    });

    // console.log("distributionLogic",logics)
    // return res.json({
    //   success: true,
    //   message: "Distribution logic fetched successfully",
    //   data: distributionLogic,
    // });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred. Please try again.",
      error: error.message,
    });
  }
});


/////////////// forgot password endpoint /////////////////////
router.post("/forgetPassword", async (req, res) => {
  try {
    const { email } = req.body;
    await auth.sendPasswordResetEmail(email);
   return res.status(200).status({
      success:true,
      message:"Password reset information have been sent on you registered email id"
    });
  } catch (error) {
   return res.status(200).status({
      success:true,
      message:"Password reset information have been sent on you registered email id",
      error:error.message
    });
  }
});

///////////////////////////////////////////////////////////////////


module.exports = router;
