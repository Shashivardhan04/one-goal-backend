const express = require('express');
const paymentController = require('../controllers/paymentController');
var router = express.Router();

const {
    Create,
    Verification,
    Search,
    CreatePdf,
    Get
} = paymentController;

/**
 * @openapi
 * /payments/createorder:
 *   post:
 *     summary: Create Order
 *     description: Create a new order with the provided data.
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
 *               orderData:
 *                 type: object
 *                 description: Data for creating the order.
 *             example:
 *               orderData: { /* your order data here * / }
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *       - payments
 */
router.post('/createorder', Create);

/**
 * @openapi
 * /payments/paymentverification:
 *   post:
 *     summary: Payment Verification
 *     description: Verify a payment with the provided data.
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
 *               paymentData:
 *                 type: object
 *                 description: Data for verifying the payment.
 *             example:
 *               paymentData: { /* your payment data here * / }
 *     responses:
 *       200:
 *         description: Payment verification successful
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
 *       - payments
 */
router.post('/paymentverification', Verification);

/**
 * @openapi
 * /payments/search:
 *   post:
 *     summary: Search
 *     description: Perform a search operation based on specific criteria.
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
 *               searchCriteria:
 *                 type: string
 *                 description: The criteria for the search.
 *             example:
 *               searchCriteria: "your-search-criteria"
 *     responses:
 *       200:
 *         description: Successful search
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
 *       - payments
 */
router.post('/search', Search);

/**
 * @openapi
 * /payments/createpdf:
 *   post:
 *     summary: Create PDF
 *     description: Create a PDF document based on the provided data.
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
 *               pdfData:
 *                 type: object
 *                 description: Data for creating the PDF document.
 *             example:
 *               pdfData: { /* your PDF data here * / }
 *     responses:
 *       201:
 *         description: PDF document created successfully
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
 *       - payments
 */
router.post('/createpdf', CreatePdf);

/**
 * @openapi
 * /payments/get:
 *   get:
 *     summary: Get Data
 *     description: Retrieve data based on specific criteria.
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
 *       - payments
 */
router.get('/get', Get);

module.exports = router;