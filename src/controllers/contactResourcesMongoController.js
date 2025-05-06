var ObjectId = require('mongoose').Types.ObjectId;
const contactResourcesMongoModel = require('../models/contactResourcesMongoSchema');
const {data} = require("../constants/data");
const admin = require("../../firebaseAdmin");
const userAuthorizationModel = require('../models/userAuthorizationSchema.js');
require("dotenv").config();
const app = require("firebase");
const AWS = require("aws-sdk");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");
// const fetch = require('node-fetch');
const axios = require('axios');
const path = require('path');


const contactResourceMongoController = {};

// const convertTimestampsToDate = (obj) => {
//   const outputObject = {};

//   for (const key in obj) {
//      if (obj.hasOwnProperty(key)) {
//         const value = obj[key];

//         if (typeof value === 'object' && value !== null && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
//            // Handle timestamp value
//            const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
//            outputObject[key] = date;
//         } else {
//            // Handle date value or other types
//            outputObject[key] = value;
//         }
//      }
//   }

//   return outputObject;
// }

const convertTimestampsToDate = (obj) => {
  const outputObject = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (
        typeof value === 'object' &&
        value !== null &&
        (value.hasOwnProperty('seconds') || value.hasOwnProperty('_seconds')) &&
        (value.hasOwnProperty('nanoseconds') || value.hasOwnProperty('_nanoseconds'))
      ) {
        // Handle timestamp value
        const seconds = value.seconds || value._seconds || 0;
        const nanoseconds = value.nanoseconds || value._nanoseconds || 0;
        const date = new Date(seconds * 1000 + nanoseconds / 1000000);
        outputObject[key] = date;
      } else {
        // Handle date value or other types
        outputObject[key] = value;
      }
    }
  }

  return outputObject;
};

contactResourceMongoController.AddAttachment = async (req, res) => {
    try{
      const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
      if(userPreference && userPreference.contact_attachments_create_approved === false){
          return res.status(400).json({ success: false, message: "You are not allowed to add attachment . Please contact your admin"});
      }
        let leadId = req.body.leadId ? req.body.leadId : "";
        let attachmentData = req.body.attachmentData ? req.body.attachmentData : "";
        let modifiedAttachmentData = convertTimestampsToDate(attachmentData);
        const query = {
          leadId: leadId,
        };
        const update = {
          $push: { attachments:  modifiedAttachmentData},
        };
        const options = {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        };
        const updatedDocument = await contactResourcesMongoModel.findOneAndUpdate(query, update, options);
        return res.status(200).json({"success": true,data:updatedDocument,message:"Attachment uploaded successfully"});
      }catch(err){
        return res.status(400).json({"success": false,"error":err,message:"Attachment couldn't be uploaded"});
      }
};

contactResourceMongoController.AddNote = async (req, res) => {
  try{
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_notes_create_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to add notes . Please contact your admin"});
    }
    let leadId = req.body.leadId ? req.body.leadId : "";
    // let organizationId = req.body.organization_id ? req.body.organization_id : "";
    // let uid = req.body.uid ? req.body.uid : "";
    let noteData = req.body.noteData ? req.body.noteData : "";
    let modifiedNoteData = convertTimestampsToDate(noteData);
    const query = {
      leadId: leadId,
    };
    const update = {
      $push: { notes:  modifiedNoteData},
      // uid:uid,
      // organization_id:organizationId,
      leadId:leadId
    };
    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    };
    const updatedDocument = await contactResourcesMongoModel.findOneAndUpdate(query, update, options);
    return res.status(200).json({"success": true,data:updatedDocument});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

contactResourceMongoController.FetchContactResources = async (req, res) => {
  try{
    let leadId = req.body.leadId ? req.body.leadId : "";
    let query = {
      leadId: leadId,
    };
    let contactResources = await contactResourcesMongoModel.findOne(query);
    let notes = contactResources.notes ? contactResources.notes.reverse() : [];
    let attachments = contactResources.attachments ? contactResources.attachments.reverse() : [];

    contactResources.notes = notes;
    contactResources.attachments = attachments;
    
    return res.status(200).json({"success": true,data:contactResources});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

contactResourceMongoController.Create = async (req, res) => {
  const convertTimestampsToDate2 = (obj) => {
    for (const key in obj) {
       if (obj.hasOwnProperty(key)) {
          const value = obj[key];
  
          if (typeof value === 'object' && value !== null && value.hasOwnProperty('_seconds') && value.hasOwnProperty('_nanoseconds')) {
             // Handle timestamp value
             const date = new Date(value._seconds * 1000 + value._nanoseconds / 1000000);
             obj[key] = date;
          } else {
             // Handle date value or other types
             obj[key] = value;
          }
       }
    }
  }
  try{
      let leadId = req.body.leadId;
      let contactResources = req.body.contactResources;
      let notesData =  contactResources.notes ? contactResources.notes : [];
      let attachmentsData = contactResources.attachments ? contactResources.attachments : [];
      if(attachmentsData.length > 0){
        attachmentsData.forEach(item => {
         convertTimestampsToDate2(item);
        })
      }
      if(notesData.length > 0){
        notesData.forEach(item => {
         convertTimestampsToDate2(item);
        })
      }
      let reverseNotesData = notesData.reverse();
      let reverseAttachmentsData = attachmentsData.reverse();
      const query = {
        leadId: leadId,
      };
      const update = {
         notes:  reverseNotesData,
         attachments: reverseAttachmentsData,
        // uid:uid,
        // organization_id:organizationId,
        leadId:leadId
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const updatedDocument = await contactResourcesMongoModel.findOneAndUpdate(query, update, options);
    return res.status(200).json({"success": true});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

contactResourceMongoController.BulkCreate = async (req, res) => {
  const convertTimestampsToDate2 = (obj) => {
    for (const key in obj) {
       if (obj.hasOwnProperty(key)) {
          const value = obj[key];
  
          if (typeof value === 'object' && value !== null && value.hasOwnProperty('_seconds') && value.hasOwnProperty('_nanoseconds')) {
             // Handle timestamp value
             const date = new Date(value._seconds * 1000 + value._nanoseconds / 1000000);
             obj[key] = date;
          } else {
             // Handle date value or other types
             obj[key] = value;
          }
       }
    }
  }
  try{
    let total = 0;
    data.map(async (item) => {
      const attachmentDoc =await  admin.firestore().collection("contactResources").doc(item["Id"]).get();
      let notesData = attachmentDoc.data() ? attachmentDoc.data().notes ? attachmentDoc.data().notes : [] : [];
      let attachmentsData = attachmentDoc.data() ? attachmentDoc.data().attachments ? attachmentDoc.data().attachments : [] : [];
      if(attachmentsData.length > 0){
        attachmentsData.forEach(item => {
         convertTimestampsToDate2(item);
        })
      }
      if(notesData.length > 0){
        notesData.forEach(item => {
         convertTimestampsToDate2(item);
        })
      }
      let reverseNotesData = notesData.reverse();
      let reverseAttachmentsData = attachmentsData.reverse();
      const query = {
        leadId: item["Id"],
      };
      const update = {
         notes:  reverseNotesData,
         attachments: reverseAttachmentsData,
        // uid:uid,
        // organization_id:organizationId,
        leadId:item["Id"]
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const updatedDocument = await contactResourcesMongoModel.findOneAndUpdate(query, update, options);
      total++;
      console.log("alzzkzkzl",updatedDocument,total);
      // return res.status(200).json({"success": true,data:updatedDocument});
    })
    return res.status(200).json({"success": true});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

contactResourceMongoController.DeleteAttachment = async (req, res) => {
  try{
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_attachments_create_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to add attachment . Please contact your admin"});
    }
      let leadId = req.body.leadId ? req.body.leadId : "";
      let attachmentData = req.body.attachmentData ? req.body.attachmentData : "";
      const query = {
        leadId: leadId,
      };
      let attachments = await contactResourcesMongoModel.findOne(query);
      let attachmentsArray = attachments.attachments ? attachments.attachments : [];
      let updatedAttachments = attachmentsArray.filter((item)=>{
        return item.name !== attachmentData.name;
      })
      const update = { attachments:  updatedAttachments}
      
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const updatedDocument = await contactResourcesMongoModel.findOneAndUpdate(query, update, options);
      return res.status(200).json({"success": true,data:updatedDocument});
    }catch(err){
      console.log("error",err)
      return res.status(400).json({"success": false,"error":err});
    }
};

contactResourceMongoController.BulkOperationsFirebase = async (req, res) => {
  try{
    let total = 0;
    data.map(async (item) => {
      const updatedDoc =await  admin.firestore().collection("contacts").doc(item["Id"]).update(
        {
          lead_source: "Fresh Data",
          modified_at: admin.firestore.Timestamp.now()
        }
      );
      // const updatedDoc =await  admin.firestore().collection("contacts").doc(item["Id"]).get();
      total++;
      console.log("alzzkzkzl",updatedDoc,total);
      // return res.status(200).json({"success": true,data:updatedDocument});
    })
    return res.status(200).json({"success": true});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

contactResourceMongoController.createLeads = async (req, res) => {
  try{
    data.map(async (item,index) => {
      const firestoreTimestamp = new admin.firestore.Timestamp(
        item.created_at.seconds,
        item.created_at.nanoseconds
      );
      const leadDistribution = async (organization_id, item) => {
        const docs = await admin.firestore()
          .collection("leadDistribution")
          .where("organization_id", "==", organization_id)
          .get();
        if (docs.size === 0) {
          return undefined;
        } else {
          let userData = undefined;
          const distributionData = docs.docs[0].data();
          let logic = distributionData.logic;
          logic.forEach((data, index) => {
            if (userData !== undefined) {
              return;
            }
            let flag = true;
            Object.keys(data).forEach((key) => {
              if (data[key].length !== 0 && flag) {
                if (
                  key !== "users" &&
                  data[key].includes &&
                  !data[key].includes(item[key])
                ) {
                  flag = false;
                }
              }
            });
            if (flag == true) {
              let userIndex = distributionData.userIndex
                ? distributionData.userIndex[index]
                  ? distributionData.userIndex[index]
                  : 0
                : 0;
      
              userIndex = userIndex % data["users"].length;
              userData = data["users"][userIndex];
              distributionData.userIndex = {
                ...distributionData.userIndex,
                [index]: admin.firestore.FieldValue.increment(1),
              };
            }
          });
          if (userData !== undefined) {
            docs.docs[0].ref.set(
              { userIndex: distributionData.userIndex },
              { merge: true }
            );
          }
          return userData;
        }
      };
      const userData = await leadDistribution(item.organization_id, {
        ...item,
        source: item.source,
      });
      if (userData) {
        item.owner_email = userData.user_email;
        item.uid = userData.uid;
      } else {
        item.owner_email = "",
        item.uid = ""
      }
      console.log("amamnj",item,index,{
        alternate_no: item.alternate_no ? item.alternate_no : "",
        associate_status: true,
        budget: item.budget ? item.budget : "",
        contact_no: item.contact_no,
        country_code: item.country_code,
        created_at: firestoreTimestamp,
        created_by: item.created_by ? item.created_by : "",
        customer_image: "",
        customer_name: item.customer_name,
        email: item.email ? item.email : "",
        lead_source: item.lead_source,
        lead_assign_time: firestoreTimestamp,
        location: item.location ? item.location : "",
        lead_type: "Leads",
        lost_reason: "",
        not_int_reason: "",
        other_not_int_reason: "",
        other_lost_reason: "",
        previous_owner: "",
        project: item.project ? item.project : "",
        property_stage: item.property_stage ? item.property_stage : "",
        property_type: item.property_type ? item.property_type : "",
        source_status: true,
        stage: item.stage ? String(item.stage).toUpperCase() : "FRESH",
        transfer_status: false,
        uid: item.uid,
        feedback_time: "",
        next_follow_up_type: "",
        next_follow_up_date_time: "",
        organization_id: item.organization_id,
        contact_owner_email: item.owner_email ? item.owner_email : "",
        campaign: item.campaign ? item.campaign : "",
        addset: item.addset ? item.addset : "",
        api_forms: item.api_forms ? item.api_forms : "",
      })
      const doc = await admin.firestore().collection("contacts").doc();
      await doc.set({
        alternate_no: item.alternate_no ? item.alternate_no : "",
        associate_status: true,
        budget: item.budget ? item.budget : "",
        contact_no: item.contact_no,
        country_code: item.country_code,
        created_at: firestoreTimestamp,
        created_by: item.created_by ? item.created_by : "",
        customer_image: "",
        customer_name: item.customer_name,
        email: item.email ? item.email : "",
        lead_source: item.lead_source,
        lead_assign_time: firestoreTimestamp,
        location: item.location ? item.location : "",
        lead_type: "Leads",
        lost_reason: "",
        not_int_reason: "",
        other_not_int_reason: "",
        other_lost_reason: "",
        previous_owner: "",
        project: item.project ? item.project : "",
        property_stage: item.property_stage ? item.property_stage : "",
        property_type: item.property_type ? item.property_type : "",
        source_status: true,
        stage: item.stage ? String(item.stage).toUpperCase() : "FRESH",
        transfer_status: false,
        uid: item.uid,
        feedback_time: "",
        next_follow_up_type: "",
        next_follow_up_date_time: "",
        organization_id: item.organization_id,
        contact_owner_email: item.owner_email ? item.owner_email : "",
        campaign: item.campaign ? item.campaign : "",
        addset: item.addset ? item.addset : "",
        api_forms: item.api_forms ? item.api_forms : "",
      });
      // return res.status(200).json({"success": true,data:updatedDocument});
    })
    return res.status(200).json({"success": true});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

contactResourceMongoController.GetNotesInBulk = async (req, res) => {
  try{
    let leadIds = req.body.leadIds ? req.body.leadIds : [];
    let contactResources = await contactResourcesMongoModel.find({leadId:{$in:leadIds}});
    
    return res.status(200).json({"success": true,data:contactResources});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

contactResourceMongoController.GetFetchContactResources = async (req, res) => {
  try{
    let leadId = req.query.leadId ;

    if (!leadId){
      return res.status(400).json({
        "success":false,
        "error":"leadId required"
      })
    }
    let query = {
      leadId: leadId,
    };
    let contactResources = await contactResourcesMongoModel.findOne(query);

    if(!contactResources){
      return res.status(200).json({
        success:true,
        data:[]
      })
    }
    let notes = contactResources.notes ? contactResources.notes.reverse() : [];
    let attachments = contactResources.attachments ? contactResources.attachments.reverse() : [];

    contactResources.notes = notes;
    contactResources.attachments = attachments;
    
    return res.status(200).json({"success": true,data:contactResources});
  }catch(err){
    return res.status(400).json({"success": false,"error":err.message || "An error occured, please try again later"});
  }
};


GetFetchContactResourcesNew = async (leadId, res) => {
  try{
    // let leadId = leadId;

    if (!leadId){
      return res.status(400).json({
        "success":false,
        "error":"leadId required"
      })
    }
    let query = {
      leadId: leadId,
    };
    let contactResources = await contactResourcesMongoModel.findOne(query);

    if(!contactResources){
      return res.status(200).json({
        success:true,
        data:[]
      })
    }
    let notes = contactResources.notes ? contactResources.notes.reverse() : [];
    let attachments = contactResources.attachments ? contactResources.attachments.reverse() : [];

    contactResources.notes = notes;
    contactResources.attachments = attachments;
    
    return contactResources;
  }catch(err){
    return res.status(400).json({"success": false,"error":err.message || "An error occured, please try again later"});
  }
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const getFileExtension = (fileName) => {
  return fileName.split(".").pop();
};

const generateS3KeyName = (Id, name) => {
  // Construct key for the uploaded file
  const date = new Date();
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2); // Add leading zero if month is single digit
  let fileId = new ObjectId();
  let fileName = `${fileId}-${name}`;
  // const fileFormat = req.file.mimetype.split('/')[1];
  let key = `readpro/${year}/${month}/${Id}/${fileName}`;
  return key;
};

const sanitizeFileName = (fileName) => {
  // Remove control characters, special characters, and Unicode characters
  const sanitizedFileName = fileName.replace(/[^\w.]/g, "");
  // Limit filename length
  return sanitizedFileName.substring(0, 254); // Maximum length of 255 characters
};

uploadFileToS3 = (req, res) => {
  console.log("req58848488484",req);
    console.log("req.file",req.file,req.body);
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ success: false, error: err.message, message: "An error occured, please try again" });
      }

      const Id = req?.body?.Id ? req.body.Id : "";
      let fileName = req?.file?.originalname ? req.file.originalname : "";

      if (!Id || !fileName) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required parameters" });
      }

      const validFileName = sanitizeFileName(fileName);
      const fileSize = req.file.size;
      const allowedExtensions = [
        "csv",
        "jpg",
        "jpeg",
        "png",
        "pdf",
        "doc",
        "docx",
        "mp3",
        "mp4",
        "mpeg",
        "m4a",
        "wav",
        "aac"
      ]; // Allowed file extensions
      const maxFileSize = 100 * 1024 * 1024; // 100 MB

      // File extension check
      const fileExtension = getFileExtension(validFileName);
      if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid file extension" });
      }

      // File size check
      if (fileSize > maxFileSize) {
        return res
          .status(400)
          .json({
            success: false,
            message: "File size is too large, It should be less than 100 MB",
          });
      }

      // const fileFormat = req.file.mimetype.split('/')[1];
      let key = generateS3KeyName(Id, validFileName);
      // {req.body.type===undefined ?
      //   key = `readpro/${year}/${month}/${leadId}/${req.file.originalname}`:
      //   key = `readpro/${year}/${month}/${req.body.type}/${leadId}/${req.file.originalname}`
      // }

      // Upload the file to S3
      const uploadParams = {
        Bucket: bucketName,
        Body: req.file.buffer,
        Key: key,
        ContentType: req.file.mimetype,
      };
      const command = new PutObjectCommand(uploadParams);
      // await s3Client.send(command);
      const uploadResult = await s3Client.send(command);
      // Construct URL for the uploaded file
      const fileUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;

      // Send success response with file URL
      return res.json({
        success: true,
        message: "File uploaded successfully",
        url: fileUrl,
      });
    } catch (error) {
      throw error;
    }
  });
};

function getMimeType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
      case 'jpg':
      case 'jpeg':
          return 'image/jpeg';
      case 'png':
          return 'image/png';
      case 'pdf':
          return 'application/pdf';
      case 'doc':
          return 'application/msword';
      case 'docx':
          return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'mp3':
          return 'audio/mp3';
      case 'mp4':
          return 'video/mp4';
      case 'mpeg':
          return 'video/mpeg';
      case 'm4a':
          return 'audio/mp4';
      case 'wav':
          return 'audio/wav';
      case 'aac':
          return 'audio/aac';
      default:
          return 'application/octet-stream'; // Default MIME type
  }
}


uploadOldFileToS3 = async (filePath, Id,_id,attachments) => {
  try {
      const fileName = path.basename(filePath);

      if (!Id || !fileName) {
          throw new Error("Missing required parameters");
      }

      const validFileName = sanitizeFileName(fileName);

      const fileSize = fs.statSync(filePath).size;
      const allowedExtensions = [
          "csv",
          "jpg",
          "jpeg",
          "png",
          "pdf",
          "doc",
          "docx",
          "mp3",
          "mp4",
          "mpeg",
          "m4a",
          "wav",
          "aac"
      ]; // Allowed file extensions
      const maxFileSize = 100 * 1024 * 1024; // 100 MB

      // File extension check
      const fileExtension = getFileExtension(validFileName);
      if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
          throw new Error("Invalid file extension");
      }

      // File size check
      if (fileSize > maxFileSize) {
          throw new Error("File size is too large, It should be less than 100 MB");
      }

      let key = generateS3KeyName(Id, validFileName);

      // Upload the file to S3
      const uploadParams = {
          Bucket: bucketName,
          Body: fs.createReadStream(filePath),
          Key: key,
          ContentType: getMimeType(validFileName),
      };
      const command = new PutObjectCommand(uploadParams);
      const uploadResult = await s3Client.send(command);

      // Construct URL for the uploaded file
      const fileUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;

      
      // console.log("Update the 'url' field of the attachments array -----",result)
      // Return the file URL
      return fileUrl;
  } catch (error) {
      throw error;
  }
};


async function downloadFile(url, destination) {
  const writer = fs.createWriteStream(destination);

  const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
  });
}

contactResourceMongoController.newdataUpadate = async (req, res) => {
  try {
      const leadIds = req.body.leadIds; // Assuming leadIds is an array of leadId
      let resultArray = [];

      for (const leadId of leadIds) {
          let newAttachments = [];
          let _id;
          let destinationPath;
          const Id = leadId;

          // Fetch leads data from wherever it's stored (e.g., database)
          const response = await GetFetchContactResourcesNew(leadId);
          const leads = await response;

          _id = leads._id;

          for (const attachment of leads.attachments) {
              const fileUrl = attachment.url;
              const fileName = attachment.name;
              const desktopPath = require('os').homedir(); // Get the path to the user's desktop
              const destinationFolder = path.join(desktopPath, 'Desktop', 'fbdata'); // Path to the fbdata folder on the desktop
              destinationPath = path.join(destinationFolder, fileName); // Destination path on local system

              // Create the fbdata folder if it doesn't exist
              if (!fs.existsSync(destinationFolder)) {
                  fs.mkdirSync(destinationFolder);
              }

              try {
                  await downloadFile(fileUrl, destinationPath);
                  const S3Url = await uploadOldFileToS3(destinationPath, Id, _id);
                  console.log('File uploaded successfully. URL:', fileUrl);
                  let tempAtt = {
                      name: fileName,
                      type: attachment.type,
                      url: fileUrl,
                      S3url: S3Url,
                      created_at: attachment.created_at
                  }
                  newAttachments.push(tempAtt);
                  console.log(`File "${fileName}" downloaded successfully.`);
              } catch (error) {
                  console.error(`Error downloading file "${fileName}":`, error);
              }
          }

          // Update the MongoDB document with newAttachments
          const result = await contactResourcesMongoModel.updateOne(
              { _id: ObjectId(_id) }, // Match the document by its ID
              { $set: { 'attachments': newAttachments } } // Update the 'attachments' array
          );

          resultArray.push(result);
      }

      // Send success response
      res.json({ success: true, message: 'Download and update done', resultArray: resultArray });
  } catch (error) {
      console.error('An error occurred:', error);
      // Send error response
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
};



module.exports = contactResourceMongoController;
