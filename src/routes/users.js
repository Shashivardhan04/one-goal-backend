const express = require('express');
const userController = require('../controllers/usersController');
var router = express.Router();
//router.get('/', userController.createUser);

const { Insert, findByOrgan_ID, FindByUid, updateData,GetUser,GetUsersList,UpdateUserRating,GetUserReport, fetchSpecificData,getUserDetail, createUserWithAuth, Update, FetchAll, FetchUser, ResetPasswordForFirstSignIn,UpdateUserPassword,FetchReportingUser, ImportUsers,CreateSubUser,SendOtpBeforeUpdatingMobile, VerifyOtpAndUpdateUser,updateContactNumberFromMB,verifyNumberInDb } = userController;

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get User Information
 *     description: Retrieve user information.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
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
 *                   description: A welcome message.
 *             example:
 *               message: "You are in users"
 *     tags:
 *       - user
 */
router.get('/', (req, res) => res.send('you are in users'));


/**
 * @openapi
 * /users/newUser:
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
 *             required:
 *               - username
 *               - email
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
 *       - user
 */
router.post('/newUser', Insert);

/**
 * @openapi
 * /users/findByUID:
 *   post:
 *     summary: Find User by UID
 *     description: Retrieve user information by UID.
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
 *               uid:
 *                 type: string
 *             required:
 *               - uid
 *     responses:
 *       200:
 *         description: User found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: User information based on the provided UID.
 *     tags:
 *       - user
 */
router.post('/findByUID', FindByUid);

/**
 * @openapi
 * /users/findByOrganizationId:
 *   post:
 *     summary: Find User by Organization ID
 *     description: Retrieve users based on the provided Organization ID.
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
 *               organizationId:
 *                 type: string
 *             required:
 *               - organizationId
 *     responses:
 *       200:
 *         description: Users found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: User information based on the provided Organization ID.
 *     tags:
 *       - user
 */
router.post('/findByOrganizationId', findByOrgan_ID);


/**
 * @openapi
 * /users/updateData:
 *   post:
 *     summary: Update User Data
 *     description: Update user data with the provided information.
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
 *             required:
 *               - userId
 *     responses:
 *       200:
 *         description: User data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: A message indicating the status of the update.
 *     tags:
 *       - user
 */
router.post('/updateData', updateData);


/**
 * @openapi
 * /users/getUser:
 *   post:
 *     summary: Get User Information
 *     description: Retrieve user information based on the provided user ID.
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
 *                 description: The ID of the user to retrieve information.
 *             required:
 *               - userId
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: User information based on the provided user ID.
 *     tags:
 *       - user
 */
router.post('/getUser', GetUser);


/**
 * @openapi
 * /users/getUsersList:
 *   post:
 *     summary: Get Users List
 *     description: Retrieve a list of users based on specific criteria.
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
 *             required:
 *               - criteria
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
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
 *                   description: A list of users that match the criteria.
 *     tags:
 *       - user
 */
router.post('/getUsersList', GetUsersList);


/**
 * @openapi
 * /users/updateUserRating:
 *   post:
 *     summary: Update User Rating
 *     description: Update the rating of a user.
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
 *               newRating:
 *                 type: number
 *             required:
 *               - userId
 *               - newRating
 *     responses:
 *       200:
 *         description: User rating updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *     tags:
 *       - user
 */
router.post('/updateUserRating', UpdateUserRating);


/**
 * @openapi
 * /users/getUserReport:
 *   post:
 *     summary: Get User Report
 *     description: Retrieve a report for a specific user.
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
 *             required:
 *               - userId
 *     responses:
 *       200:
 *         description: User report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: The user report data.
 *     tags:
 *       - user
 */
router.post('/getUserReport', GetUserReport);


/**
 * @openapi
 * /users/fetchSpecificData:
 *   post:
 *     summary: Fetch Specific User Data
 *     description: Retrieve specific data for a user based on criteria.
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
 *               criteria:
 *                 type: string
 *             required:
 *               - userId
 *               - criteria
 *     responses:
 *       200:
 *         description: Specific user data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: The specific user data that matches the criteria.
 *     tags:
 *       - user
 */
router.post('/fetchSpecificData',fetchSpecificData);


router.post('/getUserDetail', getUserDetail);

router.post('/createUserWithAuth', createUserWithAuth);

router.post('/update', Update);

router.get('/fetchAll', FetchAll);

router.get('/fetchUser', FetchUser);

router.get('/fetchReportingUser', FetchReportingUser);

router.post('/resetPasswordForFirstSignIn', ResetPasswordForFirstSignIn);

router.post('/updateUserPassword', UpdateUserPassword);

router.post('/importUsers', ImportUsers);

router.post('/createSubUser', CreateSubUser);

router.post('/sendOtpBeforeUpdatingMobile', SendOtpBeforeUpdatingMobile);

router.post('/verifyOtpAndUpdateUser', VerifyOtpAndUpdateUser);

router.post("/updateUserContactMMB",updateContactNumberFromMB)

router.get("/verifyNum",verifyNumberInDb)

module.exports = router;
