const notificationContentController = {};

notificationContentController.notificationContent = async (req, res) => {
  try {
    let data = req.body;
    console.log("AWF#AG A#$",data)
    switch (data.condition) {
      case "Call Back":
        res.status(200).json({
          title: "🔔 Call Back Reminder",
          message: `Call ${data.name} at ${data.time}`
        });
        break;
      case "Meeting":
        res.status(200).json({
          title: "🔔 Meeting Reminder",
          message: `Don't forget your meeting with ${data.name} at ${data.time}`,
        });
        break;
      case "Site Visit":
        res.status(200).json({
          title: "⏰ Site Visit Coming Up",
          message: `Be ready for your site visit with ${data.name} at ${data.location} on ${data.time}`,
        });
        break;
      case "Lead Request":
        res.status(200).json({
          title: "Lead Request",
          message: `${data.name} is requesting for leads`,
        });
        break;
      case "Live Tracking Enabled":
        res.status(200).json({
          title: "Live Tracking Enabled",
          message: `${data.name} has enabled the live tracking.`,
        });
        break;
      case "Live Tracking Disabled":
        res.status(200).json({
          title: "Live Tracking Disabled",
          message: `${data.name} has disabled the live tracking.`,
        });
        break;
      default:
        res.status(200).json({
          title: "",
          message: ``,
        });
        break;
    }
  } catch (err) {
    console.log("Error", err);
    res
      .status(400)
      .json({ success: false, error: err.message || "Unexpected error occured" });
  }
};

module.exports = notificationContentController;
