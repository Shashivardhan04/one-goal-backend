const express = require('express');
const callLogsController = require('../controllers/callLogsController');
var router = express.Router();

const {
  Create,
  Update,
  Search,
  FilterValues,
  CallLogCount,
  CallingReport,
  DrillDownSearch,
  DeleteCallLogs,
  CallLogsDrillDownCount,

  // Below there is code of migration
  CreateCallLogsNew,
  FetchCallLogsNew,
  UpdateCallLogsNew,
  GetFetchCallLogsNew,
  CheckNumberBeforeUpdatingCall,
  AppFilterValues
} = callLogsController;

/**
 * @openapi
 * /callLogs/search:
 *   post:
 *     summary: Search Call Logs
 *     description: Search for call logs based on specific criteria.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
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
 *           example:
 *             criteria: "your-search-criteria"
 *             dateRange:
 *               from: "start-date"
 *               to: "end-date"
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
 *       - callLogs
 */
router.post('/search', Search);

/**
 * @openapi
 * /callLogs/create:
 *   post:
 *     summary: Create a new resource
 *     description: Use this endpoint to create a new resource.
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
 *                 description: Replace with a description of the property.
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Resource created successfully
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
 *                   description: Additional data related to the resource.
 *     tags:
 *       - callLogs
 */
router.post('/create', Create);


/**
 * @openapi
 * /callLogs/update:
 *   post:
 *     summary: Update an existing resource
 *     description: Use this endpoint to update an existing resource.
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
 *                 description: Replace with a description of the property.
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Resource updated successfully
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
 *                   description: Additional data related to the resource.
 *     tags:
 *       - callLogs
 */
router.post('/update', Update);


// router.post("/fetch", Fetch);


/**
 * @openapi
 * /callLogs/filterValues:
 *   post:
 *     summary: Get filtered values
 *     description: Use this endpoint to retrieve filtered values.
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
 *               filterCriteria:
 *                 type: string
 *                 description: Replace with a description of the filter criteria.
 *             required:
 *               - filterCriteria
 *     responses:
 *       200:
 *         description: Filtered values retrieved successfully
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
 *                   description: Additional data related to the filtered values.
 *     tags:
 *       - callLogs
 */
router.post('/filterValues', FilterValues);


/**
 * @openapi
 * /callLogs/callLogCount:
 *   post:
 *     summary: Get call log count
 *     description: Use this endpoint to retrieve the count of call logs.
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
 *               countCriteria:
 *                 type: string
 *                 description: Replace with a description of the count criteria.
 *             required:
 *               - countCriteria
 *     responses:
 *       200:
 *         description: Call log count retrieved successfully
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
 *                   description: Additional data related to the call log count.
 *     tags:
 *       - callLogs
 */
router.post('/callLogCount', CallLogCount);


/**
 * @openapi
 * /callLogs/callingReport:
 *   post:
 *     summary: Generate calling report
 *     description: Use this endpoint to generate a calling report based on specific criteria.
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
 *               reportCriteria:
 *                 type: string
 *                 description: Replace with a description of the report criteria.
 *             required:
 *               - reportCriteria
 *     responses:
 *       200:
 *         description: Calling report generated successfully
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
 *                   description: Additional data related to the calling report.
 *     tags:
 *       - callLogs
 */
router.post('/callingReport', CallingReport);


/**
 * @openapi
 * /callLogs/drillDownSearch:
 *   post:
 *     summary: Perform a drill-down search
 *     description: Use this endpoint to perform a drill-down search based on specific criteria.
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
 *               drillDownCriteria:
 *                 type: string
 *                 description: Replace with a description of the drill-down criteria.
 *             required:
 *               - drillDownCriteria
 *     responses:
 *       200:
 *         description: Drill-down search successful
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
 *                   description: Additional data related to the drill-down search.
 *     tags:
 *       - callLogs
 */
router.post('/drillDownSearch', DrillDownSearch);

/**
 * @openapi
 * /callLogs/callLogsDrillDownCount:
 *   post:
 *     summary: Retrieve drill-down count for call logs
 *     description: Use this endpoint to retrieve drill-down count for call logs based on specific criteria.
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
 *                 description: Replace with a description of the criteria.
 *             required:
 *               - criteria
 *     responses:
 *       200:
 *         description: Drill-down count retrieved successfully
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
 *                   description: Additional data related to the drill-down count.
 *     tags:
 *       - callLogs
 */
router.post('/callLogsDrillDownCount', CallLogsDrillDownCount);

/**
 * @openapi
 * /callLogs/deleteCallLogs:
 *   delete:
 *     summary: Delete call logs
 *     description: Use this endpoint to delete call logs based on specific criteria.
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
 *                 description: Replace with a description of the criteria.
 *             required:
 *               - criteria
 *     responses:
 *       204:
 *         description: Call logs deleted successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - callLogs
 */
router.delete('/deleteCallLogs', DeleteCallLogs)


 // Below there is code of migration

/**
 * @openapi
 * /callLogs/createCallLogsNew:
 *   post:
 *     summary: Create new call logs
 *     description: Use this endpoint to create new call logs.
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
 *         description: Call logs created successfully
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
 *                   description: Additional data related to the call logs.
 *     tags:
 *       - callLogs
 */
router.post('/createCallLogsNew', CreateCallLogsNew);


 /**
 * @openapi
 * /callLogs/fetchCallLogsNew:
 *   post:
 *     summary: Fetch call logs
 *     description: Use this endpoint to fetch call logs.
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
 *         description: Call logs fetched successfully
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
 *                   description: Data related to the fetched call logs.
 *     tags:
 *       - callLogs
 */
router.post('/fetchCallLogsNew', FetchCallLogsNew);

 /**
 * @openapi
 * /callLogs/updateCallLogsNew:
 *   post:
 *     summary: Update call logs
 *     description: Use this endpoint to update call logs.
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
 *         description: Call logs updated successfully
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
 *                   description: Data related to the updated call logs.
 *     tags:
 *       - callLogs
 */
router.post('/updateCallLogsNew', UpdateCallLogsNew);

/**
 * @openapi
 * /callLogs/getFetchCallLogsNew:
 *   get:
 *     summary: Fetch call logs
 *     description: Use this endpoint to fetch call logs.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *       - in: query
 *         name: leadId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call logs fetched successfully
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
 *                   description: Data related to the fetched call logs.
 *     tags:
 *       - callLogs
 */ 
router.get('/getFetchCallLogsNew', GetFetchCallLogsNew);

/**
 * @openapi
 * /callLogs/updateCallLogsNew:
 *   post:
 *     summary: Update call logs
 *     description: Use this endpoint to update call logs.
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
 *         description: Call logs updated successfully
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
 *                   description: Data related to the updated call logs.
 *     tags:
 *       - callLogs
 */

router.get('/checkNumberBeforeUpdatingCall', CheckNumberBeforeUpdatingCall);

router.post('/appFilterValues', AppFilterValues);

module.exports = router;
