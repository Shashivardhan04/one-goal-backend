const express = require('express');
const contactResoController = require('../controllers/contactResourceController');
var router = express.Router();

const { Insert, Update } = contactResoController;

/**
 * @openapi
 * /contactResources:
 *   get:
 *     summary: Get Contact Resources Information
 *     description: Retrieve information about contact resources.
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
 *                   description: A message indicating you are in contact resources.
 *             example:
 *               message: "You are in contact resources"
 *     tags:
 *       - contactResources
 */
router.get('/', (req, res) => res.send('you are in contactResources'));


/**
 * @openapi
 * /contactResources/Create:
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
 *               itemName:
 *                 type: string
 *                 description: The name of the new item.
 *             example:
 *               itemName: "New Item Name"
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
 *       - contactResources
 */
router.post('/Create', Insert);


/**
 * @openapi
 * /contactResources/Update:
 *   post:
 *     summary: Update an Item
 *     description: Update an existing item with the provided data.
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
 *               itemId:
 *                 type: string
 *                 description: The ID of the item to update.
 *               itemName:
 *                 type: string
 *                 description: The updated name of the item.
 *             example:
 *               itemId: "12345"
 *               itemName: "Updated Item Name"
 *     responses:
 *       200:
 *         description: Item updated successfully
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
 *                   description: Additional data related to the updated item.
 *     tags:
 *       - contactResources
 */
router.post('/Update', Update);


module.exports = router;
