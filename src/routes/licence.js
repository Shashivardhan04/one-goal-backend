const express = require('express');
const licenceTrackingController = require('../controllers/licenceTrackingController');
var router = express.Router();

const {
    Get,
    Getorg,
    Update,
} = licenceTrackingController;

/**
 * @openapi
 * /licence/get:
 *   get:
 *     summary: Get Project Resource
 *     description: Retrieve project resource information based on the provided criteria.
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
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - licence
 */
router.get("/get", Get);

/**
 * @openapi
 * /licence/getorg:
 *   post:
 *     summary: Get Organization
 *     description: Retrieve organization information based on specific criteria.
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
 *               organizationData:
 *                 type: object
 *                 description: The data to update the organization.
 *             example:
 *               organizationData: { /* your organization data here * / }
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
 *     tags:
 *       - licence
 */
router.post('/getorg', Getorg);

/**
 * @openapi
 * /licence/update:
 *   post:
 *     summary: Update Organization
 *     description: Update organization information with the provided data.
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
 *               organizationData:
 *                 type: object
 *                 description: The data to update the organization.
 *             example:
 *               organizationData: { /* your organization data here * / }
 *     responses:
 *       200:
 *         description: Organization updated successfully
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
 *       - licence
 */
router.post('/update', Update);

module.exports = router;