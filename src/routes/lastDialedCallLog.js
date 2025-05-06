const express = require('express');
const lastDialedCallLogController = require('../controllers/lastDialedCallLogController');
var router = express.Router();

const {create,fetchAndVerify} = lastDialedCallLogController;



/**
 * @openapi
 * /lastDialedCall/create:
 *   post:
 *     summary: Create a New Item
 *     description: Create a new item with the provided data.
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
 *               property1:
 *                 type: string
 *                 description: The value of property 1.
 *             example:
 *               property1: "Example Property Value"
 *     responses:
 *       201:
 *         description: Item created successfully
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
 *                   description: Additional data related to the new item.
 *     tags:
 *       - lastDialedCall
 */
router.post('/create', create);


/**
 * @openapi
 * /lastDialedCall/fetchAndVerify:
 *   post:
 *     summary: Fetch and Verify Data
 *     description: Fetch and verify data based on specific criteria.
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
 *                 description: The criteria for data retrieval and verification.
 *             example:
 *               criteria: "Your criteria here"
 *     responses:
 *       200:
 *         description: Data fetched and verified successfully
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
 *                   description: Additional data related to the fetched and verified data.
 *     tags:
 *       - lastDialedCall
 */
router.post('/fetchAndVerify', fetchAndVerify);


module.exports = router;
