const express = require('express');
const userListController = require('../controllers/userListsController');
var router = express.Router();

const { Insert, Update } = userListController;

/**
 * @openapi
 * /userList:
 *   get:
 *     summary: Get User List
 *     description: Retrieve a list of users.
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
 *                   description: A message indicating you are in the user list.
 *             example:
 *               message: "You are in the user list"
 *     tags:
 *       - userList
 */
router.get('/', (req, res) => res.send('you are in userList'));

/**
 * @openapi
 * /userList/Create:
 *   post:
 *     summary: Create a New User
 *     description: Create a new user with the provided data.
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *             example:
 *               username: "NewUser"
 *               email: "newuser@example.com"
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                   description: Additional data related to the user.
 *     tags:
 *       - userList
 */
router.post('/Create', Insert);

/**
 * @openapi
 * /userList/Update:
 *   post:
 *     summary: Update User
 *     description: Update user information with the provided data.
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
 *                 description: The ID of the user to update.
 *               updatedData:
 *                 type: object
 *                 description: Updated user data.
 *             example:
 *               userId: "12345"
 *               updatedData: { /* updated user data * / }
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   description: Additional data related to the user update.
 *     tags:
 *       - userList
 */
router.post('/Update', Update);

module.exports = router;
