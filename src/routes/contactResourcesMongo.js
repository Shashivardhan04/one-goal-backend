const express = require('express');
const contactResourcesMongoController = require('../controllers/contactResourcesMongoController');
var router = express.Router();

const { AddAttachment, AddNote, FetchContactResources, Create,BulkCreate, DeleteAttachment,BulkOperationsFirebase,createLeads,GetNotesInBulk,GetFetchContactResources,newdataUpadate } = contactResourcesMongoController;

// router.get('/', (req, res) => res.send('you are in contactResources'));

/**
 * @openapi
 * /contactResourcesMongo/addAttachment:
 *   post:
 *     summary: Add Attachment to Item
 *     description: Add an attachment to an item with the provided data.
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
 *                 description: The ID of the item to attach the file to.
 *               attachmentFile:
 *                 type: string
 *                 description: The file to be attached.
 *             example:
 *               itemId: "12345"
 *               attachmentFile: "example-file.pdf"
 *     responses:
 *       201:
 *         description: Attachment added successfully
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
 *                   description: Additional data related to the added attachment.
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/addAttachment', AddAttachment);


/**
 * @openapi
 * /contactResourcesMongo/addNote:
 *   post:
 *     summary: Add Note to Item
 *     description: Add a note to an item with the provided data.
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
 *                 description: The ID of the item to attach the note to.
 *               noteText:
 *                 type: string
 *                 description: The text of the note.
 *             example:
 *               itemId: "12345"
 *               noteText: "This is a sample note."
 *     responses:
 *       201:
 *         description: Note added successfully
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
 *                   description: Additional data related to the added note.
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/addNote', AddNote);


/**
 * @openapi
 * /contactResourcesMongo/fetchContactResources:
 *   post:
 *     summary: Fetch Contact Resources
 *     description: Fetch contact resources based on specific criteria.
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
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                   to:
 *                     type: string
 *             example:
 *               criteria: "your-search-criteria"
 *               dateRange:
 *                 from: "start-date"
 *                 to: "end-date"
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
 *                       resourceName:
 *                         type: string
 *                       resourceType:
 *                         type: string
 *                     example:
 *                       resourceName: "Resource Name"
 *                       resourceType: "Type"
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/fetchContactResources', FetchContactResources);


/**
 * @openapi
 * /contactResourcesMongo/create:
 *   post:
 *     summary: Create Contact Resource
 *     description: Create a new contact resource with the provided data.
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
 *               resourceName:
 *                 type: string
 *                 description: The name of the contact resource.
 *               resourceType:
 *                 type: string
 *                 description: The type of the resource.
 *             example:
 *               resourceName: "New Contact Resource"
 *               resourceType: "Type"
 *     responses:
 *       201:
 *         description: Contact resource created successfully
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
 *                   description: Additional data related to the new contact resource.
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/create', Create);


/**
 * @openapi
 * /contactResourcesMongo/bulkCreate:
 *   post:
 *     summary: Create Contact Resources in Bulk
 *     description: Create multiple contact resources in bulk with the provided data.
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
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 resourceName:
 *                   type: string
 *                   description: The name of the contact resource.
 *                 resourceType:
 *                   type: string
 *                   description: The type of the resource.
 *               example:
 *                 resourceName: "New Contact Resource"
 *                 resourceType: "Type"
 *     responses:
 *       201:
 *         description: Contact resources created in bulk successfully
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
 *                       resourceName:
 *                         type: string
 *                       resourceType:
 *                         type: string
 *                     example:
 *                       resourceName: "New Contact Resource"
 *                       resourceType: "Type"
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/bulkCreate', BulkCreate);


/**
 * @openapi
 * /contactResourcesMongo/deleteAttachment:
 *   post:
 *     summary: Delete Attachment from Item
 *     description: Delete an attachment from an item with the provided data.
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
 *                 description: The ID of the item from which to delete the attachment.
 *               attachmentId:
 *                 type: string
 *                 description: The ID of the attachment to delete.
 *             example:
 *               itemId: "12345"
 *               attachmentId: "attachment123"
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
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
 *                   description: Additional data related to the deleted attachment.
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/deleteAttachment', DeleteAttachment);

/**
 * @openapi
 * /contactResourcesMongo/bulkOperationsFirebase:
 *   post:
 *     summary: Perform Bulk Operations on Firebase
 *     description: Perform bulk operations on Firebase with the provided data.
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
 *               operationType:
 *                 type: string
 *                 description: The type of bulk operation to perform.
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     operationData:
 *                       type: object
 *                 description: Data for the bulk operation.
 *             example:
 *               operationType: "Bulk Update"
 *               data: 
 *                 - itemId: "12345"
 *                   operationData: { /* operation data for the item * / }
 *     responses:
 *       200:
 *         description: Bulk operations on Firebase performed successfully
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
 *                   description: Additional data related to the bulk operations.
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/bulkOperationsFirebase', BulkOperationsFirebase);


/**
 * @openapi
 * /contactResourcesMongo/createLeads:
 *   post:
 *     summary: Create Leads
 *     description: Create leads with the provided data.
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
 *               leadData:
 *                 type: object
 *                 description: Data for creating leads.
 *             example:
 *               leadData: { /* example lead data * / }
 *     responses:
 *       201:
 *         description: Leads created successfully
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
 *                   description: Additional data related to the created leads.
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/createLeads', createLeads);

/**
 * @openapi
 * /contactResourcesMongo/getNotesInBulk:
 *   post:
 *     summary: Get Notes in Bulk
 *     description: Retrieve notes in bulk based on specific criteria.
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
 *                 description: The criteria for retrieving notes in bulk.
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
 *                       noteId:
 *                         type: string
 *                       content:
 *                         type: string
 *                 description: Notes retrieved in bulk.
 *             example:
 *               success: true
 *               data: 
 *                 - noteId: "1"
 *                   content: "Note 1"
 *                 - noteId: "2"
 *                   content: "Note 2"
 *     tags:
 *       - contactResourcesMongo
 */
router.post('/getNotesInBulk', GetNotesInBulk);

/**
 * @openapi
 * /contactResourcesMongo/GETfetchContactResources:
 *   get:
 *     summary: Fetch Contact Resources
 *     description: Fetch contact resources based on specific criteria.
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
 *         name: leadId
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       resourceName:
 *                         type: string
 *                       resourceType:
 *                         type: string
 *                     example:
 *                       resourceName: "Resource Name"
 *                       resourceType: "Type"
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - contactResourcesMongo
 */
router.get('/getFetchContactResources', GetFetchContactResources);

// router.get('/newdataUpadate', newdataUpadte);


module.exports = router;
