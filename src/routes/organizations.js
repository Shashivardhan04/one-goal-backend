const express = require('express');
var router = express.Router();
const organizationController = require('../controllers/organizationController');

const { Insert, updateData, fetch,createOrganizationWithAuth,updateOrganization,fetchAll,fetchSingleOrganization } = organizationController;

/**
 * @openapi
 * /organizations:
 *   get:
 *     summary: Get Information About Organizations
 *     description: Retrieve information about organizations.
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
 *                   description: A message indicating you are in organizations.
 *             example:
 *               message: "You are at organizations"
 *     tags:
 *       - organizations
 */
router.get('/', (req, res) => {
  res.send('you are at organizations');
});


/**
 * @openapi
 * /organizations/create:
 *   post:
 *     summary: Create Organization
 *     description: Create a new organization with the provided data.
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
 *         description: Organization created successfully
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
 *                   description: Additional data related to the created organization.
 *     tags:
 *       - organizations
 */
router.post('/create', Insert);

/**
 * @openapi
 * /organizations/updateData:
 *   post:
 *     summary: Update Organization Data
 *     description: Update organization data based on the provided information.
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
 *         description: Organization data updated successfully
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
 *                   description: Additional data related to the updated organization data.
 *     tags:
 *       - organizations
 */
router.post('/updateData', updateData);

/**
 * @openapi
 * /organizations/fetch:
 *   post:
 *     summary: Fetch Organization Data
 *     description: Fetch organization data based on specific criteria.
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
 *                   description: Data related to the fetched organization data.
 *     tags:
 *       - organizations
 */
router.post('/fetch', fetch);

//// after migration //////////////
router.post("/createOrg",createOrganizationWithAuth)

router.put("/updateOrg",updateOrganization)

router.get("/fetchAll",fetchAll)

router.get("/fetchSingleOrganization",fetchSingleOrganization)


module.exports = router;
