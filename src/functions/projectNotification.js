const {sendNotificationsToMultipleUsersWithPayLoad}=require("./sendNotification")
const userModel=require("../models/userSchema")
exports.sendNotificationForNewProject=async(orgId)=>{
    try {
      const allUserArray = await userModel.find({ organization_id: orgId, profile: { $in: ["Team Lead", "Sales"] }, status: "ACTIVE" }, {
        fcm_token: 1,
        _id: 0
    });
  
    const fcmArray = allUserArray
          .map(item => item.fcm_token)
          .filter(token => token !== null && token !== undefined && token !== '');
  
  
          if(fcmArray.length===0){
            return true;
          }
  
    await sendNotificationsToMultipleUsersWithPayLoad(fcmArray,"New Listing Alert!","A New Project’s Listing has been added. Check Out Now !🚀 📢",{isProject:String("true")})     
    
    return true;
    } catch (error) {
      console.log("error on sending notification while creating listing",error.message);
      return false;
    }
  }