const express = require('express');
const notificationController = require('../controllers/notificationController');
// const {sendNotifications,sendNotificationsLiveTracking,sendNotificationsVerification}= require("../functions/sendNotification");
const {MESSAGES}=require("../constants/constants")
// const {sendNotificationsLiveTracking}=require("../functions/sendNotification")
var router = express.Router();

const { addNewNotification, deleteNotification, updateNotifications , getNotifications , sendNotifications} =
  notificationController;
/**
 * @openapi
 * /notification/add:
 *   post:
 *     summary: Add New Notification
 *     description: Add a new notification with the provided data.
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
 *               notificationData:
 *                 type: object
 *                 description: The data for the new notification.
 *             example:
 *               notificationData: { /* example data for the new notification * / }
 *     responses:
 *       200:
 *         description: Notification added successfully
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
 *       - notification
 */
router.post('/add', addNewNotification);

/**
 * @openapi
 * /notification/delete:
 *   post:
 *     summary: Delete Notification
 *     description: Delete a notification based on the specified criteria.
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
 *               notificationId:
 *                 type: string
 *                 description: The ID of the notification to delete.
 *             example:
 *               notificationId: "12345"
 *     responses:
 *       200:
 *         description: Notification deleted successfully
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
 *       - notification
 */
router.post('/delete', deleteNotification);

/**
 * @openapi
 * /notification/update:
 *   post:
 *     summary: Update Notifications
 *     description: Update notifications with the provided data.
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
 *               updatedNotifications:
 *                 type: array
 *                 description: An array of notifications with updated data.
 *             example:
 *               updatedNotifications: [{ /* example updated notification data * / }]
 *     responses:
 *       200:
 *         description: Notifications updated successfully
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
 *       - notification
 */
router.post('/update', updateNotifications);

/**
 * @openapi
 * /notification/get:
 *   post:
 *     summary: Get Notifications
 *     description: Get notifications based on specific criteria.
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
 *                 description: The search criteria for notifications.
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
 *     tags:
 *       - notification
 */
router.post('/get', getNotifications);


/////////////function called to create notification from firebase to mongodb //////////////////////////

router.post("/sendNotifications", sendNotifications)


// router.post("/sendNotificationsLiveTracking",async(req,res)=>{
//     try {
//       let data=JSON.stringify(req.body);
//       await sendNotificationsLiveTracking(data);
//       return res.status(200).json({
//         success:true,
//         message:"notification sended successfully"
//       })
      
//     } catch (error) {
//       return res.status(400).json({
//         success: false,
//         message: MESSAGES.catchError,
//         error: error.message
//       })
//     }
// })


// router.post("/sendNotificationsVerification",async(req,res)=>{
//   try {
//     let data=JSON.stringify(req.body);
//     await sendNotificationsVerification(data);
   
//     return res.status(200).json({
//       success:true,
//       message:"notification sended successfully"
//     })
//   } catch (error) {
//     return res.status(400).json({
//       success: false,
//       message: MESSAGES.catchError,
//       error: error.message
//     })
//   }
// })

module.exports = router;
