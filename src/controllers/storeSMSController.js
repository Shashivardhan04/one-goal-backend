const storeSMSModel = require("../models/storeSMSSchema.js")

const storeSMSController = {};

storeSMSController.storeSMS = async (req, res) => {
  try {
    let data = req.body;
console.log("HNHTYEHYN",data)
    if(data.mobile_number === undefined){
        return res.status(400).json({
            success: false,
            message: "Mobile number field cannot be empty",
          });
    }
    if(data.uid === undefined){
        return res.status(400).json({
            success: false,
            message: "Uid field cannot be empty",
          });
    }
    if(data.organization_id === undefined){
        return res.status(400).json({
            success: false,
            message: "Organization field cannot be empty",
          });
    }
    if(data.sms_data === undefined){
        return res.status(400).json({
            success: false,
            message: "Please enter sms data",
          });
    }

    const storeMongoSms = await new storeSMSModel({
        uid:data.uid,
        organization_id:data.organization_id,
        mobile_number:data.mobile_number,
        sms_data:data.sms_data,
    })

    await storeMongoSms.save()


    return res.status(200).json({
      success: true,
      message: "Data Updated Successfully",
    //   data: data,
    });
  } catch (error) {
    console.log("An error occurred while fetching user permissions", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred while fetching user permissions",
      error: error.message,
    });
  }
};


module.exports = storeSMSController;