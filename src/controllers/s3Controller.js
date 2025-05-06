var ObjectId = require("mongoose").Types.ObjectId;
require("dotenv").config();
const app = require("firebase");
const AWS = require("aws-sdk");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const s3Controller = {};

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

const getFileExtension = (fileName) => {
  const parts= fileName.split(".");
  if (parts.length > 2) {
    return ''; // If there are multiple periods, return an empty string to indicate an invalid extension
  }
  return parts.pop().toLowerCase();
};

uploadFileToS3 = (req, res) => {
  upload.single("file")(req, res, async (err) => {
    // console.log("req.file",req.file,req.body);
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
        "aac",
        "mov",
        "hevc",
        "heif",
        "h.264"
      ]; // Allowed file extensions
      const maxFileSize = 100 * 1024 * 1024; // 100 MB

      // File extension check
      const fileExtension = getFileExtension(validFileName);
      if (!fileExtension || !allowedExtensions.includes(fileExtension.toLowerCase())) {
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

s3Controller.DataUpload = async (req, res) => {
  try {
    uploadFileToS3(req, res);
  } catch (error) {
    console.error("Data upload error:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to upload file", error: error });
  }
};

s3Controller.DeleteS3File = async (req, res) => {
  try {
    const key = req.body.url; // Assuming the key of the file to be deleted is sent in the request body
    let key1 = key.replace(/^.*\/\/[^/]+/, "");
    if (key1.startsWith("/")) {
      key1 = key1.substring(1);
    }

    // Construct parameters for deleting the object
    const deleteParams = {
      Bucket: bucketName,
      Key: key1,
    };
    // Create DeleteObjectCommand to delete the object from S3
    const deleteCommand = new DeleteObjectCommand(deleteParams);

    // Send command to S3 client to delete the object
    const deleteResult = await s3Client.send(deleteCommand);

    // Return success response if deletion is successful
    return res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("File deletion error:", error);
    return res
      .status(400)
      .json({ success: false, error: "Failed to delete file" });
  }
};

module.exports = s3Controller;
