const express = require('express');
const countController = require('../controllers/countController');
var router = express.Router();

const { Count } = countController;

/**
 * @openapi
 * /count:
 *   get:
 *     summary: Get count 
 *     description: Retrieve information about count .
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
 *                   description: A message indicating you are in counts.
 *             example:
 *               message: "you are in counts"
 *     tags:
 *       - count
 */
router.get('/', (req, res) => res.send('you are in counts'));

/**
 * @openapi
 * /count/Count:
 *   post:
 *     summary: Count Items
 *     description: Count items based on specific criteria.
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
 *                 description: The criteria for counting items.
 *             example:
 *               criteria: "your-count-criteria"
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
 *                   description: Indicates if the operation was successful.
 *                 count:
 *                   type: integer
 *                   description: The count of items based on the criteria.
 *             example:
 *               success: true
 *               count: 42
 *     tags:
 *       - count
 */
router.post('/Count', Count);


module.exports = router;
