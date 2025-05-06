const express = require('express');
const automatedScoreController = require('../controllers/automatedScoreController');
var router = express.Router();

const {createWeights,calculation} = automatedScoreController;


/**
 * @openapi
 * /automatedScore/Create:
 *   post:
 *     summary: Create or update weights
 *     description: Create or update weights for automated scoring.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organization_id:
 *                 type: string
 *               weights:
 *                 type: object
 *                 properties:
 *                   totalWonWeights:
 *                     type: number
 *                   totalMissedWeights:
 *                     type: number
 *                   totalMeetingsWeights:
 *                     type: number
 *                   totalInterestedWeights:
 *                     type: number
 *                 required:
 *                   - totalWonWeights
 *                   - totalMissedWeights
 *                   - totalMeetingsWeights
 *                   - totalInterestedWeights
 *           example:
 *             organization_id: "your-organization-id"
 *             weights:
 *               totalWonWeights: 1
 *               totalMissedWeights: 1
 *               totalMeetingsWeights: 1
 *               totalInterestedWeights: 1
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
 *       - Automated Score
 */
router.post('/Create', createWeights);

/**
 * @openapi
 * /automatedScore/calculation:
 *   post:
 *     summary: Calculate automated score
 *     description: Calculate the automated score based on specific criteria.
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organization_id:
 *                 type: string
 *               uid:
 *                 type: string
 *           example:
 *             organization_id: "your-organization-id"
 *             uid: "your-user-id"
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
 *                   properties:
 *                     score:
 *                       type: number
 *           example:
 *             success: true
 *             data: { score: 85 }
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - Automated Score
 *     example:
 *       summary: Example Request with Token
 *       description: Example request with a valid token included in the header.
 *       value:
 *         organization_id: "your-organization-id"
 *         uid: "your-user-id"
 *       headers:
 *         x-access-token: "your-auth-token"
 */
router.post('/calculation',calculation);


module.exports = router;
