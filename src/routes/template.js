const express = require("express");
const templateController= require('../controllers/templateController');
var router = express.Router();

/**
 * @openapi
 * /messageTemplate/createMessageTemplate:
 *   post:
 *     summary: Create Message Template
 *     description: Create a new message template with the provided information.
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
 *               templateName:
 *                 type: string
 *                 description: The name of the message template.
 *               templateContent:
 *                 type: string
 *                 description: The content of the message template.
 *             example:
 *               templateName: "New Template"
 *               templateContent: "Template content goes here"
 *     responses:
 *       201:
 *         description: Message template created successfully
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
 *       - Template
 */
router.post('/createMessageTemplate',templateController.createMessageTemplate);

/**
 * @openapi
 * /messageTemplate/fetchTemplates:
 *   post:
 *     summary: Fetch Message Templates
 *     description: Fetch a list of message templates based on specific criteria.
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
 *                 description: Search criteria for fetching templates.
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       templateName:
 *                         type: string
 *                       templateContent:
 *                         type: string
 *                     example:
 *                       templateName: "Template Name"
 *                       templateContent: "Template Content"
 *     tags:
 *       - Template
 */
router.post('/fetchTemplates',templateController.fetchTemplates);


module.exports=router;