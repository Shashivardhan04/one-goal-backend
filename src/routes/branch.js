const express = require('express');
const branchController = require('../controllers/branchController');
var router = express.Router();

const { Insert } = branchController;

/**
 * @openapi
 * /branch:
 *   get:
 *     summary: Get Branch Information
 *     description: Retrieve information about the branch.
 *     security:
 *       - bearerAuth: []
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
 *                   description: A message indicating you are in the branch.
 *             example:
 *               message: "You are in branch"
 *     tags:
 *       - branch
 */
router.get('/', (req, res) => res.send('you are in branch'));


/**
 * @openapi
 * /branch/newBranch:
 *   post:
 *     summary: Create a New Branch
 *     description: Create a new branch with the provided data.
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
 *               branchName:
 *                 type: string
 *                 description: The name of the new branch.
 *             example:
 *               branchName: "New Branch Name"
 *     responses:
 *       201:
 *         description: Branch created successfully
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
 *                   description: Additional data related to the new branch.
 *     tags:
 *       - branch
 */
router.post('/newBranch', Insert);

module.exports = router;

///branch