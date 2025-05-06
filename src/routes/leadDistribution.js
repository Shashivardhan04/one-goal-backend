const express = require('express');
const leadDistributionController = require("../controllers/leadDistributionController")
var router = express.Router();

const { create, update, deleteLogic, fetchAll, filterValues, leadDistributionCount } = leadDistributionController

/**
 * @openapi
 * /leadDistribution/create:
 *   post:
 *     summary: Create Lead for Distribution
 *     description: Create a new lead for distribution with the provided information.
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
 *                 format: email
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *             example:
 *               firstName: "John"
 *               lastName: "Doe"
 *               email: "john.doe@.com"
 *               phone: "1234567890"
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
 *                 data:
 *                   type: object
 *           example:
 *             success: true
 *             data: { /* your response data here * / }
 *       400:
 *         description: Bad request - Invalid input data
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - Lead Distribution
 */
router.post('/create', create);

/**
 * @openapi
 * /leadDistribution/update:
 *   put:
 *     summary: Update Lead
 *     description: Update an existing lead with the provided information.
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadId:
 *                 type: string
 *                 description: The ID of the lead to update.
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *             example:
 *               leadId: "12345"
 *               firstName: "UpdatedJohn"
 *               lastName: "UpdatedDoe"
 *               email: "updated.john.doe@example.com"
 *               phone: "9876543210"
 *     responses:
 *       200:
 *         description: Lead updated successfully
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
 *       400:
 *         description: Bad request - Invalid input data or lead ID
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - Lead Distribution
 */
router.put("/update", update);

/**
 * @openapi
 * /leadDistribution/delete:
 *   delete:
 *     summary: Delete Lead
 *     description: Delete an existing lead based on the provided lead ID.
 *     security:
 *       - bearerAuth: [] 
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *       - in: query
 *         name: Id
 *         required: true
 *         description: The ID of the lead to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead deleted successfully
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
 *       400:
 *         description: Bad request - Invalid lead ID
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - Lead Distribution
 */
router.post("/delete", deleteLogic);

/**
 * @openapi
 * /leadDistribution/fetchAll:
 *   get:
 *     summary: Fetch All Leads
 *     description: Retrieve a list of all leads based on optional query parameters.
 *     security:
 *       - bearerAuth: [] 
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization_id
 *         description: organization_id required
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         description: page is required
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         description: limit is required
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         description: sort is required
 *         schema:
 *           type: string
 *       - in: query
 *         name: filters
 *         description: filters are optional
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of leads retrieved successfully
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
 *             data: [ /* array of leads * / ]
 *       400:
 *         description: Bad request - Invalid query parameters
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - Lead Distribution
 */
router.get('/fetchAll', fetchAll);

/**
 * @openapi
 * /leadDistribution/filterValues:
 *   get:
 *     summary: Get Filter Values
 *     description: Retrieve filter values for leads, such as available status and source options.
 *     security:
 *       - bearerAuth: [] 
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization_id
 *         description: organization_id required
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filter values retrieved successfully
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
 *             data: { /* your filter values here * / }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - Lead Distribution
 */
router.get('/filterValues', filterValues);

/**
 * @openapi
 * /leadDistribution/count:
 *   get:
 *     summary: Get Lead Distribution Count
 *     description: Retrieve the count of leads for lead distribution.
 *     security:
 *       - bearerAuth: [] 
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization_id
 *         description: organization_id required
 *         schema:
 *           type: string
 *       - in: query
 *         name: filters
 *         description: filters are optional
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead distribution count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: integer
 *           example:
 *             success: true
 *             data: 100  # Replace with the actual count value
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - Lead Distribution
 */
// router.get("/count", leadDistributionCount)


module.exports = router;