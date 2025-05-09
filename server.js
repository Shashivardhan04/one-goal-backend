require("dotenv").config();
require("./src/database/db");
// require("./src/database/mariaDb.js");
const express = require("express");
const users = require("./src/routes/users");
const branch = require("./src/routes/branch");
const count = require("./src/routes/count");
const organizations = require("./src/routes/organizations");
const tasks = require("./src/routes/task");
const callLogs = require("./src/routes/callLogs");
const leads = require("./src/routes/leads");
const bookings = require("./src/routes/bookings");
const licence = require("./src/routes/licence");
const payment = require("./src/routes/payment");
const apiData = require("./src/routes/apiData");
const apiToken = require("./src/routes/apiToken");
const fcmToken = require("./src/routes/fcmToken");
const projectResources = require("./src/routes/projectResources");
const faq = require("./src/routes/faq");
const userList = require("./src/routes/userList");
const contactResources = require("./src/routes/contactResources");
const organizationResources = require("./src/routes/organizationResources");
const sms = require("./src/routes/sms");
const notification = require("./src/routes/notification");
const query = require("./src/routes/query");
const utils = require("./src/routes/utils");
const updatePassword = require("./src/routes/updatePassword");
const userTracking = require("./src/routes/userTracking");
const contactResourcesMongo = require("./src/routes/contactResourcesMongo");
const messageTemplate = require("./src/routes/template");
const lastDialedCallLog = require("./src/routes/lastDialedCallLog");
const forgetPassword = require("./src/routes/forgetPassword.js");
const news = require("./src/routes/news.js");

const taskModel = require("./src/models/taskSchema");
const leadsModel = require("./src/models/leadsSchema");
const callLogModel = require("./src/models/callLogsSchema");
// const leadDistributionModel= require('./src/models/leadDistributionSchema')
// const userModel= require('./src/models/userSchema');
// const contactResourcesMongoModel = require('./src/models/contactResourcesMongoSchema');
const apiQuestions = require("./src/routes/apiQuestions");
const otpVerification = require("./src/routes/otpVerification");
const auditLogs = require("./src/routes/auditLogs");
const automatedScore = require("./src/routes/automatedScore");
const constants = require("./src/routes/constants");
const ivr = require("./src/routes/ivr");
const userAuthorization = require("./src/routes/userAuthorization");
const autoRotateLeads = require("./src/routes/autoRotation");
const s3Upload = require("./src/routes/s3Upload");
const storeSMS = require("./src/routes/storeSMS");
const subscriptionDetails = require("./src/routes/subscriptionDetails");
const packageDetails = require("./src/routes/packageDetails");
const userauthmigration = require("./src/routes/userauthMigrationScript.js");

const leadDistribution = require("./src/routes/leadDistribution");
const dataUploadRequest = require("./src/routes/dataUploadRequest");
const projects = require("./src/routes/projects");
const dataTransfer = require("./src/routes/dataTransfer");
const integrations = require("./src/routes/integrations");
const fbWebhooks = require("./src/routes/fbWebhooks.js");
const authRoute = require("./src/routes/authRoute.js");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
// const notificationContent = require("./src/routes/NotificationContent");
const mbPostProperty = require("./src/routes/mbPostProperty.js");
const mbResponses = require("./src/routes/mbResponses.js");
const logger = require("./src/services/logger.js");

const app = express();
logger.info("📦 Initializing Express application...");
const mongoose = require("mongoose");
const auth = require("./src/middlewares/auth");
const newAuth = require("./src/middlewares/newAuth");
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb", extended: true }));
logger.info("✅ Body parsers initialized (urlencoded & JSON)");
const cors = require("cors");
const cron = require("node-cron");
// const {autoRotateLead} = require("./src/functions/autoLeadRotation")

var corsOptions = {
  origin: [
    "https://new-readpro.web.app",
    "https://login1.read-pro.com",
    "https://testing-readpro.web.app",
    "http://localhost:3000",
    "https://backend.read-pro.com",
    "https://stirring-cactus-284127.netlify.app",
    "http://readpro-testing-backend1-env.eba-9skqkwer.ap-south-1.elasticbeanstalk.com",
    "http://localhost:4000",
    "https://localhost:3000",
  ],
  optionsSuccessStatus: 200,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};

app.use(cors(corsOptions));
logger.info("🌍 CORS middleware applied with defined origin whitelist");

// Log incoming requests

app.set("trust proxy", true); // trust proxy headers like x-forwarded-for

app.use((req, res, next) => {
  // Attempt to get the real IP from the x-forwarded-for header (for proxy environments)
  const ip = req.headers["x-forwarded-for"]
    ? req.headers["x-forwarded-for"].split(",")[0]
    : req.connection.remoteAddress || req.socket.remoteAddress || req.ip;

  // Handle loopback addresses and convert them to the correct IP address format
  const publicIP = ip === "::1" || ip === "127.0.0.1" ? "localhost" : ip;

  logger.info(
    `🌐 Incoming request from IP: ${publicIP} - ${req.method} ${req.originalUrl}`
  );
  next();
});

// swagger documentation configuration

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Your API",
      version: "1.0.0",
      description: "Your API Description",
    },
    securityDefinitions: {
      bearerAuth: {
        // Define the security scheme for auth token verification
        type: "apiKey",
        in: "header",
        name: "x-access-token", // Name of the header for the authentication token
      },
    },
  },
  apis: [
    // List the paths to your route files (e.g., users.js, branch.js, apiData.js, etc.).
    "./src/routes/otpVerification.js",
    "./src/routes/template.js",
    "./src/routes/userTracking.js",
    "./src/routes/notification.js",
    "./src/routes/payment.js",
    "./src/routes/licence.js",
    "./src/routes/projectResources.js",
    "./src/routes/userList.js",
    "./src/routes/news.js",
    "./src/routes/organizations.js",
    "./src/routes/organizationResources.js",
    "./src/routes/lastDialedCallLog.js",
    "./src/routes/fcmToken.js",
    "./src/routes/faq.js",
    "./src/routes/count.js",
    "./src/routes/contactResourcesMongo.js",
    "./src/routes/contactResources.js",
    "./src/routes/branch.js",
    "./src/routes/bookings.js",
    "./src/routes/auditLogs.js",
    "./src/routes/users.js",
    "./src/routes/callLogs.js",
    "./src/routes/task.js",
    "./src/routes/leads.js",
    "./src/routes/automatedScore.js",
    "./src/routes/apiData.js",
    "./src/routes/apiQuestions.js",
    "./src/routes/apiToken.js",
    "./src/routes/userAuthorization.js",
    // './src/routes/notificationContent.js',
    "./src/routes/apiToken.js",
    "./src/routes/leadDistribution.js",
    "./src/routes/storeSMS.js",
  ],
};

// const swaggerSpec = swaggerJsdoc(swaggerOptions);

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/users", newAuth, users);

app.use("/branch", newAuth, branch);

app.use("/apiData", newAuth, apiData);

app.use("/fcmToken", newAuth, fcmToken);

app.use("/count", newAuth, count);

app.use("/utils", newAuth, utils);

app.use("/updateUserPassword", newAuth, updatePassword);

app.use("/organizationResources", newAuth, organizationResources);

app.use("/organizations", newAuth, organizations);

app.use("/news", newAuth, news);

app.use("/userList", newAuth, userList);

app.use("/projectResources", newAuth, projectResources);

app.use("/leads", newAuth, leads);

app.use("/bookings", newAuth, bookings);

app.use("/licence", newAuth, licence);

app.use("/payments", newAuth, payment);

app.use("/contactResources", newAuth, contactResources);

app.use("/apiToken", newAuth, apiToken);

app.use("/faq", newAuth, faq);

app.use("/tasks", newAuth, tasks);

app.use("/callLogs", newAuth, callLogs);

app.use("/sms", newAuth, sms);

app.use("/notification", newAuth, notification);

app.use("/query", newAuth, query);

app.use("/userTracking", newAuth, userTracking);

app.use("/contactResourcesMongo", newAuth, contactResourcesMongo);
app.use("/apiQuestions", newAuth, apiQuestions);

app.use("/otpVerification", newAuth, otpVerification);

app.use("/auditLogs", newAuth, auditLogs);

app.use("/messageTemplate", newAuth, messageTemplate);

app.use("/lastDialedCall", newAuth, lastDialedCallLog);

app.use("/automatedScore", newAuth, automatedScore);

app.use("/constants", newAuth, constants);

app.use("/ivr", ivr);

app.use("/userAuthorization", newAuth, userAuthorization);

app.use("/storeSMS", newAuth, storeSMS);
// app.use("/notificationContent",newAuth, notificationContent);

app.use("/leadDistribution", newAuth, leadDistribution);

app.use("/autoRotation", newAuth, autoRotateLeads);

app.use("/s3Upload", newAuth, s3Upload);

app.use("/dataUploadRequest", newAuth, dataUploadRequest);

app.use("/projects", newAuth, projects);

app.use("/subscriptionDetails", subscriptionDetails);

app.use("/dataTransfer", newAuth, dataTransfer);

app.use("/packageDetails", newAuth, packageDetails);

app.use("/integrations", newAuth, integrations);

app.use("/fbWebhooks", fbWebhooks);

app.use("/packageDetails", newAuth, packageDetails);

app.use("/forgetPassword", forgetPassword);

app.use("/userauthmigration", userauthmigration);

app.use("/auth", authRoute);

app.use("/mbpostproperty", newAuth, mbPostProperty);

app.use("/mbResponses", newAuth, mbResponses);

app.get("/", (req, res) => {
  res.status(200).send("ReadPro Backend");
});

app.post("/auth", (req, res) => res.send("authenticated"));

// const updateContactResourcesMongo = async (contactID, contactData) => {
//   try{
//     let contactResourcesMongo = await contactResourcesMongoModel.updateMany({leadId:contactID},
//       {
//         customer_name: contactData.customer_name,
//         stage: contactData.stage,
//         contact_owner_email: contactData.contact_owner_email,
//         project: contactData.project,
//         location: contactData.location,
//         budget: contactData.budget,
//         contact_no: contactData.contact_no,
//         inventory_type: contactData.inventory_type
//           ? contactData.inventory_type
//           : "",
//         source: contactData.lead_source,
//         transfer_status: contactData.transfer_status,
//       },);

//   }catch{
//     console.log("Error updating task data");
//   }
// };

const server = require("http").createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
logger.info("🔌 Socket.IO initialized with CORS enabled for all origins");

// will only detect changes of insertion, updation and deletion on the /leads route
io.of("/socket").on("connection", (socket) => {
  logger.info(`🟢 Socket.IO: User connected on '/socket' - ID: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(
      `🔴 Socket.IO: User disconnected from '/socket' - ID: ${socket.id}`
    );
  });
});

// for instant update in our site whenever a file is deleted or inserted, only initial code is written, not yet implemented

const connection = mongoose.connection;

connection.once("open", () => {
  logger.info("✅ MongoDB database connected");
  logger.info("🛠️ Setting up change streams for contacts, tasks, and calllogs");

  const contactChangeStream = connection.collection("contacts").watch();
  const taskChangeStream = connection.collection("tasks").watch();
  const callLogChangeStream = connection.collection("calllogs").watch();
  // const contactResourcesMongoChangeStream = connection.collection("contactresourcesmongos").watch();

  contactChangeStream.on("change", async (change) => {
    switch (change.operationType) {
      case "insert":
        let contact = change.fullDocument;
        logger.info(`📥 New contact inserted: ${contact._id}`);
        // the new created contact is emitted back whenever mongoDB detects an insertion
        io.of("/socket").emit("newContact", contact);
        break;

      case "update":
        let retry = 0;
        let maxRetry = 5;
        const contact_id = change.documentKey._id;
        logger.info(`🔄 Contact update detected: ${contact_id}`);
        let contactData = await leadsModel.findById(contact_id);
        const updateTaskData = async (contactID, contactData) => {
          try {
            let tasks = await taskModel.updateMany(
              { leadId: contactID },
              {
                customer_name: contactData?.customer_name,
                stage: contactData?.stage,
                contact_owner_email: contactData?.contact_owner_email,
                project: contactData?.project,
                location: contactData?.location,
                budget: contactData?.budget,
                contact_no: contactData?.contact_no,
                inventory_type: contactData?.inventory_type
                  ? contactData?.inventory_type
                  : "",
                source: contactData?.lead_source,
                transfer_status: contactData?.transfer_status,
                state: contactData?.state ? contactData?.state : "",
              }
            );
            logger.info(`✅ Tasks updated for contact: ${contactID}`);
          } catch (error) {
            logger.error("❌ Error updating task data", error);
            if (retry < maxRetry) {
              retry++;
              logger.warn(`⏳ Retrying task update (${retry}/${maxRetry})`);
              await updateTaskData(contactID, contactData);
            }
          }
        };

        const updateCallLogs = async (contactID, contactData) => {
          try {
            let callLogs = await callLogModel.updateMany(
              { leadId: contactID },
              {
                customer_name: contactData.customer_name,
                stage: contactData.stage,
                contact_owner_email: contactData.contact_owner_email,
                project: contactData.project,
                location: contactData.location,
                budget: contactData.budget,
                contact_no: contactData.contact_no,
                inventory_type: contactData.inventory_type
                  ? contactData.inventory_type
                  : "",
                lead_source: contactData.lead_source,
                transfer_status: contactData.transfer_status,
                state: contactData?.state ? contactData?.state : "",
              }
            );
            logger.info(`✅ Call logs updated for contact: ${contactID}`);
          } catch (error) {
            console.log("Error updating call logs data", error);
            if (retry < maxRetry) {
              retry++;
              logger.warn(`⏳ Retrying call log update (${retry}/${maxRetry})`);
              await updateCallLogs(contactID, contactData);
            }
          }
        };
        // This should be running in live Uncomment this before sending live

        if (contactData && contactData.Id) {
          await updateTaskData(contactData.Id, contactData);
          await updateCallLogs(contactData.Id, contactData);
        }

        // This should be running in live Uncomment this before sending live

        // This should be running in testing, Comment this before sending to live

        // if(contactData.organization_id === "gQ8heNygYKIrho4KDcfr" || contactData.organization_id === "W5phvDYBAtopkrdehko2" || contactData.organization_id === "tdapty2F3KBPDrwJistv" || contactData.organization_id ===  "TdFulWaCtzYDRB24BMXV"){
        //   console.log("akkaa",contactData)
        //   await updateTaskData(contactData.Id, contactData);
        //   await updateCallLogs(contactData.Id, contactData);
        //   // await updateContactResourcesMongo(contactData.Id, contactData);
        // }

        // This should be running in testing, Comment this before sending to live

        // the whole updated contact is emitted back whenever mongoDB detects an updation
        io.of("/socket").emit("updatedContact", contact_id);
        break;

      case "delete":
        // id of the deleted document is emitted back
        logger.info(`🗑️ Contact deleted: ${change.documentKey._id}`);
        io.of("/socket").emit("deletedContact", change.documentKey._id);
        break;
    }
  });

  taskChangeStream.on("change", async (change) => {
    switch (change.operationType) {
      case "insert":
        let retry = 0;
        let maxRetry = 5;
        let task = change.fullDocument;
        logger.info(`📥 New task inserted: ${task._id}`);
        let contactData = await leadsModel.findOne({ Id: task.leadId });
        const updateTaskData = async (contactID, contactData) => {
          try {
            let tasks = await taskModel.updateMany(
              { leadId: contactID },
              {
                customer_name: contactData?.customer_name,
                stage: contactData?.stage,
                contact_owner_email: contactData?.contact_owner_email,
                project: contactData?.project,
                location: contactData?.location,
                budget: contactData?.budget,
                contact_no: contactData?.contact_no,
                inventory_type: contactData?.inventory_type
                  ? contactData?.inventory_type
                  : "",
                source: contactData?.lead_source,
                transfer_status: contactData?.transfer_status,
                state: contactData?.state ? contactData?.state : "",
              }
            );
            logger.info(`✅ Task fields synced with contact: ${contactID}`);
          } catch (error) {
            logger.error("❌ Error updating tasks", error);
            if (retry < maxRetry) {
              retry++;
              logger.warn(`⏳ Retrying task update (${retry}/${maxRetry})`);
              await updateTaskData(contactID, contactData);
            }
          }
        };

        // This should be running in live Uncomment this before sending live
        if (contactData && contactData.Id) {
          await updateTaskData(contactData.Id, contactData);
        }

        // This should be running in live Uncomment this before sending live

        // This should be running in testing, Comment this before sending to live

        // if(contactData.organization_id === "gQ8heNygYKIrho4KDcfr" || contactData.organization_id === "W5phvDYBAtopkrdehko2" || contactData.organization_id === "tdapty2F3KBPDrwJistv"|| contactData.organization_id ===  "TdFulWaCtzYDRB24BMXV"){
        //   await updateTaskData(contactData.Id, contactData);
        // }

        // This should be running in testing, Comment this before sending to live
        break;
    }
  });

  callLogChangeStream.on("change", async (change) => {
    switch (change.operationType) {
      case "insert":
        let retry = 0;
        let maxRetry = 5;
        let callLog = change.fullDocument;
        logger.info(`📥 New call log inserted: ${callLog._id}`);
        let contactData = await leadsModel.findOne({ Id: callLog.leadId });
        const updateCallLogs = async (contactID, contactData) => {
          try {
            let callLogs = await callLogModel.updateMany(
              { leadId: contactID },
              {
                customer_name: contactData.customer_name,
                stage: contactData.stage,
                contact_owner_email: contactData.contact_owner_email,
                project: contactData.project,
                location: contactData.location,
                budget: contactData.budget,
                contact_no: contactData.contact_no,
                inventory_type: contactData.inventory_type
                  ? contactData.inventory_type
                  : "",
                lead_source: contactData.lead_source,
                transfer_status: contactData.transfer_status,
                state: contactData?.state ? contactData?.state : "",
              }
            );
            logger.info(`✅ Call logs synced with contact: ${contactID}`);
          } catch (error) {
            logger.error("❌ Error updating call logs", error);
            if (retry < maxRetry) {
              retry++;
              logger.warn(`⏳ Retrying call log update (${retry}/${maxRetry})`);
              await updateCallLogs(contactID, contactData);
            }
          }
        };
        // This should be running in live Uncomment this before sending live
        if (contactData && contactData.Id) {
          await updateCallLogs(contactData.Id, contactData);
        }

        // This should be running in live Uncomment this before sending live

        // This should be running in testing, Comment this before sending to live

        // if(contactData.organization_id === "gQ8heNygYKIrho4KDcfr" || contactData.organization_id === "W5phvDYBAtopkrdehko2"  || contactData.organization_id === "tdapty2F3KBPDrwJistv"|| contactData.organization_id ===  "TdFulWaCtzYDRB24BMXV"){
        //   await updateCallLogs(contactData.Id, contactData);
        // }

        // This should be running in testing, Comment this before sending to live
        break;
    }
  });
});

/// health check url ////////////

app.get("/healthCheck", auth, async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus === 1) {
      logger.info("✅ Health Check: MongoDB is connected");
      res.status(200).json({ message: "Database connection OK" });
    } else {
      logger.warn("⚠️ Health Check: MongoDB is not connected");
      res.status(400).json({ message: "Database connection error" });
    }
  } catch (error) {
    logger.error(`❌ Health Check failed: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

const port = process.env.port || 4000;

server.listen(port, () => {
  logger.info(`🚀 Server is running and listening on port ${port}`);
});
