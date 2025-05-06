const express = require("express");
const taskController = require("../controllers/taskController");
var router = express.Router();

const {
  Create,
  Update,
  UpdateTask,
  fetch,
  Search,
  FilterValues,
  TaskCount,
  TaskDateStatus,
  GetTasksOfDate,
  TasksReport,
  TasksSalesCategoryCount,
  DrillDownSearch,
  DrillDownCount,
  DeleteTask,
  UniqueTaskTypeUpdate,
  GetTasksById,
  UpdateVerification,
  GetTasksOfOrg,
  GetMissedTasks,
  GetTaskById,
  FixTaskUpdateIssue,
  CreateTaskNew,
  ChangeLeadStageNew,
  RescheduleTaskNew,
  FetchLeadTasksNew,
  GetTodaysTasksData,
  GetFetchLeadTasksNew,
  createTaskNewAndApproval,
  UpdateVerificationWithApproval,
  AppFilterValues
} = taskController;

/**
 * @openapi
 * /tasks/create:
 *   post:
 *     summary: Create a new task
 *     description: Use this endpoint to create a new task.
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
 *               propertyName: # Define the properties expected in the request body
 *                 type: string
 *             required:
 *               - propertyName
 *     responses:
 *       201:
 *         description: Task created successfully
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
 *                   description: Additional data related to the task.
 *     tags:
 *       - tasks
 */
router.post('/create', Create);

/**
 * @openapi
 * /tasks/update:
 *   post:
 *     summary: Update a task
 *     description: Use this endpoint to update an existing task.
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
 *         description: Task updated successfully
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
 *                   description: Additional data related to the task.
 *     tags:
 *       - tasks
 */
router.post('/update', Update);


/**
 * @openapi
 * /taks/updateTask:
 *   post:
 *     summary: Update a task
 *     description: Use this endpoint to update an existing task.
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
 *         description: Task updated successfully
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
 *                   description: Additional data related to the task.
 *     tags:
 *       - tasks
 */
router.post('/updateTask', UpdateTask);


/**
 * @openapi
 * /tasks/fetch:
 *   post:
 *     summary: Fetch a task
 *     description: Use this endpoint to fetch a task based on specific criteria.
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
 *               criteria: "your-criteria"
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
 *                   description: Task data based on the criteria.
 *     tags:
 *       - tasks
 */
router.post('/fetch', fetch);


/**
 * @openapi
 * /tasks/search:
 *   post:
 *     summary: Search tasks
 *     description: Search for tasks based on specific criteria.
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
 *                   description: Indicates if the operation was successful.
 *                 data:
 *                   type: object
 *                   description: Task data based on the criteria.
 *     tags:
 *       - tasks
 */
router.post('/search', Search);

/**
 * @openapi
 * /tasks/getTaskById:
 *   post:
 *     summary: Get Task by ID
 *     description: Retrieve a task by its unique ID.
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
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/getTasksId', GetTasksById);


/**
 * @openapi
 * /tasks/filterValues:
 *   post:
 *     summary: Filter Task Values
 *     description: Filter task values based on specific criteria.
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
 *               options:
 *                 type: object
 *                 properties:
 *                   option1:
 *                     type: boolean
 *                   option2:
 *                     type: string
 *                 required:
 *                   - option1
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
 *                   description: Filtered task values based on the criteria.
 *     tags:
 *       - tasks
 */
router.post('/filterValues', FilterValues);


/**
 * @openapi
 * /tasks/taskCount:
 *   post:
 *     summary: Get Task Count
 *     description: Get the count of tasks based on specific criteria.
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
 *                   description: Indicates if the operation was successful.
 *                 count:
 *                   type: number
 *                   description: The count of tasks based on the criteria.
 *     tags:
 *       - tasks
 */
router.post('/taskCount', TaskCount);


/**
 * @openapi
 * /tasks/taskDateStatus:
 *   post:
 *     summary: Get Task Status by Date
 *     description: Get the status of tasks based on a specific date.
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
 *               date:
 *                 type: string
 *             example:
 *               date: "2023-10-31"
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
 *                 status:
 *                   type: string
 *                   description: The status of tasks on the specified date.
 *     tags:
 *       - tasks
 */
router.post('/taskDateStatus', TaskDateStatus);


/**
 * @openapi
 * /tasks/getTasksOfDate:
 *   post:
 *     summary: Get Tasks by Date
 *     description: Get tasks based on a specific date.
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
 *               date:
 *                 type: string
 *             example:
 *               date: "2023-10-31"
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
 *                 tasks:
 *                   type: array
 *                   description: List of tasks for the specified date.
 *     tags:
 *       - tasks
 */
router.post('/getTasksOfDate', GetTasksOfDate);


/**
 * @openapi
 * /tasks/tasksReport/{type}:
 *   post:
 *     summary: Generate Tasks Report
 *     description: Generate a report for tasks based on the specified type.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: The type of report to generate.
 *         schema:
 *           type: string
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
 *         description: Tasks report generated successfully
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
 *                   description: Additional data related to the tasks report.
 *     tags:
 *       - tasks
 */
router.post('/tasksReport/:type', TasksReport);



/**
 * @openapi
 * /tasks/tasksSalesCategoryCount/{type}:
 *   post:
 *     summary: Get Sales Category Count for Tasks
 *     description: Get the count of tasks based on the specified sales category type.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: The type of sales category to count tasks for.
 *         schema:
 *           type: string
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
 *         description: Sales category count retrieved successfully
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
 *                   description: Sales category count data.
 *     tags:
 *       - tasks
 */
router.post('/tasksSalesCategoryCount/:type', TasksSalesCategoryCount);


/**
 * @openapi
 * /tasks/drillDownSearch:
 *   post:
 *     summary: Drill Down Search for Tasks
 *     description: Perform a drill-down search for tasks based on specific criteria.
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
 *         description: Drill-down search successful
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
 *                   description: Data related to the drill-down search results.
 *     tags:
 *       - tasks
 */
router.post('/drillDownSearch', DrillDownSearch);


/**
 * @openapi
 * /tasks/drillDownCount:
 *   post:
 *     summary: Drill Down Count for Tasks
 *     description: Get the count of tasks based on specific criteria in a drill-down view.
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
 *         description: Drill-down count retrieval successful
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
 *                   description: Data related to the drill-down count results.
 *     tags:
 *       - tasks
 */
router.post('/drillDownCount', DrillDownCount);


/**
 * @openapi
 * /tasks/uniqueTaskTypeUpdate:
 *   post:
 *     summary: Update Unique Task Type
 *     description: Update a unique task type based on specific criteria.
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
 *         description: Unique task type updated successfully
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
 *                   description: Additional data related to the unique task type update.
 *     tags:
 *       - tasks
 */
router.post('/uniqueTaskTypeUpdate', UniqueTaskTypeUpdate);


/**
 * @openapi
 * /tasks/updateVerification:
 *   post:
 *     summary: Update Verification
 *     description: Update verification based on specific criteria.
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
 *         description: Verification updated successfully
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
 *                   description: Additional data related to the verification update.
 *     tags:
 *       - tasks
 */
router.post('/updateVerification', UpdateVerification);


/**
 * @openapi
 * /tasks/deleteTask:
 *   delete:
 *     summary: Delete a Task
 *     description: Delete a task based on the specified criteria.
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
 *       204:
 *         description: Task deleted successfully
 *     tags:
 *       - tasks
 */
router.delete('/deleteTask', DeleteTask);

/**
 * @openapi
 * /tasks/getTasksOfOrg:
 *   post:
 *     summary: Get Tasks of an Organization
 *     description: Retrieve tasks belonging to a specific organization based on criteria.
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
 *         description: Tasks retrieved successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/getTasksOfOrg', GetTasksOfOrg);


/**
 * @openapi
 * /tasks/getMissedTasks:
 *   post:
 *     summary: Get Missed Tasks
 *     description: Retrieve missed tasks based on specific criteria.
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
 *         description: Missed tasks retrieved successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/getMissedTasks', GetMissedTasks);


/**
 * @openapi
 * /tasks/getTaskById:
 *   post:
 *     summary: Get Task by ID
 *     description: Retrieve a task by its unique ID.
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
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/getTaskById', GetTaskById);


/**
 * @openapi
 * /tasks/fixTaskUpdateIssue:
 *   post:
 *     summary: Fix Task Update Issue
 *     description: Use this endpoint to fix issues related to task updates.
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
 *         description: Task update issue fixed successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/fixTaskUpdateIssue', FixTaskUpdateIssue);


// Below there is code for migration purpose

/**
 * @openapi
 * /tasks/createTaskNew:
 *   post:
 *     summary: Create a New Task
 *     description: Use this endpoint to create a new task.
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
 *         description: Task created successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/createTaskNew', CreateTaskNew);


/**
 * @openapi
 * /tasks/changeLeadStageNew:
 *   post:
 *     summary: Change Lead Stage for a Task
 *     description: Use this endpoint to change the lead stage for a task.
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
 *         description: Lead stage changed successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/changeLeadStageNew', ChangeLeadStageNew);


/**
 * @openapi
 * /tasks/rescheduleTaskNew:
 *   post:
 *     summary: Reschedule a Task
 *     description: Use this endpoint to reschedule a task to a new date and time.
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
 *         description: Task rescheduled successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/rescheduleTaskNew', RescheduleTaskNew);


/**
 * @openapi
 * /fetchLeadTasksNew:
 *   post:
 *     summary: Fetch Lead Tasks
 *     description: Use this endpoint to fetch tasks related to a lead.
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
 *         description: Tasks fetched successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/fetchLeadTasksNew', FetchLeadTasksNew);


/**
 * @openapi
 * /getTodaysTasksData:
 *   post:
 *     summary: Get Today's Tasks Data
 *     description: Use this endpoint to retrieve data related to tasks scheduled for today.
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
 *         description: Today's tasks data retrieved successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.post('/getTodaysTasksData', GetTodaysTasksData);


/**
 * @openapi
 * /tasks/GETfetchLeadTasksNew:
 *   get:
 *     summary: Fetch Lead Tasks
 *     description: Use this endpoint to fetch tasks related to a lead.
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
 *         description: Tasks fetched successfully
 *       403:
 *         description: Forbidden - Token not found or invalid
 *     tags:
 *       - tasks
 */
router.get('/getFetchLeadTasksNew', GetFetchLeadTasksNew);

router.post("/createTaskNewAndApproval",createTaskNewAndApproval);

router.post("/UpdateVerificationWithApproval",UpdateVerificationWithApproval);

router.post('/appFilterValues', AppFilterValues);

module.exports = router;
