const userModel = require("../models/userSchema");
const leadsModel = require("../models/leadsSchema");
const taskModel = require("../models/taskSchema");
const callLogsModel = require("../models/callLogsSchema");
const moment = require('moment');
const {verifyPassword, hashPassword, generateSalt} = require("../functions/authScrypt");
const userAuthorizationModel = require("../models/userAuthorizationSchema.js");
const organizationModel=require("../models/organizationSchema")
const mongoose = require("mongoose");
const {getTimeDifferenceInSeconds}=require("../constants/constants.js")
const axios = require('axios');
const {encryptPAN,decryptPAN} =require("../constants/constants");
const MB_URL = process.env.MB_URL;
const {generateRandomString,generateDefaultPassword} = require('../functions/validation.js')
const app = require("firebase");
var ObjectId = require('mongoose').Types.ObjectId;
const timestamp = app.firestore.Timestamp;

const isMobileNoValid = (mobile) => {
  // Check if the mobile number is numeric and has a length between 10 and 15
  if (!/^\d{10,15}$/.test(mobile)) {
      return "Mobile number should be of min. 10 digits. Please re-enter";
  }

  // Check if the mobile number starts with a 0
  if (mobile.startsWith("0")) {
      return "Mobile number should not start with 0. Please re-enter.";
  }

  // Check if the mobile number starts with 6, 7, 8, or 9
  if (!/^[6789]/.test(mobile)) {
      return "Invalid Mobile Number. Please re-enter";
  }

  return true;
}

const getBranchUsers = async (
  uid,
  organization_id,
  permission
) => {
  const users = await userModel.find({
    organization_id,
    branch: { $in: permission },
  },
  {uid: 1}
);
  let usersList = [uid];
  users.forEach((user) => usersList.push(user.uid));
  return usersList;
};

const getTeamUsers = async (uid, organization_id) => {
  const user = await userModel.findOne({uid});
  let reportingUsers = await userModel.find({reporting_to:user.user_email});
  let reportingUsersUids = [];
  reportingUsers.map(item => {
    reportingUsersUids.push(item.uid);
  })
  return reportingUsersUids;
  // const users = await userModel.find({ organization_id });
  // const user = users.filter((user) => user.uid === uid);
  // let reportingToMap = {};
  // let usersList = [user[0].uid];

  // users.forEach((item) => {
  //   if (item.reporting_to === "") {
  //     return;
  //   }
  //   if (reportingToMap[item.reporting_to]) {
  //     reportingToMap[item.reporting_to].push({
  //       user_email: item.user_email,
  //       uid: item.uid,
  //     });
  //   } else {
  //     reportingToMap[item.reporting_to] = [
  //       { user_email: item.user_email, uid: item.uid },
  //     ];
  //   }
  // });

  // const createUsersList = (email, data) => {
  //   if (data[email] === undefined) {
  //     return;
  //   } else {
  //     data[email].forEach((user) => {
  //       if (usersList.includes(user.uid)) {
  //         return;
  //       }
  //       usersList.push(user.uid);
  //       createUsersList(user.user_email, data);
  //     });
  //   }
  // };

  // createUsersList(user[0].user_email, reportingToMap);

  // return usersList;
};

const checkUserExistsInOrganization = async (organization_id, user_email, contact_no, employee_id) => {
  if (employee_id) {
    // Check if email, contact_no, or employee_id already exists in the organization
    const existingUser = await userModel.findOne({
      // organization_id,
      $or: [
        // { user_email },
        { contact_no },
        { employee_id }
      ]
    });

    if (existingUser) {
      return true;
    } else {
      return false;
    }
  } else {
    // Check if email, contact_no, or employee_id already exists in the organization
    const existingUser = await userModel.findOne({
      contact_no
    });

    if (existingUser) {
      return true;
    } else {
      return false;
    }
  }

}

// const checkUserExistsInReadpro = async (organization_id, user_email, contact_no, employee_id, uid) => {
//   if (employee_id) {
//     // Check if email, contact_no, or employee_id already exists in the organization
//     const existingUser = await userModel.findOne({
//       organization_id,
//        employee_id 
//     });


//     if (existingUser) {
//       if (existingUser.uid == uid) {
//         return false;
//       } else {
//         return true;
//       }
//     } else {
//       return false;
//     }
//   } else {
//     // Check if email, contact_no, or employee_id already exists in the organization
//     const existingUser = await userModel.findOne({
//       contact_no
//     });


//     if (existingUser) {
//       if (existingUser.uid == uid) {
//         return false;
//       } else {
//         return true;
//       }
//     } else {
//       return false;
//     }
//   }

// }

const checkEmployeedIdInReadpro = async (organization_id, user_email, contact_no, employee_id, uid) => {
  if (employee_id) {
    // Check if email, contact_no, or employee_id already exists in the organization
    const existingUser = await userModel.findOne({
      organization_id,
       employee_id 
    });


    if (existingUser) {
      if (existingUser.uid == uid) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  } 

}

const checkMobileNumberExistsInReadpro = async (organization_id, user_email, contact_no, employee_id, uid) => {
  if(contact_no){
    const existingUser = await userModel.findOne({
      contact_no
    });


    if (existingUser) {
      if (existingUser.uid == uid) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

}

const isValidMobile = (mobile) => {
  // Check if the mobile number is numeric and has a length between 10 and 15
  if (!/^\d{10,10}$/.test(mobile)) {
      return false
  }

  // Check if the mobile number starts with a 0
  if (mobile.startsWith("0")) {
      return false
  }

  // Check if the mobile number starts with 6, 7, 8, or 9
  if (!/^[6789]/.test(mobile)) {
      return false
  }

  return true;
}

const userController = {};

userController.Insert = async (req, res) => {
  console.log("Punit Insert Present : "+JSON.stringify(req.body));
  const newUser = new userModel({
    created_at:
      typeof req.body.created_at == "object"
        ? new timestamp(
            req.body.created_at._seconds,
            req.body.created_at._nanoseconds
          ).toDate()
        : new Date(),
    activated_at:
      typeof req.body.activated_at == "object"
        ? new timestamp(
            req.body.activated_at._seconds,
            req.body.activated_at._nanoseconds
          ).toDate()
        : new Date(),
    deactivated_at:
      typeof req.body.deactivated_at == "object"
        ? new timestamp(
            req.body.deactivated_at._seconds,
            req.body.deactivated_at._nanoseconds
          ).toDate()
        : new Date(),
    contact_no: req.body.contact_no,
    created_by: req.body.created_by,
    designation: req.body.designation,
    branch: req.body.branch,
    device_id: req.body.device_id,
    organization_id: req.body.organization_id,
    profile: req.body.profile,
    reporting_to: req.body.reporting_to,
    status: req.body.status,
    team: req.body.team,
    uid: req.body.uid,
    user_email: req.body.user_email,
    user_first_name: req.body.user_first_name,
    user_image: req.body.user_image,
    user_last_name: req.body.user_last_name,
    branchPermission: req.body.branchPermission,
    leadView: req.body.leadView,
    group_head_name:req.body.group_head_name,
    employee_id:req.body.employee_id,
    user_oid:req.body.OID,
    user_super_oid:req.body.SOID
  });
  newUser.save(function (err, doc) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      console.log("Document inserted succussfully!");
      res.send("user created");
    }
  });
};

userController.FindByUid = (req, res) => {
  console.log(req.body.uid);
  userModel.find({ uid: req.body.uid }, (err, results) => {
    if (err) {
      res.send(err);
    } else {
      res.send(results);
    }
  });
};

userController.findByOrgan_ID = (req, res) => {
  userModel.find(
    { organization_id: req.body.organizationId },
    (err, results) => {
      if (err) {
        res.send(err);
      } else {
        res.send(results);
      }
    }
  );
};

userController.updateData = (req, res) => {
  const updateData = JSON.parse(JSON.stringify(req.body));
  updateData.created_at =
    typeof updateData.created_at == "object"
      ? new timestamp(
          updateData.created_at._seconds,
          updateData.created_at._nanoseconds
        ).toDate()
      : new Date();
  updateData.activated_at =
    typeof updateData.activated_at == "object"
      ? new timestamp(
          updateData.activated_at._seconds,
          updateData.activated_at._nanoseconds
        ).toDate()
      : new Date();
  updateData.deactivated_at =
    typeof updateData.deactivated_at == "object"
      ? new timestamp(
          updateData.deactivated_at._seconds,
          updateData.deactivated_at._nanoseconds
        ).toDate()
      : new Date();
  userModel
    .findOneAndUpdate({ uid: updateData.uid }, { $set: updateData })
    .exec(function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send("Updation DONE!");
      }
    });
};

userController.GetUser = async (req, res) => {
  let data = req.body;
  if(data.uid){
    try{
      const query = {
        uid: data.uid,
      };
      
      const result = await userModel.find(query);
      if (result) {
        return res.status(200).json({ "success": true, "data": result });
      } else {
        return res.status(400).json({ "success": false, "error": "User not found" });
      }
    }catch(err){
      return res.status(400).json({"success": false,"error":err.message});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }
}

userController.GetUsersList = async (req, res) => {

  let data = req.body;
  let userQuery = {};
  let findQuery = {
    status:"ACTIVE"
  };
  if(data.uid){
    try {
      let uid = data.uid;
      let search = data.searchString
      ? data.searchString
      : "";
      // let liveTrackingStatus = data.status;
      let user_name_list = [];
      search.split(",").forEach((string) => {
        searchString = string.trim();
        const re = new RegExp(searchString, "i");
        if(searchString !== "") {
          user_name_list.push(re);
        }
      });
      if (user_name_list.length !== 0) {
        userQuery["$or"] = [
          {"user_first_name":{"$in":user_name_list}},
          {"user_last_name":{"$in":user_name_list}},
          {"user_email":{"$in":user_name_list}}
        ]
      }
      // else if(typeof liveTrackingStatus === "boolean" && liveTrackingStatus === false){
      //   userQuery["$or"] = [
      //     {is_live_tracking_active:{$exists:false}},
      //     {is_live_tracking_active:false}
      //   ]
      // }
      // else if(typeof liveTrackingStatus === "boolean" && liveTrackingStatus === true){
      //   userQuery["is_live_tracking_active"] = true;
      // }
      const resultUser = await userModel.find({ uid });
      if (resultUser.length === 0) {
        return res.status(400).json({"success": false,"error":"User Not Found"});
      }
      const user = resultUser[0];
      const profile = user.profile;
      const organization_id = user.organization_id;
      userQuery["organization_id"] = { $in: [organization_id] };
      let reportingUsers = await userModel
      .find(userQuery)
      .select("uid -_id");

      reportingUsers = reportingUsers.map(({ uid }) => uid);

      if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
        const permission = user.branchPermission;
        if (
          permission === undefined ||
          (permission && permission.length === 0) ||
          (permission && permission.includes("All"))
        ) {
          try {
            findQuery["uid"] = {
              $in:reportingUsers
            }
            // return res.status(200).json({"success": true,data:findQuery});
            let userData = await userModel.find(findQuery).limit(10);
            return res.status(200).json({"success": true,data:userData});
          } catch (error) {
            return res.status(400).json({"success": false,"error":error.message});
          }
        } else {
          let usersList = await getBranchUsers(
            uid,
            organization_id,
            permission
          );
          const interesectionArray = usersList.filter(
            (value) => reportingUsers.includes(value)
          );
          try {
            findQuery["uid"] = {
              $in:interesectionArray
            }
            let userData = await userModel.find(findQuery).limit(10);
            return res.status(200).json({"success": true,data:userData});
          } catch (error) {
            return res.status(400).json({"success": false,"error":error.message});
          }
        }
      } else if (profile.toLowerCase() == "team lead") {
        // let user = await userModel.findOne({uid:data.uid});
        // let userEmail = user?.user_email ? user.user_email : "";
        let usersList = await getTeamUsers(
          uid,
          organization_id
        );
        const interesectionArray = usersList.filter((value) =>
        reportingUsers.includes(value)
      );
        try {
          findQuery["uid"] = {
            $in:interesectionArray
          }
          let userData = await userModel.find(findQuery).limit(10);
          return res.status(200).json({"success": true,data:userData});
        } catch (error) {
          return res.status(400).json({"success": false,"error":error.message});
        }
      }else{
        return res.status(400).json({"success": false,"error":"Incorrect Profile"});
      }
    } catch (error) {
      return res.status(400).json({"success": false,"error":error.message});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }
  }

  userController.UpdateUserRating = async (req, res) => {
    let data = req.body;
    if(data.uid && data.rating && data.rating_given_by){
      try {
        const query = {
          uid: data.uid,
        };
        const update = {
          user_rating: data.rating,
          rating_given_by:data.rating_given_by
        };
        const options = {
          new: true
        };
        const updatedDocument = await userModel.findOneAndUpdate(query, update,options);
        return res.status(200).json({"success": true,data:updatedDocument});
      } catch (err) {
        return res.status(400).json({"success": false,"error":err});
      }
    }else{
      return res.status(400).json({"success": false,"error":"some fields are missing"});
    }
    }

    userController.GetUserReport = async (req, res) => {
        // const currentDate = new Date();
        // const startDateOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        // const formattedCurrentDate = currentDate.toISOString().slice(0, 10);
        // const formattedStartDateOfMonth = startDateOfMonth.toISOString().slice(0, 10);
        const startOfMonth = moment().startOf('month').toDate();
        let startDate = startOfMonth;
        let endDate = moment().toDate();
      let data = req.body;
      if(data.uid){
        try{
          const callsQuery = {
            uid: data.uid,
            created_at: {$gte: moment(startDate).utcOffset('+05:30').toDate(),$lte: moment(endDate).utcOffset('+05:30').toDate()}
          };
          const wonQuery = {
            uid: data.uid,
            stage: "WON",
            stage_change_at: {$gte: moment(startDate).utcOffset('+05:30').toDate(),$lte: moment(endDate).utcOffset('+05:30').toDate()}
          };
          const interestedQuery = {
            uid: data.uid,
            stage: "INTERESTED",
            stage_change_at: {$gte: moment(startDate).utcOffset('+05:30').toDate(),$lte: moment(endDate).utcOffset('+05:30').toDate()}
          };
          const missedQuery = {
            uid: data.uid,
            status: "Pending",
            due_date: {$lt: moment(endDate).utcOffset('+05:30').toDate()}
          };
          const meetingsQuery = {
            uid: data.uid,
            type: {
              $in: ["Site Visit", "Meeting"]
            },
            status: "Completed",
            completed_at: {$gte: moment(startDate).utcOffset('+05:30').toDate(),$lte: moment(endDate).utcOffset('+05:30').toDate()}
          };
          const callsTotal = await callLogsModel.countDocuments(callsQuery);
          const wonTotal = await leadsModel.countDocuments(wonQuery);
          const interestedTotal = await leadsModel.countDocuments(interestedQuery);
          const missedTotal = await taskModel.countDocuments(missedQuery);
          const meetingsTotal = await taskModel.countDocuments(meetingsQuery);
          return res.status(200).json({"success": true,data:{
            totalCalls:callsTotal,
            totalWon:wonTotal,
            totalInterested:interestedTotal,
            totalMissed:missedTotal,
            totalMeetings:meetingsTotal
          }});
        }catch(err){
          return res.status(400).json({"success": false,"error":err});
        }
      }else{
        return res.status(400).json({"success": false,"error":"some fields are missing"});
      }
    }

    

    userController.fetchSpecificData= async(req,res)=>{
      let apiStart = new Date();
      let projection = {
        employee_id: 1,
        user_first_name: 1,
        user_last_name: 1,
        user_email: 1
      }
      let timeTakenOverall;
 

      let Employee_id=[];
      let Employee_Name=[];
      const uid = req.body.uid;
    
       
    
     
        let resultUser = await userModel.find({ uid });
        let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /users/fetchSpecificData, time taken for userCollectionQuery, ${timeTakenQuery1}`);
       
             if(!resultUser){
              return res.status(400).json({
                success:false,
                error:"resultUser not found"
              })
           }
    
      const user = resultUser && resultUser[0];
      const profile = user && user?.profile;
      const organization_id = user && user?.organization_id;
    
    
    
      if(profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin"){
        const permission = user.branchPermission;
    
    
        if (
          permission === undefined ||
          (permission && permission.length === 0) ||
          (permission && permission.includes("All"))
        ){
    
         try {
          const user = await userModel.find({organization_id:organization_id},projection);
          let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /users/fetchSpecificData, time taken for userCollectionQuery, ${timeTakenQuery1}`);
    
          user.forEach((val)=>{
          const {employee_id,user_first_name,user_last_name,user_email}=val;
        
             if(employee_id){
              // Employee_id.push({[employee_id]:uid});
              Employee_id.push({label:employee_id,value:user_email});
             }
             const temp=user_first_name+" "+user_last_name;
            //  if(!temp){}
            //  Employee_Name.push({[temp]:uid});
             Employee_Name.push({label:temp,value:user_email});
    
           })
    
         
           let apiEnd = new Date();
           timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
           console.log(`api endpoint - /users/fetchSpecificData, time taken overall, ${timeTakenOverall}`);
         return res.status(200).json({
           success:true,
           data:{Employee_id,Employee_Name}
         })
    
         } catch (error) {
          return res.status(500).json({
                    success:false,
                    error:error
                  })
         }
    
        }else{
         try {
          // let usersList = await getBranchUsers(
          //   uid,
          //   organization_id,
          //   permission
          // );
    
          const user = await userModel.find({organization_id:organization_id,branch: { $in: permission }},projection);
          let query1 = new Date();
          let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
          console.log(`api endpoint - /users/fetchSpecificData, time taken for userCollectionQuery, ${timeTakenQuery1}`);
    
            user.forEach((val)=>{
            const {employee_id,user_first_name,user_last_name,user_email}=val;
          
               if(employee_id){
                // Employee_id.push({[employee_id]:uid});
                Employee_id.push({label:employee_id,value:user_email});
               }
               const temp=user_first_name+" "+user_last_name;
              //  if(!temp){}
              //  Employee_Name.push({[temp]:uid});
               Employee_Name.push({label:temp,value:user_email});
      
             })
    
           
             let apiEnd = new Date();
             timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
             console.log(`api endpoint - /users/fetchSpecificData, time taken overall, ${timeTakenOverall}`);
           return res.status(200).json({
             success:true,
             data:{Employee_id,Employee_Name}
           })
         } catch (error) {
          return res.status(500).json({
            success:false,
            error:error
          })
         }
        }
    
      }
    
    
      else if(profile.toLowerCase()==="team lead" || profile.toLowerCase()==="team leader"){
       try {
        // let usersList = await getTeamUsers(
        //   uid,
        //   organization_id
        // );
    
    
        const user = await userModel.find({organization_id,reporting_to:resultUser[0].user_email},projection);
        let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /users/fetchSpecificData, time taken for userCollectionQuery, ${timeTakenQuery1}`);
    
            user.forEach((val)=>{
            const {employee_id,user_first_name,user_last_name,user_email}=val;
          
               if(employee_id){
                // Employee_id.push({[employee_id]:uid});
                Employee_id.push({label:employee_id,value:user_email});
               }
               const temp=user_first_name+" "+user_last_name;
              //  if(!temp){}
              //  Employee_Name.push({[temp]:uid});
               Employee_Name.push({label:temp,value:user_email});
      
             })
    
             let apiEnd = new Date();
             timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
             console.log(`api endpoint - /users/fetchSpecificData, time taken overall, ${timeTakenOverall}`);
    
          return  res.status(200).json({
             success:true,
             data:{Employee_id,Employee_Name}
           })
       } catch (error) {
        return res.status(500).json({
          success:false,
          error:error
        })
       }
    
    
    
      }else{
    
    
      try {
        const user = await userModel.find({uid:uid},projection);
        let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /users/fetchSpecificData, time taken for userCollectionQuery, ${timeTakenQuery1}`);
    
        user.forEach((val)=>{
        const {employee_id,user_first_name,user_last_name,user_email}=val;
      
           if(employee_id){
            // Employee_id.push({[employee_id]:uid});
            Employee_id.push({label:employee_id,value:user_email});
           }
           const temp=user_first_name+" "+user_last_name;
          //  if(!temp){}
          //  Employee_Name.push({[temp]:uid});
           Employee_Name.push({label:temp,value:user_email});
    
         })
    
         let apiEnd = new Date();
         timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
         console.log(`api endpoint - /users/fetchSpecificData, time taken overall, ${timeTakenOverall}`);
    
       return res.status(200).json({
         success:true,
         data:{Employee_id,Employee_Name}
       })
        
      } catch (error) {
        return res.status(500).json({
          success:false,
          error:error
        })
      }
    
      }
      
    
        }


        userController.getUserDetail = async (req, res) => {
          try {
              const data= req.body;
              if (!data.uid) {
                  return res.status(400).json({ error: 'UID is required' });
              }
              const results = await userModel.find({ uid:data.uid });

              if (results.length === 0) {
                  return res.status(404).json({ message: 'User not found' });
              }

              return res.status(200).json(results);
          } catch (err) {
              console.error('Error fetching user details:', err);
             return res.status(500).json({ error: 'Internal server error' });
          }
      };


      const createUsersInMB = async (mobile,email,firstname,lastname,city,country,super_user_oid) => {
        try {
          const Url = MB_URL+'/userauthapi/user-registration-mb';
          const data ={
            ubimobile:mobile,
            ubiemail:email,
            ubifname:firstname,
            ubilname:lastname,
            ubiusertype : "I",
            source : "ReadPro",
            geoCity :"2624",
            superuser:super_user_oid
          }
      console.log("data createUsersInMB",data)
      const response = await axios.post(Url, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
          // Return response data
          console.log("createUsersInMB date : ",new Date() )
          console.log("createUsersInMB from MB",response.data)
          if(response.data.USERID===undefined){
            console.error("Error calling createUsersInMB API:", response.data.MESSAGE);
            return false
          }
          return response.data.USERID;
        } catch (error) {
          // If an error occurs, handle it here
          console.error("Error calling createUsersInMB API:", error.message);
          return false;
        }
      }

userController.createUserWithAuth = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let UserInMb = "";
  try {
    const { user_email, contact_no, employee_id, organization_id ,profile} = req.body;

    let userAlreadyExistsInReadpro = await userModel.findOne({user_email});

    let NoCheck = isMobileNoValid(contact_no)

    if(NoCheck!==true){
      await session.abortTransaction();
    session.endSession();
      return res.status(400).json({
        success: false,
        message: NoCheck
      });
    }
    if(userAlreadyExistsInReadpro){
      await session.abortTransaction();
    session.endSession();
      return res.status(400).json({
        success: false,
        message: "Email ID already exists"
      });
    }

    let userAlreadyExistsInOrg = await checkUserExistsInOrganization(organization_id,user_email,contact_no,employee_id);

    if(userAlreadyExistsInOrg){
      await session.abortTransaction();
    session.endSession();
      return res.status(400).json({
        success: false,
        message: "User with the same contact number, or employee ID already exists in the organization"
      });
    }
    // if(!req.body.SOID){
    //   await session.abortTransaction();
    // session.endSession();
    //   console.log("Soid Not exist")
    //   return res.status(400).json({
    //     success: false,
    //     message: "Issue in creating user"
    //   });
    // }

    const organization = await organizationModel.findOne({ organization_id: req.body.organization_id });
    if (!organization) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Organization not found",
      });
    }

    const { city, country } = organization;

    let role = "";
    if (profile === "Lead Manager") {
      role = "Lead Manager"
    } else if (profile === "Team Lead") {
      role = "Team Lead"
    } else if (profile === "Sales") {
      role = "Sales"
    } else if (profile === "Operation Manager") {
      role = "Operation Manager"
    }

    console.log("req.body",req.body)
    defaultPassword = generateDefaultPassword(req.body);
    let passwordSalt =  generateSalt();
    let hashedPassword = await hashPassword(defaultPassword, passwordSalt);
    let uid = new ObjectId();

    if (req.body.SOID) {
      UserInMb = await createUsersInMB(req.body.contact_no, req.body.user_email, req.body.user_first_name, req.body.user_last_name, city, country, req.body.SOID)
      console.log("UserInMb", UserInMb)
      if (UserInMb === false) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Failed to create users",
        });
      }
    }


    const newUser = await userModel.create([{
      contact_no: req.body.contact_no,
      created_by: req.body.created_by,
      designation: req.body.designation,
      branch: req.body.branch,
      device_id: req.body.device_id,
      organization_id: req.body.organization_id,
      profile: req.body.profile,
      reporting_to: req.body.reporting_to,
      status: req.body.status,
      team: req.body.team,
      uid: uid,
      user_email: req.body.user_email,
      user_first_name: req.body.user_first_name,
      user_image: req.body.user_image,
      user_last_name: req.body.user_last_name,
      branchPermission: req.body.branchPermission,
      leadView: req.body.leadView,
      group_head_name: req.body.group_head_name,
      employee_id: req.body.employee_id,
      password: hashedPassword,
      passwordSalt: passwordSalt,
      role: role,
      first_login: true,
      user_oid:req.body.OID?req.body.OID:UserInMb,
      user_super_oid:req.body.SOID?req.body.SOID:""
    }], { session });

      await session.commitTransaction();
      session.endSession();
      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          user: newUser[0]
        }
      });
    
  } catch (error) {
    // res.status(400).json({ error: error.message });
    await session.abortTransaction();
    session.endSession();
    console.log("error11111",error.message)
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again 111111",
      error: error.message,
    });
  }
};

userController.Update = async (req, res) => {
  try {

    let updateData = req.body.data;
    let role = "";
    if(updateData.profile){
      if (updateData.profile === "Lead Manager") {
        role = "Lead Manager";
        updateData = {
          ...updateData,
          role
        }
      } else if (updateData.profile === "Team Lead") {
        role = "Team Lead";
        updateData = {
          ...updateData,
          role
        }
      } else if (updateData.profile === "Sales") {
        role = "Sales";
        updateData = {
          ...updateData,
          role
        }
      } else if (updateData.profile === "Operation Manager") {
        role = "Operation Manager";
        updateData = {
          ...updateData,
          role
        }
      }
    }
    const { organization_id, uid, user_email, contact_no, employee_id } = req.body;

    if (!organization_id || !uid) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    // console.log("akkaka",contact_no,employee_id);

    if (contact_no) {
      let isMobileValid = isValidMobile(contact_no);
      // console.log("lop",isMobileValid)
      if(isMobileValid === false){
        return res.status(400).json({
          success: false,
          message: "Invalid mobile number"
        });
      }
      let userAlreadyExistsInOrg = await checkMobileNumberExistsInReadpro(organization_id,user_email,contact_no,employee_id,uid);
      if (userAlreadyExistsInOrg) {
        return res.status(400).json({
          success: false,
          message: "Mobile Number already exists"
        });
      }
    }

    if (employee_id) {
      let userAlreadyExistsInOrg = await checkEmployeedIdInReadpro(organization_id,user_email,contact_no,employee_id,uid);
      if (userAlreadyExistsInOrg) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists"
        });
      }
    }

    const user = await userModel.findOneAndUpdate(
      { organization_id, uid },
      { $set: updateData },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

userController.FetchAll = async (req, res) => {
  try {
    let apiStart = new Date();
    let timeTakenOverall;
    const { organization_id } = req.query;
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }

    let sort = { created_at: -1 }

    const usersDataRaw = await userModel
      .find(
        { organization_id: organization_id },
        {
          __v: 0,
          device_id: 0,
          session_id: 0,
          device_type: 0,
          first_login: 0,
          fcm_token: 0,
          is_mobile_updation_declared:0,
          user_mb_isd:0,
          user_last_login_time:0,
          password:0,
          passwordSalt:0,
          token:0,
        }
      )
      .sort(sort)
      .lean();
    const usersData = usersDataRaw.map(user => ({
      ...user,
      mb_oid_mapped: user.user_oid ? "Yes" : "No",
    }));    

      let query1 = new Date();
    let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
    console.log(`api endpoint - users/fetchAll, time taken for query 1, ${timeTakenQuery1}`);


    let apiEnd = new Date();
    timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
    console.log(`api endpoint - users/fetchAll, time taken overall, ${timeTakenOverall}`);
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: {
        usersData
      }
    });
  } catch (error) {
    let apiEnd = new Date();
    timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
    console.log(`api endpoint - users/fetchAll, time taken overall, ${timeTakenOverall}`);
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

userController.FetchUser = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }

    const user = await userModel.findOne({ uid: uid }, { password:0,passwordSalt:0 }).lean()

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: {
        user
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

userController.FetchReportingUser = async (req, res) => {
  try {
    const { user_email } = req.query;
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }

    const user = await userModel.findOne({ user_email: user_email }, { password:0,passwordSalt:0 }).lean()

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: {
        user
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};


userController.ResetPasswordForFirstSignIn = async (req, res) => {
  try {
    const { user_email, password } = req.body;
    if (!user_email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }

    let passwordSalt = await generateSalt();
    let hashedPassword = await hashPassword(password, passwordSalt);
    const user = await userModel.findOneAndUpdate(
      { user_email },
      { $set: {
        password: hashedPassword,
        passwordSalt: passwordSalt,
        first_login: false
      } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Password Updated successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};


userController.UpdateUserPassword = async (req, res) => {
  try {
    const { organization_id,user_email, new_password } = req.body;
    if (!organization_id || !user_email || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }

    let passwordSalt = await generateSalt();
    let hashedPassword = await hashPassword(new_password, passwordSalt);
    const user = await userModel.findOneAndUpdate(
      { organization_id, user_email },
      { $set: {
        password: hashedPassword,
        passwordSalt: passwordSalt,
      } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Password Updated successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

function toCamelCase(str) {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}


userController.ImportUsers = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let userInMb = "";

  try {
    const users = req.body.users; // Assume the users are sent in the request body as an array
    // const organization_id = req.body.organization_id; // Organization ID can be common for all users
    let userAlreadyExistsInOrg = false;
    let emailIdAlreadyExistsInReadpro = false;
    let NoCheck = true
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No users provided to Import",
      });
    }

    let bulkUsersToImport = [];
    let bulkUsersAuthorizationToImport = [];

    for (let user of users) {
      const { user_email, contact_no, employee_id, profile, organization_id } = user;

      let password = "";
       password = generateDefaultPassword(user);
      // if (user.user_first_name.length < 4) {
      //  if(user.user_last_name.length <4){
      //   password= user.user_first_name.toUpperCase()+ user.user_last_name.toUpperCase()+"@"+ contact_no.toString().slice(0, 4);
      //    if(password.length<8){
      //     password=user_email.slice(0,8-password.length).toUpperCase()+password;
      //    }
      //  }else{
      //   password =
      //     user.user_first_name.toUpperCase() +
      //     user.user_last_name
      //       .slice(0, 4 - user.user_first_name.length)
      //       .toUpperCase() +
      //     "@" +
      //     contact_no.toString().slice(0, 4);
      //  }

        
      // } else {
      //   password =
      //     user.user_first_name.slice(0, 4).toUpperCase() +
      //     "@" +
      //     contact_no.toString().slice(0, 4);
      // }
       NoCheck = isMobileNoValid(contact_no)
console.log("NoCheck",NoCheck)
       if(NoCheck!==true){
        await session.abortTransaction();
      session.endSession();
        return res.status(200).json({
          success: false,
          message: NoCheck
        });
      }

      userAlreadyExistsInOrg = await checkUserExistsInOrganization(
        organization_id,
        user_email,
        contact_no,
        employee_id
      );

      let userExists = await userModel.findOne({user_email});
      if(userExists){
        emailIdAlreadyExistsInReadpro = true;
      }

      let role = "";
      if (toCamelCase(profile) === "Lead Manager") {
        role = "Lead Manager";
      } else if (toCamelCase(profile) === "Team Lead") {
        role = "Team Lead";
      } else if (toCamelCase(profile) === "Sales") {
        role = "Sales";
      } else if (toCamelCase(profile) === "Operation Manager") {
        role = "Operation Manager";
      }
      console.log("toCamelCase(profile)",toCamelCase(profile))
console.log("role",role)
      let passwordSalt = await generateSalt();
      let hashedPassword = await hashPassword(password, passwordSalt);
      let uid = new ObjectId();
      // Fetch city and country from organization
      const organization = await organizationModel.findOne({ organization_id: user.organization_id });
      if (!organization) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Organization not found",
        });
      }

      const { city, country,oid } = organization; // Extract city and country

      const existingUserAuthorization = await userAuthorizationModel.findOne({
        organization_id: organization_id,
        uid: profile,
      }).session(session);

      if (existingUserAuthorization) {
        let userAuth = {
          uid: uid,
          organization_id: organization_id,
          contact_transfer_approved:
            existingUserAuthorization.contact_transfer_approved,
          contact_mass_update_approved:
            existingUserAuthorization.contact_mass_update_approved,
          contact_delete_record_approved:
            existingUserAuthorization.contact_delete_record_approved,
          contact_import_approved:
            existingUserAuthorization.contact_import_approved,
          contact_export_approved:
            existingUserAuthorization.contact_export_approved,
          contact_create_approved:
            existingUserAuthorization.contact_create_approved,
          contact_update_approved:
            existingUserAuthorization.contact_update_approved,
          contact_change_lead_stage_approved:
            existingUserAuthorization.contact_change_lead_stage_approved,
          contact_attachments_create_approved:
            existingUserAuthorization.contact_attachments_create_approved,
          contact_attachments_delete_approved:
            existingUserAuthorization.contact_attachments_delete_approved,
          contact_notes_create_approved:
            existingUserAuthorization.contact_notes_create_approved,
          contact_call_log_create_approved:
            existingUserAuthorization.contact_call_log_create_approved,
          task_export_approved: existingUserAuthorization.task_export_approved,
          project_import_approved:
            existingUserAuthorization.project_import_approved,
          project_export_approved:
            existingUserAuthorization.project_export_approved,
          project_delete_approved:
            existingUserAuthorization.project_delete_approved,
          project_create_approved:
            existingUserAuthorization.project_create_approved,
          project_update_approved:
            existingUserAuthorization.project_update_approved,
          project_attachments_create_approved:
            existingUserAuthorization.project_attachments_create_approved,
          project_attachments_delete_approved:
            existingUserAuthorization.project_attachments_delete_approved,
          calllog_export_approved:
            existingUserAuthorization.calllog_export_approved,
          api_export_approved: existingUserAuthorization.api_export_approved,
          lead_distribution_create_approved:
            existingUserAuthorization.lead_distribution_create_approved,
          lead_distribution_update_approved:
            existingUserAuthorization.lead_distribution_update_approved,
          lead_distribution_delete_approved:
            existingUserAuthorization.lead_distribution_delete_approved,
          faq_create_approved: existingUserAuthorization.faq_create_approved,
          faq_update_approved: existingUserAuthorization.faq_update_approved,
          faq_delete_approved: existingUserAuthorization.faq_delete_approved,
          show_subscription_panel:
            existingUserAuthorization.show_subscription_panel,
          resource_create_approved:
            existingUserAuthorization.resource_create_approved,
          resource_update_approved:
            existingUserAuthorization.resource_update_approved,
          resource_delete_approved:
            existingUserAuthorization.resource_delete_approved,
        }
        bulkUsersAuthorizationToImport.push(userAuth);
      }

      if (oid) {
        userInMb = await createUsersInMB(user.contact_no, user.user_email, user.user_first_name, user.user_last_name, city, country, user.SOID);

        if (userInMb === false) {
          await session.abortTransaction();
          session.endSession();
          console.log(`Failed to create user in MB for ${user.user_email}`)
          return res.status(400).json({
            success: false,
            message: `Failed to create users`,
          });
        }
      }

      let userData = {
        contact_no: user.contact_no,
        created_by: user.created_by,
        designation: user.designation,
        branch: user.branch,
        device_id: user.device_id,
        organization_id: user.organization_id,
        profile: toCamelCase(user.profile),
        reporting_to: user.reporting_to,
        status: user.status,
        team: user.team,
        uid: uid,
        user_email: user.user_email,
        user_first_name: user.user_first_name,
        user_image: user.user_image,
        user_last_name: user.user_last_name,
        branchPermission: user.branchPermission,
        leadView: user.leadView,
        group_head_name: user.group_head_name,
        employee_id: user.employee_id,
        password: hashedPassword,
        passwordSalt: passwordSalt,
        role: role,
        first_login: true,
        user_oid:req.body.OID?req.body.OID:userInMb,
        user_super_oid:user.SOID ? user.SOID : ""
      }

      
console.log("userData",userData)
      bulkUsersToImport.push(userData);
      
    }

    if (userAlreadyExistsInOrg) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "A user already exists in Organization",
        error: "A user already exists in Organization",
      });
    }

    
    if (emailIdAlreadyExistsInReadpro) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "An Email Id already exists",
        error: "An Email Id already exists",
      });
    }

    let bulkUsers = await userModel.insertMany(bulkUsersToImport, { session });
    let bulkAuthorization = await userAuthorizationModel.insertMany(bulkUsersAuthorizationToImport, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Users imported successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({
      success: false,
      message: "An error occurred, Users could not be imported",
      error: error.message,
    });
  }
};


userController.CreateSubUser = async (req, res) => {
  try {
    const { user_email, user_mobile, user_oid, user_first_name, user_last_name, user_super_oid } = req.body;
    // const { admin, organization_id } = req.body;  // Assuming admin and organization_id are passed in the request body

    let OrganizationData;
    OrganizationData= await organizationModel.findOne({oid:user_super_oid})

    let orgId = OrganizationData.organization_id

    let userCount = await userModel.countDocuments({ orgId});

    if (userCount >= OrganizationData.no_of_employees) {
      return res.status(200).json({
        success: false,
        message: `User limit reached. Maximum allowed users are ${no_of_licenses}.`,
        error:`User limit reached. Maximum allowed users are ${no_of_licenses}.`
      });
    }

    // Check if the user already exists in ReadPro
    let userAlreadyExistsInReadpro = await userModel.findOne({ user_email });

    let userNoAlreadyExistsInReadpro = await userModel.findOne({ contact_no:user_mobile });


    if (userNoAlreadyExistsInReadpro || userAlreadyExistsInReadpro) {
      return res.status(200).json({
        success: false,
        message: "User already exists",
        error:"User already exists"
      });
    }

    // Generate password based on the given logic
    let password = "";

      const mobileDigits = user_mobile.toString().slice(0, 4);
      if (user_first_name.length >= 4) {
        password = user_first_name.slice(0, 4).toUpperCase();
      } else {
        password = user_first_name.toUpperCase();
        if (user_last_name) {
          password += user_last_name.slice(0, 4 - user_first_name.length).toUpperCase();
        }
        while (password.length < 4) {
          password += "0";
        }
      }
      password += "@" + mobileDigits;

    // Hash the password
    let passwordSalt = await generateSalt();
    let hashedPassword = await hashPassword(password, passwordSalt);
    let uid = new ObjectId();
    let admin_name = OrganizationData.admin_first_name + OrganizationData.admin_last_name;

    // Create the new user
    const newUser = await userModel.create({
      contact_no: user_mobile,
      created_by: admin_name,
      designation: "Sales",
      branch: "",
      device_id: "",
      organization_id: OrganizationData.organization_id,
      profile: "Sales",
      reporting_to: OrganizationData.admin_email_id,
      status: "ACTIVE",
      team: "",
      uid: uid,
      user_email: user_email,
      user_first_name: user_first_name,
      user_image: "",
      user_last_name: user_last_name || "",
      branchPermission: "",
      leadView: "",
      group_head_name: admin_name,
      employee_id: "",
      password: hashedPassword,
      passwordSalt: passwordSalt,
      role: "Sales",
      first_login: true,
      user_oid: user_oid,
      user_super_oid: user_super_oid
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    console.log("Error in sub-user creation:", error);
    return res.status(200).json({
      success: false,
      message: "An error occurred, Please try again",
    });
  }
};

userController.SendOtpBeforeUpdatingMobile = async (req, res) => {
  try {
    const {oldMobile,mobileIsd,newMobile} = req.body;
    let sendOtpUrl = MB_URL + "/userauthapi/otp/validate-mobile";
    let sendOtpBody = {
      "mobile": oldMobile,
      "mobileIsd": mobileIsd,
      "newMobile": newMobile
    }

    const response = await axios.post(sendOtpUrl, sendOtpBody);
    if (response.data.Status == "Success") {
      let rfnum = encryptPAN(JSON.stringify(response.data.mobile.userId))
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        data: {
          rfnum
        }
      });
    }else{
      return res.status(400).json({
        success: false,
        message: response.data.Desc,
        error:  response.data.Desc,
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
    });
  }
};

userController.VerifyOtpAndUpdateUser = async (req, res) => {
  try {
    const { rfnum, oldMobile, mobileIsd, oldMobileOtp, newMobile, newMobileOtp, organization_id, uid, user_email, contact_no, employee_id } = req.body;
    const decryptedRfNum = decryptPAN(rfnum);
    let verifyOtpUrl = MB_URL + "/userauthapi/otp/update-mobile";
    let verifyOtpBody = {
      "rfnum": decryptedRfNum,
      "mobile": oldMobile,
      "mobileIsd": mobileIsd,
      "otp": oldMobileOtp,
      "newMobile": newMobile,
      "otpNewMobile": newMobileOtp
    }

    const response = await axios.post(verifyOtpUrl, verifyOtpBody);
    let oldMobileOtpVerified = response?.data?.mobile?.otpVerifyStatus ?  response.data.mobile.otpVerifyStatus : false;
    let newMobileOtpVerified = response?.data?.newMobile?.otpVerifyStatus ?  response.data.newMobile.otpVerifyStatus : false;
    if (oldMobileOtpVerified && newMobileOtpVerified) {
      let updateData = req.body.data;
      let role = "";
      if (updateData.profile) {
        if (updateData.profile === "Lead Manager") {
          role = "Lead Manager";
          updateData = {
            ...updateData,
            role
          }
        } else if (updateData.profile === "Team Lead") {
          role = "Team Lead";
          updateData = {
            ...updateData,
            role
          }
        } else if (updateData.profile === "Sales") {
          role = "Sales";
          updateData = {
            ...updateData,
            role
          }
        } else if (updateData.profile === "Operation Manager") {
          role = "Operation Manager";
          updateData = {
            ...updateData,
            role
          }
        }
      }

      if (!organization_id || !uid) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters"
        });
      }

      if (updateData.contact_no || updateData.employee_id) {
        let userAlreadyExistsInOrg = await checkUserExistsInOrganization(organization_id, user_email, updateData.contact_no, updateData.employee_id);
        if (userAlreadyExistsInOrg) {
          return res.status(400).json({
            success: false,
            message: "User already exists"
          });
        }
      }

      const user = await userModel.findOneAndUpdate(
        { organization_id, uid },
        { $set: updateData },
        { new: true }
      );
      return res.status(200).json({
        success: true,
        message: "User updated successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "OTP verification failed, Please try again",
        error: "OTP verification failed, Please try again"
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
    });
  }
};

userController.verifyNumberInDb=async(req,res)=>{
  try {
    const { newContactNum } = req.query;

    if(!newContactNum){
      return res.status(200).json({
        success: false,
        message: "newContactNum does not exist",
        error: "newContactNum doesn't exist"
      });
    }

    const existingContact = await userModel.findOne({ contact_no: newContactNum });
    if (existingContact) {
      return res.status(200).json({
        success: false,
        message: "New contact number already exists",
        error: "Contact number already in use"
      });
    }else{
      return res.status(200).json({
        success: true,
        message: "number validation successfully"
      });
    }
    
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
    });
  }
}

userController.updateContactNumberFromMB = async (req, res) => {
  try {
    const { newContactNum, oldContactNum, userId } = req.body;

    // Validate if the user exists
    const user = await userModel.findOne({ user_oid: userId }).lean();
    if (!user) {
      return res.status(200).json({
        success: false,
        message: "User does not exist",
        error: "user_oid doesn't exist"
      });
    }

    // Check if the old contact number matches the current one in the database
    if (user.contact_no !== oldContactNum) {
      return res.status(200).json({
        success: false,
        message: "Old contact number does not match",
        error: "The old contact number doesn't match the record"
      });
    }

    // Update contact number
    await userModel.findByIdAndUpdate({_id:user._id}, { $set: { contact_no: newContactNum } });

    return res.status(200).json({
      success: true,
      message: "Contact number updated successfully"
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message
    });
  }
};




module.exports = userController;