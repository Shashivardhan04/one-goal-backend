const express = require('express');
var router = express.Router();
const organizationResourcesController = require('../controllers/organizationResourcesController');

const { Update, Get, Delete,Insert ,createResource,fetchAll,deleteResource,updateOrg} = organizationResourcesController;

/**
 * @openapi
 * /organizationResources/get:
 *   post:
 *     summary: Get Data
 *     description: Get data based on specific criteria.
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
 *       - organizationResources
 */
router.post('/get', Get);

/**
 * @openapi
 * /organizationResources/add:
 *   post:
 *     summary: Add Data
 *     description: Add new data with the provided information.
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               property1:
 *                 type: string
 *               property2:
 *                 type: string
 *             example:
 *               property1: "Value 1"
 *               property2: "Value 2"
 *     responses:
 *       201:
 *         description: Data added successfully
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
 *                   description: Additional data related to the added data.
 *     tags:
 *       - organizationResources
 */
router.post('/add', Insert);

/**
 * @openapi
 * /organizationResources/update:
 *   post:
 *     summary: Update Data
 *     description: Update data based on specific criteria.
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               updatedData:
 *                 type: object
 *             example:
 *               criteria: "your-update-criteria"
 *               updatedData: { /* updated data here * / }
 *     responses:
 *       200:
 *         description: Data updated successfully
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
 *                   description: Additional data related to the updated data.
 *     tags:
 *       - organizationResources
 */
router.post('/update', Update);

/**
 * @openapi
 * /organizationResources/delete:
 *   post:
 *     summary: Delete Data
 *     description: Delete data based on specific criteria.
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *             example:
 *               criteria: "your-delete-criteria"
 *     responses:
 *       200:
 *         description: Data deleted successfully
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
 *                   description: Additional data related to the deleted data.
 *     tags:
 *       - organizationResources
 */
router.post('/delete', Delete);

////////// migration from firebase to mongodb ///////////////////////////////

router.post("/createResource",createResource)

router.put("/updateOrg",updateOrg)

router.get("/fetchAll",fetchAll)

router.post("/deleteresource",deleteResource)

module.exports = router;
