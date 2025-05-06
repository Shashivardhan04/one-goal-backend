const express = require("express");
const userTrackingController = require("../controllers/userTrackingController");
var router = express.Router();
//router.get('/', userController.createUser);

const { getTrackingForDate, updateTrackingForDate,getUsersListForTracking,updateUserTrackingStatus,insertTrackingData,updateLiveTrackingStatus } =
  userTrackingController;

/**
 * @openapi
 * /userTracking/get:
 *   post:
 *     summary: Get Tracking for Date
 *     description: Retrieve tracking information for a specific date based on criteria.
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
 *               date:
 *                 type: string
 *                 description: The date for which tracking information is requested.
 *             example:
 *               date: "your-date"
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
 *     tags:
 *       - userTracking
 */
router.post("/get", getTrackingForDate);

/**
 * @openapi
 * /userTracking/update:
 *   post:
 *     summary: Update Tracking for Date
 *     description: Update tracking information for a specific date with the provided data.
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
 *               date:
 *                 type: string
 *                 description: The date for which tracking information is updated.
 *               updatedTrackingData:
 *                 type: object
 *                 description: Data for updating tracking information.
 *             example:
 *               date: "your-date"
 *               updatedTrackingData: { /* example updated tracking data * / }
 *     responses:
 *       200:
 *         description: Tracking updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - userTracking
 */
router.post("/update", updateTrackingForDate);

/**
 * @openapi
 * /userTracking/getUsersList:
 *   post:
 *     summary: Get Users List for Tracking
 *     description: Retrieve a list of users for tracking purposes based on specific criteria.
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
 *                 description: The criteria for user selection.
 *             example:
 *               criteria: "your-criteria"
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
 *                   type: array
 *                   items:
 *                     type: object
 *           example:
 *             success: true
 *             data: [{ /* user data here * / }]
 *     tags:
 *       - userTracking
 */
router.post("/getUsersList", getUsersListForTracking);

/**
 * @openapi
 * /userTracking/updateUserTrackingStatus:
 *   post:
 *     summary: Update User Tracking Status
 *     description: Update the tracking status of a user with the provided data.
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
 *               userId:
 *                 type: string
 *                 description: The ID of the user to update tracking status.
 *               newStatus:
 *                 type: string
 *                 description: The new tracking status for the user.
 *             example:
 *               userId: "user-id"
 *               newStatus: "new-tracking-status"
 *     responses:
 *       200:
 *         description: User tracking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - userTracking
 */
router.post("/updateUserTrackingStatus",updateUserTrackingStatus);

/**
 * @openapi
 * /userTracking/insertTrackingData:
 *   post:
 *     summary: Insert Tracking Data
 *     description: Insert tracking data for a specific user with the provided information.
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
 *               userId:
 *                 type: string
 *                 description: The ID of the user for tracking.
 *               trackingData:
 *                 type: object
 *                 description: Tracking data to insert.
 *             example:
 *               userId: "user-id"
 *               trackingData: { /* tracking data here * / }
 *     responses:
 *       201:
 *         description: Tracking data inserted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - userTracking
 */
router.post("/insertTrackingData",insertTrackingData);

/**
 * @openapi
 * /userTracking/updateLiveTrackingStatus:
 *   post:
 *     summary: Update Live Tracking Status
 *     description: Update the live tracking status of a user with the provided data.
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
 *               userId:
 *                 type: string
 *                 description: The ID of the user to update live tracking status.
 *               newStatus:
 *                 type: string
 *                 description: The new live tracking status for the user.
 *             example:
 *               userId: "user-id"
 *               newStatus: "new-live-tracking-status"
 *     responses:
 *       200:
 *         description: Live tracking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - userTracking
 */
router.post('/updateLiveTrackingStatus',updateLiveTrackingStatus);


module.exports = router;
