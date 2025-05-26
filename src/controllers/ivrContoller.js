const qs = require("qs");
const axios = require("axios");

const ivrController = {};

/**
 * 📞 Soil Search IVR Insert
 * Processes IVR request, extracts necessary data, and sends a lead creation request.
 */
ivrController.soilSearchIvrInsert = async (req, res) => {
  try {
    /** 🔄 Extract query parameters */
    const splittedUrl = req.url.split("?");
    const reqDataWithToken = qs.parse(splittedUrl[1] || "");
    const reqDataWithData = qs.parse(splittedUrl[2] || "");

    /** 🛑 Validate required fields */
    const { token } = reqDataWithToken;
    const {
      SourceNumber: contact_no,
      DialWhomNumber: associate_contact,
      CallDuration: duration,
      CallRecordingUrl: voice_url,
    } = reqDataWithData;

    if (
      !token ||
      !contact_no ||
      !associate_contact ||
      !duration ||
      !voice_url
    ) {
      logger.warn("⚠️ Missing required parameters for IVR lead creation");
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        status: 400,
      });
    }

    logger.info(
      `📡 Processing IVR lead creation for Contact Number: ${contact_no}`
    );

    /** 💾 Prepare request body */
    const bodyData = {
      contact_no,
      associate_contact,
      duration,
      voice_url,
      customer_name: "IVR",
      token,
    };

    /** 🚀 Send lead creation request */
    const { data } = await axios.post(
      "https://api.read-pro.com/createContacts",
      bodyData
    );

    logger.info(
      `✅ IVR lead created successfully for Contact Number: ${contact_no}`
    );
    return res
      .status(200)
      .json({ success: true, message: data.message, status: 200 });
  } catch (error) {
    logger.error(`❌ Error creating IVR lead: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "IVR lead couldn't be created",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = ivrController;
