const {sendNotificationToSingleUserWithPayLoad}=require("./sendNotification")
const userModel=require("../models/userSchema")
exports.senNotificationWon=async(uid,leadId)=>{
    try {
      const user = await userModel.findOne({uid:uid},{reporting_to:1,user_first_name:1,user_last_name:1}).lean();

        if(!user){
            return false;
        }

        const notifyUser= await userModel.findOne({user_email:user.reporting_to},{fcm_token:1,_id:0}).lean();

        if(!notifyUser){
            return false;
        }

        const Name=user.user_first_name+" "+user.user_last_name;
  
        if(notifyUser.fcm_token !== null && notifyUser.fcm_token !== undefined && notifyUser.fcm_token !== '') {
            await sendNotificationToSingleUserWithPayLoad(notifyUser.fcm_token,`Congratulations ${Name} !`," 🎊 Another sale closed by your team! Keep up the great work! 🌟",  {
              Id: String(leadId),  // Wrap leadId in an object and ensure it's a string
              isWon:String("true")
            }) 
        }   
    
    return true;
    } catch (error) {
      console.log("error on sending notification while creating listing",error.message);
      return false;
    }
  }