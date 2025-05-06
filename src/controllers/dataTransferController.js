var ObjectId = require("mongoose").Types.ObjectId;
const admin = require("../../firebaseAdmin");
const projectsModel = require("../models/projectsSchema");
const projectResoucesModel = require("../models/projectResourcesSchema");
const dataUploadRequestModel = require('../models/dataUploadRequestSchema');
const apiTokenModel = require('../models/apiTokenSchema');
const faqModel = require('../models/faqSchema');
const apiDataModel = require('../models/apiDataSchema');

const dataTransferController = {};

const convertTimestampToDate = (timestamp) => {
  if (timestamp) {
    const seconds = timestamp.seconds || timestamp._seconds || 0;
    const nanoseconds = timestamp.nanoseconds || timestamp._nanoseconds || 0;
    const date = new Date(seconds * 1000 + nanoseconds / 1000000);
    return date;
  } else {
    return null;
  }
};

// const convertTimestampsToDate = (obj) => {
//   const outputObject = {};

//   for (const key in obj) {
//     if (obj.hasOwnProperty(key)) {
//       const value = obj[key];

//       if (
//         typeof value === 'object' &&
//         value !== null &&
//         (value.hasOwnProperty('seconds') || value.hasOwnProperty('_seconds')) &&
//         (value.hasOwnProperty('nanoseconds') || value.hasOwnProperty('_nanoseconds'))
//       ) {
//         // Handle timestamp value
//         const seconds = value.seconds || value._seconds || 0;
//         const nanoseconds = value.nanoseconds || value._nanoseconds || 0;
//         const date = new Date(seconds * 1000 + nanoseconds / 1000000);
//         outputObject[key] = date;
//       } else {
//         // Handle date value or other types
//         outputObject[key] = value;
//       }
//     }
//   }

//   return outputObject;
// };

dataTransferController.transferProjects = async (req, res) => {
  try {
    const doc = await admin
      .firestore()
      .collection("organizationResources")
      .where("organization_id", "!=", '')
      .get();
    let bulkProjectsDataToInsert = [];
    doc.docs.map((doc) => {
      let projects = doc.data().projects ? doc.data().projects : [];
      let organization_id = doc.data().organization_id ? doc.data().organization_id : '';
      if (projects && projects.length > 0) {
        projects.map((project) => {
          {
            // data.push(doc.data());
            let projectData = {
              address: project.address ? project.address : "",
              business_vertical: project.business_vertical
                ? project.business_vertical
                : "",
              organization_id: organization_id ? organization_id : '',
              created_by: project.created_by ? project.created_by : '',
              modified_by: project.created_by ? project.created_by : '',
              developer_name: project.developer_name
                ? project.developer_name
                : "",
              project_id: project.project_id ? project.project_id : '',
              project_name: project.project_name ? project.project_name : "",
              project_status: project.project_status
                ? project.project_status
                : "",
              property_stage: project.property_stage
                ? project.property_stage
                : "",
              property_type: project.property_type ? project.property_type : "",
              rera_link: project.rera_link ? project.rera_link : "",
              walkthrough_link: project.walkthrough_link
                ? project.walkthrough_link
                : "",
              owner_name: "",
              owner_contact_no: "",
              type: "NEW PROJECT",
              price: 0,
              unit_no: "",
              description: "",
              created_at: convertTimestampToDate(project.created_at),
              modified_at: convertTimestampToDate(project.created_at),
              project_image: project.project_image ? project.project_image : ''
            };
            bulkProjectsDataToInsert.push(projectData);
          }
        });
      }
    });
    // console.log("aman data",bulkProjectsDataToInsert);

    let projectsData = await projectsModel.insertMany(bulkProjectsDataToInsert);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: bulkProjectsDataToInsert.length,
    });
  } catch (error) {
    console.log("aman error", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error,
    });
  }
};

dataTransferController.transferProjectResources = async (req, res) => {
  try {
    const doc = await admin
      .firestore()
      .collection("projectResources")
      .where("organization_id", "!=", "")
      .get();
    let bulkProjectResourcesDataToInsert = [];
    doc.docs.map(async (doc) => {
      let organization_id = doc.data().organization_id ? doc.data().organization_id : '';
      let project_id = doc.id;
      let update;
      let images = doc.data().images ? doc.data().images : [];
      let brochures = doc.data().brochures ? doc.data().brochures : [];
      let videos = doc.data().video ? doc.data().video : [];
      let pricelists = doc.data().priceLists ? doc.data().priceLists : [];
      let layouts = doc.data().layouts ? doc.data().layouts : [];
      let forms = doc.data().forms ? doc.data().forms : [];

      if (images.length < 1 && brochures.length < 1 && videos.length < 1 && pricelists.length < 1 && layouts.length < 1 && forms.length < 1) {
        return;
      }

      images.forEach((image) => {
        return (image.created_at = convertTimestampToDate(image.created_at));
      });

      brochures.forEach((brochure) => {
        return (brochure.created_at = convertTimestampToDate(
          brochure.created_at
        ));
      });

      videos.forEach((video) => {
        return (video.created_at = convertTimestampToDate(video.created_at));
      });

      pricelists.forEach((pricelist) => {
        return (pricelist.created_at = convertTimestampToDate(
          pricelist.created_at
        ));
      });

      layouts.forEach((layout) => {
        return (layout.created_at = convertTimestampToDate(layout.created_at));
      });

      forms.forEach((form) => {
        return (form.created_at = convertTimestampToDate(form.created_at));
      });

      update = {
        images,
        brochures,
        videos,
        pricelists,
        layouts,
        forms
      };

      const query = {
        organization_id,
        project_id,
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      };
      bulkProjectResourcesDataToInsert.push(update);
      await projectResoucesModel.findOneAndUpdate(query, update, options);
    });
    // console.log("aman data", bulkProjectResourcesDataToInsert);

    //  let projectsData = await projectsModel.insertMany(bulkProjectsDataToInsert);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: bulkProjectResourcesDataToInsert.length
    });
  } catch (error) {
    console.log("aman error", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error,
    });
  }
};

dataTransferController.transferProjectUploadRequests = async (req, res) => {
  try {
    const doc = await admin
      .firestore()
      .collection("projectUploadRequest")
      .where("organization_id", "!=", "")
      .get();
    let bulkprojectUploadRequestDataToInsert = [];
    doc.docs.map((doc) => {
      let projectUploadRequest = doc.data();
      if (projectUploadRequest) {
        let projectUploadRequestData = {
          created_at: convertTimestampToDate(projectUploadRequest.created_at),
          created_by: projectUploadRequest.created_by ? projectUploadRequest.created_by : '',
          file_url: projectUploadRequest.fileUrl ? projectUploadRequest.fileUrl : '',
          organization_id: projectUploadRequest.organization_id ? projectUploadRequest.organization_id : '',
          request_id: projectUploadRequest.request_id ? projectUploadRequest.request_id : '',
          response_url: projectUploadRequest.responseURL ? projectUploadRequest.responseURL : '',
          status: projectUploadRequest.status ? projectUploadRequest.status : '',
          uid: projectUploadRequest.created_by ? projectUploadRequest.created_by : '',
          upload_count: projectUploadRequest.uploadCount ? projectUploadRequest.uploadCount : '',
          type: "Projects",
        };
        bulkprojectUploadRequestDataToInsert.push(projectUploadRequestData);
      }
    });

    let projectUploadRequestData = await dataUploadRequestModel.insertMany(bulkprojectUploadRequestDataToInsert);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: bulkprojectUploadRequestDataToInsert.length,
    });
  } catch (error) {
    console.log("aman error", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error,
    });
  }
};

dataTransferController.transferContactUploadRequests = async (req, res) => {
  try {
    const doc = await admin
      .firestore()
      .collection("contactsUploadRequest")
      .where("organization_id", "!=", "")
      .get();
    let bulkcontactsUploadRequestDataToInsert = [];
    doc.docs.map((doc) => {
      let contactsUploadRequest = doc.data();
      if (contactsUploadRequest) {
        let contactsUploadRequestData = {
          created_at: convertTimestampToDate(contactsUploadRequest.created_at),
          created_by: contactsUploadRequest.created_by ? contactsUploadRequest.created_by : '',
          file_url: contactsUploadRequest.fileUrl ? contactsUploadRequest.fileUrl : '',
          organization_id: contactsUploadRequest.organization_id ? contactsUploadRequest.organization_id : '',
          request_id: contactsUploadRequest.request_id ? contactsUploadRequest.request_id : '',
          response_url: contactsUploadRequest.responseURL ? contactsUploadRequest.responseURL : '',
          status: contactsUploadRequest.status ? contactsUploadRequest.status : '',
          uid: contactsUploadRequest.created_by ? contactsUploadRequest.created_by : '',
          upload_count: contactsUploadRequest.uploadCount ? contactsUploadRequest.uploadCount : '',
          type: "Contacts",
        };
        bulkcontactsUploadRequestDataToInsert.push(contactsUploadRequestData);
      }
    });

    let contactsUploadRequestData = await dataUploadRequestModel.insertMany(bulkcontactsUploadRequestDataToInsert);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: bulkcontactsUploadRequestDataToInsert.length,
    });
  } catch (error) {
    console.log("aman error", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error,
    });
  }
};

dataTransferController.transferApiTokens = async (req, res) => {
  try {
    const doc = await admin
      .firestore()
      .collection("apiTokens")
      .where("organization_id", "!=", "")
      .get();
    let bulkapiTokensDataToInsert = [];
    doc.docs.map((doc) => {
      let apiToken = doc.data();
      if (apiToken) {
        let apiTokenData = {
          organization_id: apiToken.organization_id ? apiToken.organization_id : '',
          source: apiToken.source ? apiToken.source : '',
          status: apiToken.status ? apiToken.status : 'ACTIVE',
          country_code: apiToken.country_code ? apiToken.country_code : '',
          created_at: convertTimestampToDate(apiToken.created_at),
          modified_at: convertTimestampToDate(apiToken.created_at),
          created_by: '',
          modified_by: '',
          token: doc.id,
        };
        bulkapiTokensDataToInsert.push(apiTokenData);
      }
    });

    let apiTokenMongo = await apiTokenModel.insertMany(bulkapiTokensDataToInsert);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: bulkapiTokensDataToInsert.length,
    });
  } catch (error) {
    console.log("aman error", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error,
    });
  }
};

dataTransferController.transferFaq = async (req, res) => {
  try {
    const doc = await admin
      .firestore()
      .collection("faq")
      .where("FAQ", "!=", "")
      .get();
    let bulkFaqDataToInsert = [];
    doc.docs.map((doc) => {
      let Faq = doc.data();
      if (Faq.FAQ && Faq.FAQ.length > 0) {
        Faq.FAQ.map(item => {
          let FaqData = {
            organization_id: doc.id,
            created_at: new Date(),
            modified_at: new Date(),
            created_by: '',
            modified_by: '',
            question: item.question,
            answer: item.answer,
          };
          bulkFaqDataToInsert.push(FaqData);
        })
      }
    });

    let faqData = await faqModel.insertMany(bulkFaqDataToInsert);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: bulkFaqDataToInsert.length,
    });
  } catch (error) {
    console.log("aman error", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error,
    });
  }
};

dataTransferController.transferAPIData = async (req, res) => {
  try {
    let startDate = new Date(req.body.startDate);
    let endDate = new Date(req.body.endDate);
    const doc = await admin
      .firestore()
      .collection("API-Data")
      .where("organization_id", "!=", "")
      .where('created_at', '>', startDate)
      .where('created_at', '<', endDate)
      .get();
    let bulkApiDataToInsert = [];
    doc.docs.map((doc) => {
      let apiData = doc.data();
      // console.log("api",apiData);
      if (apiData) {
        let apiDataBody = {
          alternate_no: apiData.alternate_no ? apiData.alternate_no : '',
          associate_contact: apiData.associate_contact ? String(apiData.associate_contact) : '',
          budget: apiData.budget ? apiData.budget : '',
          contact_no: apiData.contact_no ? apiData.contact_no : '',
          contact_owner_email: apiData.contact_owner_email ? apiData.contact_owner_email : '',
          country_code: apiData.country_code ? apiData.country_code : '',
          created_at: convertTimestampToDate(apiData.created_at),
          lead_assign_time: convertTimestampToDate(apiData.lead_assign_time),
          created_by: apiData.created_by ? apiData.created_by : '',
          customer_name: apiData.customer_name ? apiData.customer_name : '',
          email: apiData.email ? apiData.email : '',
          fail_reason: apiData.fail_reason ? apiData.fail_reason : '',
          lead_source: apiData.lead_source ? apiData.lead_source : '',
          location: apiData.location ? apiData.location : '',
          organization_id: apiData.organization_id,
          project: apiData.project ? apiData.project : '',
          property_stage: apiData.property_stage ? apiData.property_stage : '',
          property_type: apiData.property_type ? apiData.property_type : '',
          stage: apiData.stage ? apiData.stage : '',
          status: apiData.status ? apiData.status : '',
          api_forms: apiData.api_forms ? apiData.api_forms : '',
          leadId: apiData.lead_id
        };
        bulkApiDataToInsert.push(apiDataBody);
      }
    });
    // console.log("jsjs",bulkApiDataToInsert,bulkApiDataToInsert.length)
    let apiDataMongo = await apiDataModel.insertMany(bulkApiDataToInsert);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: bulkApiDataToInsert.length,
    });
  } catch (error) {
    console.log("aman error", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error,
    });
  }
};

module.exports = dataTransferController;
