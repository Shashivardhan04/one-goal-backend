const express = require("express");
const apiQuestionsController = require("../controllers/apiQuestionsController");
var router = express.Router();
//router.get('/', userController.createUser);

const { getApiQuestions, addApiQuestions } =
apiQuestionsController;

/**
 * @openapi
 * /apiQuestions/get:
 *   post:
 *     summary: Add API Questions
 *     description: Add new API questions with the provided information.
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
 *               property2:
 *                 type: string
 *             required:
 *               - property1
 *               - property2
 *     responses:
 *       201:
 *         description: API questions added successfully
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
 *                   description: Additional data related to the added API questions.
 *     tags:
 *       - apiQuestions
 */
router.post("/get", getApiQuestions);

/**
 * @openapi
 * /apiQuestions/add:
 *   post:
 *     summary: Add API Questions
 *     description: Add new API questions with the provided information.
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
 *               property2:
 *                 type: string
 *             required:
 *               - property1
 *               - property2
 *     responses:
 *       201:
 *         description: API questions added successfully
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
 *                   description: Additional data related to the added API questions.
 *     tags:
 *       - apiQuestions
 */
router.post("/add", addApiQuestions);


module.exports = router;
