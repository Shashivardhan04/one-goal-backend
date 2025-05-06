const express = require('express');
const bookingController = require('../controllers/bookingController');
var router = express.Router();

const {
    Create,
    Update,
    Delete,
    Details,
    BookingList,
    BookingCount,
} = bookingController;

/**
 * @openapi
 * /bookings/create:
 *   post:
 *     summary: Create a Booking
 *     description: Use this endpoint to create a new booking.
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
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       201:
 *         description: Booking created successfully
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
 *                   description: Additional data related to the booking.
 *     tags:
 *       - booking
 */
router.post('/create', Create);

/**
 * @openapi
 * /bookings/update:
 *   post:
 *     summary: Update a Booking
 *     description: Use this endpoint to update an existing booking.
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
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       200:
 *         description: Booking updated successfully
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
 *                   description: Additional data related to the booking update.
 *     tags:
 *       - booking
 */
router.post('/update', Update);

/**
 * @openapi
 * /bookings/delete:
 *   delete:
 *     summary: Delete a Booking
 *     description: Use this endpoint to delete a booking based on the specified criteria.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *       - in: query
 *         name: id
 *         required: true
 *         description: The ID of the booking to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking deleted successfully
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
 *                   description: Additional data related to the booking deletion.
 *     tags:
 *       - booking
 */
router.delete('/delete', Delete);

/**
 * @openapi
 * /bookings/details:
 *   post:
 *     summary: Get Booking Details
 *     description: Retrieve details of a booking based on the specified criteria.
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
 *               propertyName:
 *                 type: string
 *             required:
 *               - propertyName
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
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Booking details based on the specified criteria.
 *     tags:
 *       - booking
 */
router.post('/details', Details);

/**
 * @openapi
 * /bookings/booking:
 *   post:
 *     summary: Get Booking List
 *     description: Retrieve a list of bookings based on specific criteria.
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
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       propertyName:
 *                         type: string
 *                     example:
 *                       propertyName: "Example Property"
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - booking
 */
router.post('/booking', BookingList);

/**
 * @openapi
 * /bookings/bookingcount:
 *   post:
 *     summary: Get Booking Count
 *     description: Retrieve the count of bookings based on specific criteria.
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
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: integer
 *                   example: 100
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - booking
 */
router.post('/bookingcount', BookingCount);

module.exports = router;