const jwt = require('jsonwebtoken');
const userModel = require('../models/userSchema');

const authMiddleware = async (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(401).json({ success: false, message: "Your Session has Expired, please Login again!" });
  }

  try {
    if(token == process.env.newaccesstokeninheader){
      next();
    }
    else{
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await userModel.findOne({ uid: decoded.uid });

      if (!user) {
        return res.status(401).json({ success: false, message: "User not found!" });
      }

      if (user.status == "INACTIVE") {
        return res.status(402).json({ success: false, message: "User is Inactive, Please contact your admin" });
      }

      // Check session ID
      if (user.session_id !== decoded.session_id || user.device_type !== decoded.device_type) {
        return res.status(401).json({ success: false, message: "Your Session has Expired, please Login again!" });
      }

      req.user = user;
      next();
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: "Your Session has Expired, please Login again!", error: error.message });
  }
};

module.exports = authMiddleware;
