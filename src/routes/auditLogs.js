const express = require("express");
const auditLogsController = require("../controllers/auditLogsController");
var router = express.Router();
//router.get('/', userController.createUser);

const { createExportLogs, fetchExportLogs } =
auditLogsController;

/**
 * @openapi
 * /auditLogs/createExportLogs:
 *   post:
 *     summary: Create Export Logs
 *     description: Create export logs with the provided data.
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
 *         description: Export logs created successfully
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
 *                   description: Additional data related to the export logs.
 *     tags:
 *       - auditLogs
 */
router.post('/createExportLogs', createExportLogs);

/**
 * @openapi
 * /auditLogs/fetchExportLogs:
 *   post:
 *     summary: Fetch Export Logs
 *     description: Retrieve export logs based on specific criteria.
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
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - auditLogs
 */
router.post('/fetchExportLogs', fetchExportLogs);;

// router.post("/resendOtp", resendOtp);

module.exports = router;
