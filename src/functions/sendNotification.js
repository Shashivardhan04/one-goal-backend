const admin=require("../../firebaseAdmin")
const moment=require("moment")
const Notification = require("../models/notificationModel");
const userModel = require("../models/userSchema");  
const createNotification = async (uid, notification_title, notification_description, organization_id) => {
    let date = moment();
    if (uid && organization_id && notification_description && notification_title && date) {
      try {
        let newNotification = new Notification({
          uid: uid,
          organization_id: organization_id,
          notification_description: notification_description,
          notification_title: notification_title,
          date: date
        });
  
        newNotification = await newNotification.save();
      } catch (error) {
        throw error;
      }
    }
  };
exports.sendNotifications = async function (request) {
  try {
    Object.keys(request.notifications).forEach(async (uid) => {
      let user = await userModel.findOne({ uid });
      let userFcmToken = user?.fcm_token ? user?.fcm_token : "";
      if (userFcmToken) {
        const message = {
          token: userFcmToken,  // Ensure the token is correctly set for single device
          notification: {
            title: request.title,
            body: request.notifications[uid],
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                contentAvailable: false,
              },
            },
          },
        };
        await createNotification(uid, request.title, `${request.notifications[uid]}`, request.organization_id);

        // Send the message to a single device
        await admin.messaging().send(message);
        // if (user["fcm_token"] && user["fcm_token"] !== "") {
        //   await admin.messaging().sendToDevice(
        //     user["fcm_token"],
        //     {
        //       notification: {
        //         title: request.title,
        //         body: request.notifications[uid],
        //         sound: "default",
        //       },
        //       data: request.data
        //     },
        //     { contentAvailable: false, priority: "high" }
        //   );
        //   await createNotification(uid, request.title, `${request.notifications[uid]}`, request.organization_id);
        // }
      }
    });
    return;
  } catch (error) {
    console.log("fcm notification not sent",error);
  }
};
  
exports.sendNotificationsToMultipleUsers = async (fcmTokensArray, title, body) => {
  try {
    const chunkSize = 500; // FCM limit for tokens at a time
    const messageChunks = [];
    
    // Split the fcmTokensArray into chunks of 500
    for (let i = 0; i < fcmTokensArray.length; i += chunkSize) {
      const chunk = fcmTokensArray.slice(i, i + chunkSize);
      messageChunks.push(chunk);
    }

    // Loop through each chunk and send the notification
    for (let chunk of messageChunks) {
      const message = {
        notification: {
          title: title,
          body: body
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              contentAvailable: false,
            },
          },
        },
        tokens: chunk // Use the chunked array of FCM tokens
      };
      
      // Send the notification to this chunk
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Notification sent to chunk: ${response.successCount} messages sent successfully, ${response.failureCount} failed.`);
    }
  } catch (err) {
    console.log("FCM notification not sent", err);
  }
};

exports.sendNotificationsToMultipleUsersWithPayLoad = async (fcmTokensArray, title, body,data) => {
  try {
    data["title"]=title
       data["body"]=body
       data["silentNotification"]="true"
    const chunkSize = 500; // FCM limit for tokens at a time
    const messageChunks = [];
    
    // Split the fcmTokensArray into chunks of 500
    for (let i = 0; i < fcmTokensArray.length; i += chunkSize) {
      const chunk = fcmTokensArray.slice(i, i + chunkSize);
      messageChunks.push(chunk);
    }

    // Loop through each chunk and send the notification
    for (let chunk of messageChunks) {
      
      const message = {
        // notification: {
        //   title: title,
        //   body: body
        // },
        data:data,
        android: {
          priority: "high",
          // notification: {
          //   sound: "default",
          // },
        },
        apns: {
          payload: {
            aps: {
              // sound: "default",
              contentAvailable: true,
            },
          },
        },
        tokens: chunk // Use the chunked array of FCM tokens
      };
      
      // Send the notification to this chunk
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Notification sent to chunk: ${response.successCount} messages sent successfully, ${response.failureCount} failed.`);
    }
  } catch (err) {
    console.log("FCM notification not sent", err);
  }
};
  
  exports.sendNotificationToSingleUser = async (fcmToken,title,body) => {
    try{

      console.log("leadId Rishab",typeof leadId)
      const message = {
        token: fcmToken,  // Ensure the token is correctly set for single device
        notification: {
          title: title,
          body: body,
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              contentAvailable: false,
            },
          },
        },
      };
      
      // Send the message to a single device
      await admin.messaging().send(message);
    }catch(err){
      console.log("fcm notification not sent",err);
    }
  } 

  exports.sendNotificationToSingleUserWithPayLoad = async (fcmToken,title,body,data) => {
    try{
       data["title"]=title
       data["body"]=body
       data["silentNotification"]="true"
      // console.log("leadId Rishab",typeof leadId)
      const message = {
        token: fcmToken,  // Ensure the token is correctly set for single device
        // notification: {
        //   title: title,
        //   body: body,
        // },
        data:data,
        android: {
          priority: "high",
          // notification: {
          //   sound: "default",
          // },
        },
        apns: {
          payload: {
            aps: {
              // sound: "default",
              contentAvailable: true,
            },
          },
        },
      };
      
      // Send the message to a single device
      await admin.messaging().send(message);
    }catch(err){
      console.log("fcm notification not sent",err);
    }
  } 


