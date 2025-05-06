var ObjectId = require('mongoose').Types.ObjectId;
const userTrackingModel = require('../models/userTrackingSchema');
const userModel = require("../models/userSchema");

const getBranchUsers = async (
  uid,
  organization_id,
  permission
) => {
  const users = await userModel.find({
    organization_id,
    branch: { $in: permission },
  });
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

const userTrackingController = {};

userTrackingController.updateTrackingForDate = async (req, res) => {
  let data = req.body;
  if(data.uid && data.organization_id && data.coordinates && data.date){
    try {
      let todayDate = new Date(data.date);
      let tomorrowDate = new Date(todayDate);
      tomorrowDate.setDate(todayDate.getDate() + 1);
      let isoTomorrowDate = tomorrowDate.toISOString();
      const query = {
        organization_id: data.organization_id,
        uid: data.uid,
        date: { $gte: todayDate.toISOString().substring(0, 10),$lt:isoTomorrowDate.substring(0, 10)}
      };
      const queryUser = {
        uid: data.uid,
      };
      const update = {
        $push: { coordinates:  {latitude:data.coordinates.latitude,longitude:data.coordinates.longitude,date_and_time:todayDate}},
        date:todayDate
      };
      const updateUser = {
        last_tracked_date_and_time:todayDate
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const updatedDocument = await userTrackingModel.findOneAndUpdate(query, update, options);
      const updatedDocumentUser = await userModel.findOneAndUpdate(queryUser, updateUser);
      return res.status(200).json({"success": true,data:updatedDocument});
    } catch (err) {
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }
  }

userTrackingController.getTrackingForDate = async (req, res) => {
    let data = req.body;
    if(data.uid && data.date && data.organization_id){
      try{
        let date = new Date(data.date);
        let nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        let isoNextDate = nextDate.toISOString();
        const query = {
          organization_id: data.organization_id,
          uid: data.uid,
          date: {$gte: date.toISOString().substring(0, 10),$lt:isoNextDate.substring(0, 10)}
        };
        
        const result = await userTrackingModel.find(query);
        return res.status(200).json({"success": true,data:result});
      }catch(err){
        return res.status(400).json({"success": false,"error":err});
      }
    }else{
      return res.status(400).json({"success": false,"error":"some fields are missing"});
    }
  }

  userTrackingController.getUsersListForTracking = async (req, res) => {

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
        let page = data.page
        ? Number(data.page)
        : 1;
        let liveTrackingStatus = data.status;
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
        else if(typeof liveTrackingStatus === "boolean" && liveTrackingStatus === false){
          userQuery["$or"] = [
            {is_live_tracking_active:{$exists:false}},
            {is_live_tracking_active:false}
          ]
        }
        else if(typeof liveTrackingStatus === "boolean" && liveTrackingStatus === true){
          userQuery["is_live_tracking_active"] = true;
        }
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
              let userData = await userModel.find(findQuery)
              .skip((page - 1) * 5)
              .limit(5);
              return res.status(200).json({"success": true,data:userData});
            } catch (error) {
              return res.status(400).json({"success": false,"error":err});
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
              let userData = await userModel.find(findQuery).skip((page - 1) * 5)
              .limit(5);
              return res.status(200).json({"success": true,data:userData});
            } catch (error) {
              return res.status(400).json({"success": false,"error":err});
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
            let userData = await userModel.find(findQuery).skip((page - 1) * 5)
            .limit(5);
            return res.status(200).json({"success": true,data:userData});
          } catch (error) {
            return res.status(400).json({"success": false,"error":err});
          }
        }else{
          return res.status(400).json({"success": false,"error":"Incorrect Profile"});
        }
      } catch (err) {
        return res.status(400).json({"success": false,"error":err});
      }
    }else{
      return res.status(400).json({"success": false,"error":"some fields are missing"});
    }
    }

      userTrackingController.updateUserTrackingStatus = async (req, res) => {
        let data = req.body;
        if(data.uid && typeof data.status === 'boolean'){
          try {
            const query = {
              uid: data.uid,
            };
            const update = {
              is_live_tracking_active: data.status,
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

        
userTrackingController.insertTrackingData = async (req, res) => {
  let data = req.body;
  if(data.organization_id){
    try{
      let users = await userModel.find({organization_id:data.organization_id});
      let trackingData = await userTrackingModel.findOne({organization_id:"W5phvDYBAtopkrdehko2",uid:"Xs80YfvyUZV26NrC9mIdEfa6MlJ3",date:{$gte: new Date("2023-03-30"),$lt:new Date("2023-03-31")}})
      users.map(async (item) => {
        let newData = new userTrackingModel(
          {
            organization_id:"DG5T5Sx77iCdhj0SnHsj",
            uid:item.uid,
            coordinates: trackingData.coordinates,
            date: new Date("2023-07-15")
          }
        )
        await newData.save()
        console.log("Saved");
      })
      return res.status(200).json({"success": true,data:true});
    }catch(err){
      console.log("akkaka",err)
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }
}

userTrackingController.updateLiveTrackingStatus = async (req, res) => {
  let data = req.body;
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set time to midnight to compare only the date portion

    const query = {
      is_live_tracking_active: true,
      $or: [
        { last_tracked_date_and_time: { $lt: currentDate } },
        { last_tracked_date_and_time: { $exists: false } }
      ]
      // organization_id:"W5phvDYBAtopkrdehko2"
    };
 
    const update = {
      is_live_tracking_active: data.status,
    };

    const options = {
      new: true,
    };
    // const documents = await userModel.find(query);
    const updatedDocuments = await userModel.updateMany(query, update, options);

    return res.status(200).json({ success: true, data: updatedDocuments });
  } catch (err) {
    return res.status(400).json({ success: false, error: err });
  }
}

module.exports = userTrackingController;
