const Notification = require('../models/notificationModel');
const moment = require('moment');
const {sendNotifications}=require("../functions/sendNotification")
const {MESSAGES}=require("../constants/constants")
const {getTimeDifferenceInSeconds}=require("../constants/constants.js")

const notificationController = {};

notificationController.addNewNotification = async (req, res) => {
  let data = req.body;
  if(data.uid && data.organization_id && data.notification_description && data.notification_title && data.date){
    try {
      let newNotification = new Notification({
        uid: data.uid,
        organization_id: data.organization_id,
        notification_description: data.notification_description,
        notification_title: data.notification_title,
        date: data.date
      });

      newNotification = await newNotification.save();

      return res.status(200).json({"success": true,data:newNotification});
    } catch (error) {
      return res.status(400).json({"success": false,"error":error.message});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }
};

notificationController.deleteNotification = async (req, res) => {
  const { id } = req.body;

  try {
    const notification = await Notification.findById(id);

    if (!notification) {
      res.send('No notification model found with that ID.');
    }

    await notification.remove();

    res.send('Deleted notification model');
  } catch (error) {
    console.log(error);
    res.send({ error });
  }
};

notificationController.updateNotifications = async (req, res) => {
  const { id, leadIds } = req.body;

  try {
    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        $addToSet: { leadIds: { $each: leadIds } },
      },
      { new: true }
    );

    if (!notification) {
      res.send('No notification model found with that ID.');
    }

    res.send('Updated notification model');
  } catch (error) {
    console.log(error);
    res.send({ error });
  }
};

notificationController.getNotifications = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  let data = req.body;
  if(data.uid){
    try{
      const query = {
        uid: data.uid,
      };
      
      const result = await Notification.find(query).sort({date:-1});
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /notification/get, time taken for checking notificationCollection Query, ${timeTakenQuery1}`);

      let apiEnd = new Date();
  timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
  console.log(`api endpoint - /notification/get, time taken overall, ${timeTakenOverall}`);

      return res.status(200).json({"success": true,data:result});
    }catch(err){
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }
}

////////////////////notification firebase to mongodb ///////////////////////////////////

notificationController.sendNotifications=async(req,res)=>{
  try {
    const data = req.body;
    await sendNotifications(data);
    return res.status(200).json({
      success:true,
      message:"Notification sent successfully"
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message
    })
  }
}

module.exports = notificationController;
