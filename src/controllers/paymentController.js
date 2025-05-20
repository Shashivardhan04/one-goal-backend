var ObjectId = require("mongoose").Types.ObjectId;
const paymentModel = require("../models/paymentSchema");
const userModel = require("../models/userSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const logger = require("../services/logger");
// const { verifyBody } = require("../createinvoice/utils");
// const { getInvoice } = require("../createinvoice/invoice");

const paymentController = {};

const datesField = [
  "verified_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
];

const booleanField = ["associate_status", "source_status", "transfer_status"];

/**
 * ➕ Create Payment Order
 * Initiates a new payment order and returns order details.
 */
paymentController.Create = async (req, res) => {
  try {
    /** 🛑 Validate required fields */
    const { amount, currency } = req.body;
    if (!amount || !currency) {
      logger.warn("⚠️ Missing required payment fields");
      return res.status(400).json({
        success: false,
        message: "Amount and currency are required",
        status: 400,
      });
    }

    logger.info(`📡 Creating payment order for amount: ${amount} ${currency}`);

    /** 🔒 Initialize Razorpay instance */
    const instance = new Razorpay({
      key_id: process.env.KEY_ID,
      key_secret: process.env.KEY_SECRET,
    });

    /** 🚀 Create order */
    const options = {
      amount: Number(amount * 100), // Convert to smallest currency unit
      currency,
      receipt: uuidv4(),
    };
    const order = await instance.orders.create(options);

    logger.info(`✅ Payment order created successfully: Order ID ${order.id}`);
    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      status: 200,
      order,
    });
  } catch (error) {
    logger.error(`❌ Error creating payment order: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ✅ Payment Verification
 * Verifies payment authenticity and updates transaction records.
 */
paymentController.Verification = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      uid,
      contact_no,
      contact_owner_email,
      organization_id,
      amount,
      currency,
      receipt,
      invoice_no,
      company,
      email,
      address,
      transaction_date,
      due_date,
      paymentFrom,
      paymentTill,
      units,
      igst,
      items,
    } = req.body;

    /** 🛑 Validate required fields */
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logger.warn("⚠️ Missing required payment verification fields");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Verifying payment ID: ${razorpay_payment_id}`);

    /** 🔒 Verify payment signature */
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    /** 🔍 Fetch payment details */
    const instance = new Razorpay({
      key_id: process.env.KEY_ID,
      key_secret: process.env.KEY_SECRET,
    });
    const payment = await instance.payments.fetch(razorpay_payment_id);

    /** 🚀 Determine payment status and update database */
    const paymentStatus =
      isAuthentic && payment?.status !== "failed" ? "SUCCESS" : "FAILED";

    await paymentModel.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      uid,
      contact_no,
      amount,
      currency,
      receipt,
      contact_owner_email,
      organization_id,
      status: paymentStatus,
      invoice_no,
      company,
      email,
      address,
      transaction_date,
      due_date,
      paymentFrom,
      paymentTill,
      units,
      igst,
      items,
    });

    logger.info(
      `✅ Payment verification completed with status: ${paymentStatus}`
    );
    return res.status(paymentStatus === "SUCCESS" ? 200 : 400).json({
      success: paymentStatus === "SUCCESS",
      message: `Payment ${paymentStatus.toLowerCase()}`,
    });
  } catch (error) {
    logger.error(`❌ Error verifying payment: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔎 Search Payment Records
 * Retrieves payment details based on search parameters.
 */
paymentController.Search = async (req, res) => {
  try {
    const {
      uid,
      filter = {},
      sort,
      searchString = "",
      page = 1,
      pageSize = 10,
    } = req.body;

    /** 🔍 Fetch user details */
    const user = await userModel.findOne({ uid });
    if (!user) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "User not found", status: 404 });
    }

    const { profile, organization_id, branchPermission } = user;

    /** 🛑 Validate required fields */
    if (!organization_id) {
      logger.warn("⚠️ Missing required fields for searching payments");
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
        status: 400,
      });
    }

    logger.info(`📡 Searching payments for UID: ${uid}`);

    /** 🔄 Process filters */
    const filterArr = Object.keys(filter).map((key) => ({
      [key]: { $in: filter[key] },
    }));

    /** 🔍 Search functionality */
    let searchConditions = [];
    searchString.split(",").forEach((search) => {
      const trimmed = search.trim();
      const re = new RegExp(trimmed, "i");
      searchConditions.push(re);
    });

    if (searchConditions.length) {
      filterArr.push({ receipt: { $in: searchConditions } });
    }

    /** 🚀 Prepare query conditions */
    let conditions = [{ organization_id }, ...filterArr];

    /** 🔄 Handle role-based filtering */
    if (["lead manager", "admin"].includes(profile.toLowerCase())) {
      const hasPermission =
        !branchPermission ||
        branchPermission.length === 0 ||
        branchPermission.includes("All");

      if (!hasPermission) {
        const usersList = await getBranchUsers(
          uid,
          organization_id,
          branchPermission
        );
        conditions.push({ uid: { $in: usersList } });
      }
    } else if (profile.toLowerCase() === "team lead") {
      const usersList = await getTeamUsers(uid, organization_id);
      conditions.push({ uid: { $in: usersList } });
    } else {
      conditions.push({ uid });
    }

    /** 🚀 Execute search query */
    const payments = await paymentModel
      .find({ $and: conditions }, { _id: 0, __v: 0 })
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    logger.info(`✅ Payment search completed successfully for UID: ${uid}`);
    return res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      status: 200,
      data: payments,
    });
  } catch (error) {
    logger.error(`❌ Error searching payments: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📄 Generate Payment Receipt PDF
 * Creates a PDF receipt for a completed transaction and sends it to the client.
 */
paymentController.CreatePdf = async (req, res) => {
  try {
    /** 🔍 Validate request body */
    const validationResult = verifyBody(req.body);

    if (!validationResult.success) {
      logger.warn("⚠️ Invalid request body for PDF generation");
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: validationResult.errors,
      });
    }

    logger.info("📡 Generating invoice PDF");

    /** 🚀 Generate PDF */
    const pdf = await getInvoice(req.body);

    /** 🛑 Handle missing PDF */
    if (!pdf) {
      logger.warn("⚠️ Failed to generate invoice PDF");
      return res
        .status(500)
        .json({ success: false, message: "PDF generation failed" });
    }

    logger.info("✅ PDF successfully generated");
    res.status(200).contentType("application/pdf").send(pdf);
  } catch (error) {
    logger.error(`❌ Error generating invoice PDF: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

/**
 * 📊 Get Payment Data
 * Fetches total payments verified within the current month and year.
 */
paymentController.Get = async (req, res) => {
  try {
    logger.info("📡 Fetching total payments for the current month");

    /** 🗓 Get current month and year */
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const dateString = `${currentMonth}-${currentYear}`;

    /** 🚀 Retrieve payment records */
    const payments = await paymentModel.find({}, "verified_at amount").lean();

    /** 🔄 Aggregate total payment amount for the current month */
    const totalAmount = payments.reduce((total, { verified_at, amount }) => {
      const paymentMonth = verified_at.getMonth() + 1;
      const paymentYear = verified_at.getFullYear();
      return `${paymentMonth}-${paymentYear}` === dateString
        ? total + Number(amount)
        : total;
    }, 0);

    logger.info(`✅ Total payments for ${dateString}: ${totalAmount}`);
    return res.status(200).json({
      success: true,
      message: "Total payments retrieved",
      status: 200,
      totalAmount,
    });
  } catch (error) {
    logger.error(`❌ Error fetching total payments: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = paymentController;
