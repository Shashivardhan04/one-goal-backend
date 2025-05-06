const express = require('express');
const leadController = require('../controllers/leadsController');
var router = express.Router();

const {
  Search,
  contacttotalcount,
  FilterValues,
  LeadCount,
  StageCount,
  Create,
  updateData,
  bulkCreate,
  bulkUpdate,
  deleteData,
  feedbackReport,
  ReasonReport,
  InterestedReport,
  InterestedReportOptimized,
  TaskSearch,
  TaskStageCount,
  DrillDownSearch,
  ResolveMissData,
  TransferLeads,
  CreateNotes,
  UpdateNotes,
  UpdateCallLogs,
  UpdateAttachment,
  GetContactResource,
  callBackReasonReport,
  callTimeUpdate,
  GetDuplicateLeads,
  deleteDuplicate,
  deleteDuplicateOwner,
  GetNotWorkedFreshLeads,
  // GetDuplicateLeads
  CheckIfLeadExists,
  missCount,
  HO_missCount1,
  HO_missCount2,
  HO_missCount3,
  Reports,
  // Below this are new apis which are created for migration purpose

  CreateLeadNew,
  EditLeadNew,
  CheckContactExistsNew,
  GetLeadDetails,
  DeleteMultipleLeads,
  BulkUpdateLeads,
  TransferLeadsNew,
  CheckIfFieldExistsInLeads,
  UpdateReenquiredLeads,
  AppSearch,
  AppFilterValues,
  fetchLeadByMBContactId,
  ShowMigratedLeadsBucket
} = leadController;

/**
 * @openapi
 * /leads:
 *   get:
 *     summary: Welcome to the Leads API
 *     description: Get a welcome message for the Leads API.
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *           example: "You are in the Leads API"
 *     tags:
 *       - leads
 */
router.get('/', (req, res) => res.send('you are in leads'));


/**
 * @openapi
 * /leads/search:
 *   post:
 *     summary: Search Leads
 *     description: Search for leads based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                   to:
 *                     type: string
 *             example:
 *               criteria: "your-search-criteria"
 *               dateRange:
 *                 from: "start-date"
 *                 to: "end-date"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/search', Search);


/**
 * @openapi
 * /leads/contacttotalcount:
 *   post:
 *     summary: Get Total Contact Count
 *     description: Get the total count of contacts.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalContacts:
 *                   type: integer
 *             example:
 *               success: true
 *               totalContacts: 1000
 *     tags:
 *       - leads
 */
router.post('/contacttotalcount', contacttotalcount);



/**
 * @openapi
 * /leads/filterValues:
 *   post:
 *     summary: Get Filter Values
 *     description: Get the filter values for leads.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 filterValues:
 *                   type: object
 *             example:
 *               success: true
 *               filterValues: { /* your filter values here * / }
 *     tags:
 *       - leads
 */
router.post('/filterValues', FilterValues);



/**
 * @openapi
 * /leads/leadCount:
 *   post:
 *     summary: Get Lead Count
 *     description: Get the count of leads.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 leadCount:
 *                   type: integer
 *             example:
 *               success: true
 *               leadCount: 1000
 *     tags:
 *       - leads
 */
router.post('/leadCount', LeadCount);


/**
 * @openapi
 * /leads/stageCount:
 *   post:
 *     summary: Get Stage Count
 *     description: Get the count of leads in each stage.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stageCounts:
 *                   type: object
 *                   description: A map of stage names to lead counts.
 *             example:
 *               success: true
 *               stageCounts:
 *                 stage1: 100
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/stageCount', StageCount);



/**
 * @openapi
 * /leads/insert:
 *   post:
 *     summary: Insert New Lead
 *     description: Insert a new lead into the system.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       201:
 *         description: Lead inserted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the lead.
 *     tags:
 *       - leads
 */
router.post('/insert', Create);


/**
 * @openapi
 * /leads/updateCallTime:
 *   post:
 *     summary: Update Call Time for Leads
 *     description: Update the call time for leads in the system.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Call time updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the call time update.
 *     tags:
 *       - leads
 */
router.post('/updateCallTime', callTimeUpdate);


/**
 * @openapi
 * /leads/updateData:
 *   post:
 *     summary: Update Data for Leads
 *     description: Update data for leads in the system.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the data update.
 *     tags:
 *       - leads
 */
router.post('/updateData', updateData);


/**
 * @openapi
 * /leads/bulkCreate:
 *   post:
 *     summary: Bulk Create Leads
 *     description: Bulk create leads in the system.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       201:
 *         description: Leads created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the bulk create operation.
 *     tags:
 *       - leads
 */
router.post('/bulkCreate', bulkCreate);


/**
 * @openapi
 * /leads/bulkUpdate:
 *   post:
 *     summary: Bulk Update Leads
 *     description: Bulk update leads in the system.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Leads updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the bulk update operation.
 *     tags:
 *       - leads
 */
router.post('/bulkUpdate', bulkUpdate);


/**
 * @openapi
 * /leads/deleteData:
 *   post:
 *     summary: Delete Data for Leads
 *     description: Delete data for leads in the system.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the data deletion.
 *     tags:
 *       - leads
 */
router.post('/deleteData', deleteData);


/**
 * @openapi
 * /leads/feedbackReport/{type}:
 *   post:
 *     summary: Generate Feedback Report
 *     description: Generate a report for feedback based on the specified type.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: The type of report to generate.
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Feedback report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the feedback report.
 *     tags:
 *       - leads
 */
router.post('/feedbackReport/:type', feedbackReport);


/**
 * @openapi
 * /leads/callbackreasonReport/{type}:
 *   post:
 *     summary: Generate Callback Reason Report
 *     description: Generate a report for callback reasons based on the specified type.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: The type of report to generate.
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Callback Reason report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the callback reason report.
 *     tags:
 *       - leads
 */
router.post('/callbackreasonReport/:type',callBackReasonReport);


/**
 * @openapi
 * /leads/interestedReport/{type}:
 *   post:
 *     summary: Generate Interested Report
 *     description: Generate a report for interested leads based on the specified type.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: The type of report to generate.
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Interested report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the interested report.
 *     tags:
 *       - leads
 */
router.post('/interestedReport/:type', InterestedReport);


/**
 * @openapi
 * /leads/interestedReportOptimized/{type}:
 *   post:
 *     summary: Generate Optimized Interested Report
 *     description: Generate an optimized report for interested leads based on the specified type.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: The type of report to generate.
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Optimized Interested report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the optimized interested report.
 *     tags:
 *       - leads
 */
router.post('/interestedReportOptimized/:type', InterestedReportOptimized);


/**
 * @openapi
 * /leads/reasonReport/{type}:
 *   post:
 *     summary: Generate Reason Report
 *     description: Generate a report for lead reasons based on the specified type.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: The type of report to generate.
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Reason report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the reason report.
 *     tags:
 *       - leads
 */
router.post('/reasonReport/:type', ReasonReport);


/**
 * @openapi
 * /leads/taskSearch:
 *   post:
 *     summary: Search Tasks
 *     description: Search for tasks based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                   to:
 *                     type: string
 *             example:
 *               criteria: "your-search-criteria"
 *               dateRange:
 *                 from: "start-date"
 *                 to: "end-date"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       -  leads
 */
router.post('/taskSearch/', TaskSearch);


/**
 * @openapi
 * /leads/taskStageCount:
 *   post:
 *     summary: Get Task Stage Count
 *     description: Get the count of tasks in each stage.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Task stage count data.
 *             example:
 *               success: true
 *               data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/taskStageCount', TaskStageCount);


/**
 * @openapi
 * /leads/drillDownSearch:
 *   post:
 *     summary: Search Leads with Drill Down
 *     description: Search for leads with drill-down based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               drillDownOptions:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               criteria: "your-search-criteria"
 *               drillDownOptions: ["option1", "option2"]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/drillDownSearch', DrillDownSearch);


/**
 * @openapi
 * /leads/resolveMissData:
 *   post:
 *     summary: Resolve Missing Data
 *     description: Resolve missing data for leads based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               dataOptions:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               criteria: "your-search-criteria"
 *               dataOptions: ["option1", "option2"]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/resolveMissData', ResolveMissData);

/**
 * @openapi
 * /leads/getDuplicateLeads:
 *   post:
 *     summary: Get Duplicate Leads
 *     description: Get a list of duplicate leads based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               criteria: "your-search-criteria"
 *               options: ["option1", "option2"]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/getDuplicateLeads', GetDuplicateLeads);

/**
 * @openapi
 * /leads/deleteDuplicate:
 *   post:
 *     summary: Delete Duplicate Leads
 *     description: Delete duplicate leads based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *             example:
 *               criteria: "your-search-criteria"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *           example:
 *             success: true
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/deleteDuplicate', deleteDuplicate);

/**
 * @openapi
 * /leads/deleteDuplicateOwner:
 *   post:
 *     summary: Delete Duplicate Lead Owners
 *     description: Delete duplicate lead owners based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *             example:
 *               criteria: "your-search-criteria"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *           example:
 *             success: true
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/deleteDuplicateOwner', deleteDuplicateOwner);
// router.post('/getDuplicateLeads', GetDuplicateLeads);


/**
 * @openapi
 * /leads/getNotWorkedFreshLeads:
 *   post:
 *     summary: Get Not Worked Fresh Leads
 *     description: Get a list of not worked fresh leads based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               criteria: "your-search-criteria"
 *               options: ["option1", "option2"]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/getNotWorkedFreshLeads', GetNotWorkedFreshLeads);

/**
 * @openapi
 * /leads/checkIfLeadExists:
 *   post:
 *     summary: Check If Lead Exists
 *     description: Check if a lead exists based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *             example:
 *               criteria: "your-search-criteria"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exists:
 *                   type: boolean
 *             example:
 *               success: true
 *               exists: true
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/checkIfLeadExists', CheckIfLeadExists);

/**
 * @openapi
 * /leads/missCount:
 *   get:
 *     summary: Get Miss Count
 *     description: Get the count of missing leads.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *             example:
 *               count: 100
 *     tags:
 *       - leads
 */
router.get('/missCount', missCount);


/**
 * @openapi
 * /leads/homissCount1:
 *   get:
 *     summary: Get HO Miss Count 1
 *     description: Get the count of missing leads for HO.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *             example:
 *               count: 50
 *     tags:
 *       - leads
 */
router.get('/homissCount1', HO_missCount1);


/**
 * @openapi
 * /leads/HO_missCount2:
 *   get:
 *     summary: Get HO Miss Count 2
 *     description: Get the count of missing leads for HO (variant 2).
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *             example:
 *               count: 75
 *     tags:
 *       - leads
 */
router.get('/homissCount2', HO_missCount2);


/**
 * @openapi
 * /leads/homissCount3:
 *   get:
 *     summary: Get HO Miss Count 3
 *     description: Get the count of missing leads for HO (variant 3).
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *             example:
 *               count: 60
 *     tags:
 *       - leads
 */
router.get('/homissCount3', HO_missCount3);


/**
 * @openapi
 * /leads/reports:
 *   post:
 *     summary: Generate Reports
 *     description: Generate various reports based on specific criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reportType:
 *                 type: string
 *                 description: Type of report to generate (e.g., "sales", "lead_status").
 *               criteria:
 *                 type: string
 *                 description: Additional criteria for the report.
 *             example:
 *               reportType: "sales"
 *               criteria: "criteria-details"
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the generated report.
 *             example:
 *               success: true
 *               data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - leads
 */
router.post('/reports', Reports);

// Below this are new apis which are created for migration purpose --

/**
 * @openapi
 * /leads/createLeadNew:
 *   post:
 *     summary: Create a New Lead
 *     description: Create a new lead with the provided information.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             email: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: Lead created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the created lead.
 *     tags:
 *       - leads
 */
router.post('/createLeadNew', CreateLeadNew);

/**
 * @openapi
 * /leads/editLeadNew:
 *   post:
 *     summary: Edit Lead Information
 *     description: Edit the information of an existing lead based on the provided data.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadId:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *             required:
 *               - leadId
 *           example:
 *             leadId: "12345"
 *             firstName: "Updated John"
 *             lastName: "Updated Doe"
 *             email: "updated.john@example.com"
 *     responses:
 *       200:
 *         description: Lead information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Additional data related to the updated lead.
 *     tags:
 *       - leads
 */
router.post('/editLeadNew', EditLeadNew);

/**
 * @openapi
 * /leads/checkContactExistsNew:
 *   post:
 *     summary: Check If Contact Exists
 *     description: Check if a contact with the provided information already exists.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             email: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Contact exists status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 contactExists:
 *                   type: boolean
 *                   description: Indicates if the contact already exists.
 *     tags:
 *       - leads
 */
router.post('/checkContactExistsNew', CheckContactExistsNew);

/**
 * @openapi
 * /leads/getLeadDetails:
 *   post:
 *     summary: Get Lead Details
 *     description: Retrieve details of an existing lead based on the provided lead ID.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadId:
 *                 type: string
 *             required:
 *               - leadId
 *           example:
 *             leadId: "12345"
 *     responses:
 *       200:
 *         description: Lead details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Lead details.
 *           example:
 *             success: true
 *             data: { /* Lead details here * / }
 *     tags:
 *       - leads
 */
router.post('/getLeadDetails', GetLeadDetails);

/**
 * @openapi
 * /leads/deleteMultipleLeads:
 *   post:
 *     summary: Delete Multiple Leads
 *     description: Delete multiple leads based on the provided lead IDs.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - leadIds
 *           example:
 *             leadIds: ["12345", "67890"]
 *     responses:
 *       200:
 *         description: Leads deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *     tags:
 *       - leads
 */
router.post('/deleteMultipleLeads', DeleteMultipleLeads);

/**
 * @openapi
 * /leads/bulkUpdateLeads:
 *   post:
 *     summary: Bulk Update Leads
 *     description: Update multiple leads based on the provided data.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadUpdates:
 *                 type: array
 *                 items:
 *                   type: object
 *             required:
 *               - leadUpdates
 *           example:
 *             leadUpdates: [
 *               { leadId: "12345", field1: "value1" },
 *               { leadId: "67890", field2: "value2" }
 *             ]
 *     responses:
 *       200:
 *         description: Leads updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *     tags:
 *       - leads
 */
router.post('/bulkUpdateLeads', BulkUpdateLeads);

/**
 * @openapi
 * /leads/transferLeadsNew:
 *   post:
 *     summary: Transfer Leads
 *     description: Transfer leads to a new owner.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               newOwner:
 *                 type: string
 *             required:
 *               - leadIds
 *               - newOwner
 *           example:
 *             leadIds: ["12345", "67890"]
 *             newOwner: "new-owner-id"
 *     responses:
 *       200:
 *         description: Leads transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *     tags:
 *       - leads
 */
router.post('/transferLeadsNew', TransferLeadsNew);

/**
 * @openapi
 * /leads/checkIfFieldExistsInLeads:
 *   post:
 *     summary: Check If Field Exists in Leads
 *     description: Check if a specific field exists in leads.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldName:
 *                 type: string
 *             required:
 *               - fieldName
 *           example:
 *             fieldName: "field-name"
 *     responses:
 *       200:
 *         description: Field exists in leads
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the field exists.
 *     tags:
 *       - leads
 */
router.post('/checkIfFieldExistsInLeads', CheckIfFieldExistsInLeads);

/**
 * @openapi
 * /leads/updateReenquiredLeads:
 *   post:
 *     summary: Update Reenquired Leads
 *     description: Update leads that are reenquired based on the provided data.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadUpdates:
 *                 type: array
 *                 items:
 *                   type: object
 *             required:
 *               - leadUpdates
 *           example:
 *             leadUpdates: [
 *               { leadId: "12345", field1: "value1" },
 *               { leadId: "67890", field2: "value2" }
 *             ]
 *     responses:
 *       200:
 *         description: Leads updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *     tags:
 *       - leads
 */
router.post('/updateReenquiredLeads', UpdateReenquiredLeads);

router.post('/appSearch', AppSearch);

router.post('/appFilterValues', AppFilterValues);

router.get("/fetchLeadByMBContactId",fetchLeadByMBContactId);

router.get("/showMigratedLeadsBucket", ShowMigratedLeadsBucket);

module.exports = router;
