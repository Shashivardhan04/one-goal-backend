const express = require('express');
const fcmController = require('../controllers/fcmTokenController');
var router = express.Router();

const { Insert, Update } = fcmController;

/**
 * @openapi
 * /fcmToken:
 *   get:
 *     summary: Get FCM Token Information
 *     description: Retrieve information about the FCM Token.
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
 *                 message:
 *                   type: string
 *                   description: A message indicating you are in the FCM Token section.
 *             example:
 *               message: "You are in the FCM Token section"
 *     tags:
 *       - fcmToken
 */
router.get('/', (req, res) => res.send('you are in fcmToken'));

/**
 * @openapi
 * /fcmToken/Create:
 *   post:
 *     summary: Create FCM Token
 *     description: Create a new FCM Token with the provided data.
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
 *               token:
 *                 type: string
 *                 description: The FCM Token to be created.
 *             example:
 *               token: "example-fcm-token"
 *     responses:
 *       201:
 *         description: FCM Token created successfully
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
 *                   description: Additional data related to the new FCM Token.
 *     tags:
 *       - fcmToken
 */
router.post('/Create', Insert);


/**
 * @openapi
 * /fcmToken/Update:
 *   post:
 *     summary: Update FCM Token
 *     description: Update an existing FCM Token with the provided data.
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
 *               token:
 *                 type: string
 *                 description: The FCM Token to be updated.
 *             example:
 *               token: "example-updated-fcm-token"
 *     responses:
 *       200:
 *         description: FCM Token updated successfully
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
 *                   description: Additional data related to the updated FCM Token.
 *     tags:
 *       - fcmToken
 */
router.post('/Update', Update);


module.exports = router;
