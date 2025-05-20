var ObjectId = require("mongoose").Types.ObjectId;
const bookingModel = require("../models/bookingSchema");
const userModel = require("../models/userSchema");
const logger = require("../services/logger");
const bookingController = {};
const CryptoJS = require("crypto-js");
require("dotenv").config();

// Function to decrypt PAN
const decryptPAN = (encryptedPAN) => {
  const secretKey = process.env.REACT_APP_SECRET_KEY; // Must match the key used in React
  //   console.log("efnuernferfjenrfjnerj",secretKey
  //   )
  const bytes = CryptoJS.AES.decrypt(encryptedPAN, secretKey);
  const decryptedPAN = bytes.toString(CryptoJS.enc.Utf8);
  return decryptedPAN;
};

const validatePAN = (pan) => {
  const panPattern = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/;
  if (typeof pan !== "string") {
    return false;
  }
  return panPattern.test(pan.toUpperCase());
};

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
];
const booleanField = ["associate_status", "source_status", "transfer_status"];
//post data in booking
/**
 * ➕ Create Booking
 * Inserts a new booking record with validation and logging.
 */
bookingController.Create = async (req, res) => {
  try {
    const {
      organization_id,
      uid,
      booking_details,
      reporting_to,
      branch,
      team,
      location,
      project,
      contact_no,
      contact_details,
      notes,
      attachments,
      call_logs,
    } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !uid || !booking_details?.booking_id) {
      logger.warn("⚠️ Missing required booking fields");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Creating booking for UID: ${uid}`);

    /** 🔄 Validate PAN */
    const isPANValid = validatePAN(booking_details?.pan_card);
    const panValue = isPANValid
      ? booking_details?.pan_card
      : decryptPAN(booking_details?.pan_card);

    /** 🔍 Fetch user details */
    const user = await userModel.findOne({ uid });
    if (!user) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "User not found", status: 404 });
    }

    const { profile, user_email } = user;

    /** 🚀 Create new booking record */
    const bookingData = new bookingModel({
      organization_id,
      uid,
      reporting_to,
      branch,
      team,
      location,
      project,
      contact_no,
      contactDetails: contact_details,
      notes,
      attachments,
      callLogs: call_logs,
      bookingDetails: [
        {
          booking_id: booking_details?.booking_id,
          date_booking: new Date(booking_details?.date_booking),
          developer_name: booking_details?.developer_name,
          declaration: booking_details?.declaration,
          project_name: booking_details?.project_name,
          area: booking_details?.area,
          area_type: booking_details?.area_type,
          unit_no: booking_details?.unit_no,
          source_fund: booking_details?.source_fund,
          scheme: booking_details?.scheme,
          pan_card: panValue,
          booking_attachmentS3: booking_details?.booking_attachmentS3,
          Kyc_attachmentS3: booking_details?.Kyc_attachmentS3,
          video_kyc: booking_details?.video_kyc,
          status: booking_details?.status,
          created_at: new Date(),
          profile,
          user_email,
        },
      ],
      created_at: new Date(),
    });

    /** 🚀 Save booking data */
    await bookingData.save();

    logger.info(`✅ Booking successfully created for UID: ${uid}`);
    return res.status(201).json({
      success: true,
      message: "Booking successfully created",
      status: 201,
      data: bookingData,
    });
  } catch (error) {
    logger.error(
      `❌ Error creating booking for UID ${req.body.uid}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update Booking
 * Updates an existing booking record with structured validation and logging.
 */
bookingController.Update = async (req, res) => {
  try {
    const { organization_id, uid, contact_no, booking_details } = req.body;

    /** 🛑 Validate required fields */
    if (
      !organization_id ||
      !uid ||
      !contact_no ||
      !booking_details?.booking_id
    ) {
      logger.warn("⚠️ Missing required booking fields");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Updating booking for UID: ${uid}`);

    /** 🔍 Fetch user details */
    const user = await userModel.findOne({ uid });
    if (!user) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "User not found", status: 404 });
    }

    const { profile } = user;

    /** 🚀 Prepare booking update object */
    const { date_booking, booking_id, ...updateFields } = booking_details;
    const formattedBooking = {
      ...updateFields,
      date_booking: new Date(date_booking),
      booking_id,
    };

    /** 🔍 Fetch existing booking data */
    const existingBooking = await bookingModel.findOne({
      organization_id,
      uid,
      contact_no,
    });
    if (!existingBooking) {
      logger.warn(`⚠️ Booking not found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "Booking not found", status: 404 });
    }

    let updatedBookingDetails;

    /** 🔄 Handle profile-specific update logic */
    if (
      ["lead manager", "admin", "team lead"].includes(profile.toLowerCase())
    ) {
      updatedBookingDetails = [
        ...existingBooking.bookingDetails,
        formattedBooking,
      ];
    } else if (profile.toLowerCase() === "operation manager") {
      updatedBookingDetails = existingBooking.bookingDetails.map((booking) =>
        booking.booking_id === booking_id
          ? { ...booking, ...formattedBooking }
          : booking
      );
    } else {
      updatedBookingDetails = [
        ...existingBooking.bookingDetails,
        formattedBooking,
      ];
    }

    /** 🚀 Execute update */
    await bookingModel.findOneAndUpdate(
      { organization_id, uid, contact_no },
      { bookingDetails: updatedBookingDetails },
      { new: true }
    );

    logger.info(`✅ Booking updated successfully for UID: ${uid}`);
    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating booking for UID ${req.body.uid}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔍 Get Branch Users
 * Retrieves all users in the specified branches along with the requesting UID.
 */
const getBranchUsers = async (uid, organization_id, permission) => {
  try {
    /** 🛑 Validate required parameters */
    if (
      !uid ||
      !organization_id ||
      !Array.isArray(permission) ||
      permission.length === 0
    ) {
      logger.warn("⚠️ Invalid parameters passed to getBranchUsers");
      return [uid];
    }

    logger.info(
      `📡 Fetching branch users for Organization ID: ${organization_id}`
    );

    /** 🚀 Query users belonging to the specified branches */
    const users = await userModel
      .find({ organization_id, branch: { $in: permission } })
      .select("uid -_id");

    /** 🔄 Extract user UIDs */
    const usersList = [uid, ...users.map((user) => user.uid)];

    logger.info(
      `✅ Retrieved ${usersList.length} branch users for Organization ID: ${organization_id}`
    );

    return usersList;
  } catch (error) {
    logger.error(`❌ Error fetching branch users: ${error.message}`);
    return [uid]; // Fallback to returning only the requester UID
  }
};

/**
 * 🔍 Get Team Users
 * Retrieves all users reporting to the specified UID within the organization.
 */
const getTeamUsers = async (uid, organization_id) => {
  try {
    /** 🛑 Validate required parameters */
    if (!uid || !organization_id) {
      logger.warn("⚠️ Invalid parameters passed to getTeamUsers");
      return [uid];
    }

    logger.info(
      `📡 Fetching team users for Organization ID: ${organization_id}`
    );

    /** 🚀 Query users within the organization */
    const users = await userModel
      .find({ organization_id })
      .select("uid reporting_to user_email -_id");

    /** 🔍 Find the requesting user */
    const requestingUser = users.find((user) => user.uid === uid);
    if (!requestingUser) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return [uid];
    }

    /** 🔄 Create mapping of reporting relationships */
    const reportingToMap = users.reduce((map, user) => {
      if (user.reporting_to) {
        map[user.reporting_to] = map[user.reporting_to] || [];
        map[user.reporting_to].push({
          user_email: user.user_email,
          uid: user.uid,
        });
      }
      return map;
    }, {});

    /** 🚀 Recursive function to gather team users */
    const usersList = [requestingUser.uid];
    const createUsersList = (email, data) => {
      if (!data[email]) return;

      data[email].forEach((user) => {
        if (!usersList.includes(user.uid)) {
          usersList.push(user.uid);
          createUsersList(user.user_email, data);
        }
      });
    };

    createUsersList(requestingUser.user_email, reportingToMap);

    logger.info(
      `✅ Retrieved ${usersList.length} team users for Organization ID: ${organization_id}`
    );

    return usersList;
  } catch (error) {
    logger.error(`❌ Error fetching team users: ${error.message}`);
    return [uid]; // Fallback to returning only the requester UID
  }
};

/**
 * 📋 Get Booking List
 * Retrieves a filtered, paginated list of bookings.
 */
bookingController.BookingList = async (req, res) => {
  try {
    const {
      uid,
      filter = {},
      bookingFilter: arrFilter = {},
      missed,
      searchString = "",
      sort,
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
      logger.warn("⚠️ Missing required fields for fetching booking list");
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
        status: 400,
      });
    }

    logger.info(`📡 Fetching booking list for UID: ${uid}`);

    /** 🔄 Process filters */
    let report = [];
    let cond = false;

    Object.keys(filter).forEach((key) => {
      if (Array.isArray(filter[key]) && filter[key].length === 2) {
        filter[key] = {
          $gte: new Date(filter[key][0]),
          $lte: new Date(filter[key][1]),
        };
      } else if (key === "reporting_to") {
        report = filter[key];
        cond = true;
        delete filter[key];
      } else {
        filter[key] = { $in: filter[key] };
      }
    });

    Object.keys(arrFilter).forEach((key) => {
      arrFilter[key] = { $in: arrFilter[key] };
    });

    /** 🔎 Handle missed follow-ups */
    if (missed) {
      filter["next_follow_up_date_time"] = { $lt: new Date() };
    }

    /** 🔍 Search functionality */
    const contact_list = [];
    const customer_name_list = [];

    searchString.split(",").forEach((search) => {
      const trimmed = search.trim();
      const re = new RegExp(trimmed, "i");
      /^\d+$/.test(trimmed)
        ? contact_list.push(re)
        : customer_name_list.push(re);
    });

    if (contact_list.length) filter["contact_no"] = { $in: contact_list };
    if (customer_name_list.length)
      filter["customer_name"] = { $in: customer_name_list };

    /** 🔍 Fetch reporting users */
    let reportingUsers = await userModel
      .find({ reporting_to: { $in: report } })
      .select("uid -_id");
    reportingUsers = reportingUsers.map(({ uid }) => uid);

    /** 🚀 Fetch booking data */
    let find = cond
      ? { organization_id, ...filter, uid: { $in: reportingUsers } }
      : { organization_id, ...filter };
    let bookings = await bookingModel
      .find(find)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    logger.info(`✅ Booking list retrieved successfully for UID: ${uid}`);
    return res.status(200).json({
      success: true,
      message: "Booking list retrieved successfully",
      status: 200,
      data: bookings,
    });
  } catch (error) {
    logger.error(`❌ Error fetching booking list: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔍 Get Booking Details
 * Retrieves details of a specific booking by `booking_id`, or confirms if a booking exists.
 */
bookingController.Details = async (req, res) => {
  try {
    const { uid, organization_id, contact_no, booking_id } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !contact_no) {
      logger.warn("⚠️ Missing required fields for fetching booking details");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Fetching booking details for Contact No: ${contact_no}`);

    /** 🔍 Retrieve booking details */
    const booking = await bookingModel
      .findOne({ organization_id, contact_no })
      .lean();

    if (!booking) {
      logger.warn(`⚠️ No booking found for Contact No: ${contact_no}`);
      return res
        .status(404)
        .json({ success: false, message: "Booking not found", status: 404 });
    }

    /** 🔄 Handle response based on `booking_id` existence */
    if (booking_id) {
      const filteredBookingData = booking.bookingDetails?.filter(
        (item) => item.booking_id === booking_id
      );
      logger.info(
        `✅ Booking details fetched successfully for Booking ID: ${booking_id}`
      );
      return res.status(200).json({
        success: true,
        message: "Booking details retrieved",
        status: 200,
        data: filteredBookingData,
      });
    }

    /** ✅ Confirm booking exists */
    return res
      .status(200)
      .json({ success: true, message: "Booking exists", status: 200 });
  } catch (error) {
    logger.error(`❌ Error fetching booking details: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ❌ Delete Booking
 * Removes a booking record by its `_id`.
 */
bookingController.Delete = async (req, res) => {
  try {
    const { id } = req.query;

    /** 🛑 Validate required fields */
    if (!id) {
      logger.warn("⚠️ Missing required booking ID for deletion");
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
        status: 400,
      });
    }

    logger.info(`📡 Deleting booking with ID: ${id}`);

    /** 🚀 Execute deletion */
    const deletedBooking = await bookingModel.findOneAndDelete({ _id: id });

    /** 🛑 Handle case where booking is not found */
    if (!deletedBooking) {
      logger.warn(`⚠️ Booking not found for ID: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "Booking not found", status: 404 });
    }

    logger.info(`✅ Booking deleted successfully for ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(
      `❌ Error deleting booking ID ${req.query.id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📊 Get Booking Count
 * Retrieves the total number of bookings with filtering options.
 */
bookingController.BookingCount = async (req, res) => {
  try {
    const { uid, filter = {} } = req.body;

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
      logger.warn("⚠️ Missing required fields for fetching booking count");
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
        status: 400,
      });
    }

    logger.info(`📡 Fetching booking count for UID: ${uid}`);

    /** 🔄 Prepare filtering conditions */
    let conditions = [{ organization_id }];
    let filterArr = [];

    Object.keys(filter).forEach((key) => {
      filterArr.push({ [key]: { $in: filter[key] } });
    });

    /** 🚀 Prepare aggregation pipeline */
    const aggregationPipeline = [
      { $match: { $and: conditions } },
      { $unwind: "$bookingDetails" },
      { $match: filterArr.length ? { $and: filterArr } : {} },
      {
        $group: {
          _id: { status: "$bookingDetails.status" },
          count: { $sum: 1 },
        },
      },
    ];

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

    /** 🚀 Execute aggregation */
    const bookingCount = await bookingModel.aggregate(aggregationPipeline);

    logger.info(`✅ Booking count retrieved successfully for UID: ${uid}`);
    return res.status(200).json({
      success: true,
      message: "Booking count retrieved successfully",
      status: 200,
      data: bookingCount,
    });
  } catch (error) {
    logger.error(`❌ Error fetching booking count: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = bookingController;
