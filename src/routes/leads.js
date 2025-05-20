const express = require("express");
const leadController = require("../controllers/leadsController");
const logger = require("../services/logger"); // Ensure logger is properly imported
const {
  Search,
  contacttotalcount,
  FilterValues,
  LeadCount,
  StageCount,
  Create,
  updateData,
  bulkCreate,
  bulkUpdate,
  deleteData,
  feedbackReport,
  ReasonReport,
  InterestedReport,
  InterestedReportOptimized,
  TaskSearch,
  TaskStageCount,
  DrillDownSearch,
  ResolveMissData,
  TransferLeads,
  CreateNotes,
  UpdateNotes,
  UpdateCallLogs,
  UpdateAttachment,
  GetContactResource,
  callBackReasonReport,
  callTimeUpdate,
  GetDuplicateLeads,
  deleteDuplicate,
  deleteDuplicateOwner,
  GetNotWorkedFreshLeads,
  CheckIfLeadExists,
  missCount,
  HO_missCount1,
  HO_missCount2,
  HO_missCount3,
  Reports,
  CreateLeadNew,
  EditLeadNew,
  CheckContactExistsNew,
  GetLeadDetails,
  DeleteMultipleLeads,
  BulkUpdateLeads,
  TransferLeadsNew,
  CheckIfFieldExistsInLeads,
  UpdateReenquiredLeads,
  AppSearch,
  AppFilterValues,
  fetchLeadByMBContactId,
  ShowMigratedLeadsBucket,
} = leadController;

const router = express.Router();

/**
 * 🛠 Utility function to handle async routes gracefully.
 * Ensures proper error handling and prevents repetitive try-catch blocks.
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    logger.info(`🚀 ${req.method} ${req.url} - Processing request`);
    await fn(req, res);
    logger.info(`✅ ${req.method} ${req.url} - Request successful`);
  } catch (error) {
    logger.error(`❌ ${req.method} ${req.url} - Error: ${error.message}`);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
      status: error.status || 500,
    });
  }
};

/**
 * 🧪 Health Check Route
 * Confirms the Leads API is accessible.
 */
router.get("/", (req, res) => {
  logger.info("🟢 /leads - Health check route hit");
  res.send("You are in leads");
});

/**
 * 📌 Lead Search
 * Searches for leads based on parameters.
 */
router.post("/search", asyncHandler(Search));

/**
 * 📊 Get Contact Total Count
 * Retrieves total count of contacts.
 */
router.post("/contacttotalcount", asyncHandler(contacttotalcount));

/**
 * 🔍 Filter Values
 * Retrieves filter options for leads.
 */
router.post("/filterValues", asyncHandler(FilterValues));

/**
 * 📈 Lead Count
 * Fetches the total lead count.
 */
router.post("/leadCount", asyncHandler(LeadCount));

/**
 * 🏆 Stage Count
 * Retrieves the count of leads in each stage.
 */
router.post("/stageCount", asyncHandler(StageCount));

/**
 * ➕ Insert Lead
 * Creates a new lead.
 */
router.post("/insert", asyncHandler(Create));

/**
 * 🔄 Update Call Time
 * Updates the call time of a lead.
 */
router.post("/updateCallTime", asyncHandler(callTimeUpdate));

/**
 * ✍️ Update Lead Data
 * Modifies lead details.
 */
router.post("/updateData", asyncHandler(updateData));

/**
 * 🔄 Bulk Create Leads
 * Inserts multiple leads at once.
 */
router.post("/bulkCreate", asyncHandler(bulkCreate));

/**
 * ✏️ Bulk Update Leads
 * Updates multiple leads simultaneously.
 */
router.post("/bulkUpdate", asyncHandler(bulkUpdate));

/**
 * ❌ Delete Lead
 * Removes a lead from the database.
 */
router.post("/deleteData", asyncHandler(deleteData));

/**
 * 📊 Feedback Report
 * Generates feedback reports based on type.
 */
router.post("/feedbackReport/:type", asyncHandler(feedbackReport));

/**
 * 📢 Callback Reason Report
 * Retrieves callback reasons for leads.
 */
router.post("/callbackreasonReport/:type", asyncHandler(callBackReasonReport));

/**
 * 🔥 Interested Leads Report
 * Fetches leads who have shown interest.
 */
router.post("/interestedReport/:type", asyncHandler(InterestedReport));

/**
 * 🔥 Optimized Interested Leads Report
 * Fetches leads with optimized filtering.
 */
router.post(
  "/interestedReportOptimized/:type",
  asyncHandler(InterestedReportOptimized)
);

/**
 * 📌 Reason Report
 * Retrieves reasons why leads moved stages.
 */
router.post("/reasonReport/:type", asyncHandler(ReasonReport));

/**
 * 📋 Task Search
 * Searches for tasks associated with leads.
 */
router.post("/taskSearch", asyncHandler(TaskSearch));

/**
 * 📌 Task Stage Count
 * Retrieves the count of tasks in each stage.
 */
router.post("/taskStageCount", asyncHandler(TaskStageCount));

/**
 * 🔎 Drill Down Search
 * Performs a detailed drill-down search on leads.
 */
router.post("/drillDownSearch", asyncHandler(DrillDownSearch));

/**
 * 🔄 Resolve Missing Data
 * Identifies and resolves missing lead data.
 */
router.post("/resolveMissData", asyncHandler(ResolveMissData));

/**
 * 🔍 Get Duplicate Leads
 * Identifies duplicate leads.
 */
router.post("/getDuplicateLeads", asyncHandler(GetDuplicateLeads));

/**
 * ❌ Delete Duplicate Leads
 * Removes duplicate leads from the system.
 */
router.post("/deleteDuplicate", asyncHandler(deleteDuplicate));

/**
 * ❌ Delete Duplicate Owner
 * Removes duplicate leads with owner verification.
 */
router.post("/deleteDuplicateOwner", asyncHandler(deleteDuplicateOwner));

/**
 * 🆕 Get Not Worked Fresh Leads
 * Retrieves fresh leads that haven't been worked on.
 */
router.post("/getNotWorkedFreshLeads", asyncHandler(GetNotWorkedFreshLeads));

/**
 * 🔎 Check If Lead Exists
 * Confirms whether a lead exists in the system.
 */
router.post("/checkIfLeadExists", asyncHandler(CheckIfLeadExists));

/**
 * 📊 Retrieve Missed Count Reports
 * Fetches various missed lead count statistics.
 */
router.get("/missCount", asyncHandler(missCount));
router.get("/homissCount1", asyncHandler(HO_missCount1));
router.get("/homissCount2", asyncHandler(HO_missCount2));
router.get("/homissCount3", asyncHandler(HO_missCount3));

/**
 * 📊 Generate Reports
 * Creates detailed lead reports.
 */
router.post("/reports", asyncHandler(Reports));

/**
 * 🚀 Lead Migration APIs
 * Handles migration-related lead functions.
 */
router.post("/createLeadNew", asyncHandler(CreateLeadNew));
router.post("/editLeadNew", asyncHandler(EditLeadNew));
router.post("/checkContactExistsNew", asyncHandler(CheckContactExistsNew));
router.post("/getLeadDetails", asyncHandler(GetLeadDetails));
router.post("/deleteMultipleLeads", asyncHandler(DeleteMultipleLeads));
router.post("/bulkUpdateLeads", asyncHandler(BulkUpdateLeads));
router.post("/transferLeadsNew", asyncHandler(TransferLeadsNew));
router.post(
  "/checkIfFieldExistsInLeads",
  asyncHandler(CheckIfFieldExistsInLeads)
);
router.post("/updateReenquiredLeads", asyncHandler(UpdateReenquiredLeads));
router.post("/appSearch", asyncHandler(AppSearch));
router.post("/appFilterValues", asyncHandler(AppFilterValues));
router.get("/fetchLeadByMBContactId", asyncHandler(fetchLeadByMBContactId));
router.get("/showMigratedLeadsBucket", asyncHandler(ShowMigratedLeadsBucket));

module.exports = router;
