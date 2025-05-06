var ObjectId = require("mongoose").Types.ObjectId;
const leadModel = require("../models/leadsSchema");
const userModel = require("../models/userSchema");
const taskModel = require("../models/taskSchema");
const callLogModel = require("../models/callLogsSchema");
const Notification = require('../models/notificationModel');
const smsController = require("./smsController");
const contactResourcesMongoModel = require('../models/contactResourcesMongoSchema');
const smsModel = require("../models/smsModel");
const moment = require("moment");
const app = require("firebase");
const timestamp = app.firestore.Timestamp;
const admin = require("../../firebaseAdmin");
const { CONTACT_FILTER_VALUES } = require("../constants/constants");
const userAuthorizationModel = require('../models/userAuthorizationSchema.js');
const {alphabetValidator,}=require("../functions/validation.js")
const NodeCache = require('node-cache');
const cache = new NodeCache();
const PriorityQueue = require('priorityqueuejs');
const leadController = {};
const MAX_CACHE_SIZE = 5000;
const accessTimes = new Map();
const lruQueue = new PriorityQueue((a, b) => accessTimes.get(a) - accessTimes.get(b));
const mongoose = require("mongoose");
const cluster = require("cluster");

const {sanitizationString}=require("../constants/constants.js")
const {getTimeDifferenceInSeconds}=require("../constants/constants.js");
const { sendNotificationToSingleUser } = require("../functions/sendNotification.js");
const {decryptautoLogin}=require("../constants/constants.js")
const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time"
];

const isObjectEmpty = (object) => {
  var isEmpty = true;
  for (keys in object) {
    isEmpty = false;
    break; // exiting since we found that the object is not empty
  }
  return isEmpty;
};

const booleanField = [
  "associate_status",
  "source_status",
  "transfer_status",
];

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
  const users = await userModel.find({ organization_id });
  const user = users.filter((user) => user.uid === uid);
  let reportingToMap = {};
  let usersList = [user[0].uid];

  users.forEach((item) => {
    if (item.reporting_to === "") {
      return;
    }
    if (reportingToMap[item.reporting_to]) {
      reportingToMap[item.reporting_to].push({
        user_email: item.user_email,
        uid: item.uid,
      });
    } else {
      reportingToMap[item.reporting_to] = [
        { user_email: item.user_email, uid: item.uid },
      ];
    }
  });

  const createUsersList = (email, data) => {
    if (data[email] === undefined) {
      return;
    } else {
      data[email].forEach((user) => {
        if (usersList.includes(user.uid)) {
          return;
        }
        usersList.push(user.uid);
        createUsersList(user.user_email, data);
      });
    }
  };

  createUsersList(user[0].user_email, reportingToMap);

  return usersList;
};

const getTeamUsersForNonPerforming = async (uid, organization_id) => {
  const users = await userModel.find({ organization_id: organization_id,status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] } });
  const user = users.filter((user) => user.uid === uid);
  let reportingToMap = {};
  let usersList = [user[0].uid];

  users.forEach((item) => {
    if (item.reporting_to === "") {
      return;
    }
    if (reportingToMap[item.reporting_to]) {
      reportingToMap[item.reporting_to].push({
        user_email: item.user_email,
        uid: item.uid,
      });
    } else {
      reportingToMap[item.reporting_to] = [
        { user_email: item.user_email, uid: item.uid },
      ];
    }
  });

  const createUsersList = (email, data) => {
    if (data[email] === undefined) {
      return;
    } else {
      data[email].forEach((user) => {
        if (usersList.includes(user.uid)) {
          return;
        }
        usersList.push(user.uid);
        createUsersList(user.user_email, data);
      });
    }
  };

  createUsersList(user[0].user_email, reportingToMap);

  return usersList;
};


leadController.Search = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  let filter = req.body.filter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString
    ? req.body.searchString
    : "";
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);
  let userQuery = {};
  let report = [];
  let branchName = "";
  let teamName = "";
  let cond = false;

  let typeFilter=[];
  let statusFilter=[];

  if(filter){
    if ('employee_id' in filter || 'employee_name' in filter || 'contact_owner_email' in filter) {
      let mergedValues = [];
    
      if ('employee_id' in filter && 'employee_name' in filter) {
        mergedValues.push(...filter.employee_id, ...filter.employee_name);
      } else if ('employee_id' in filter) {
        mergedValues.push(...filter.employee_id);
      } else if ('employee_name' in filter) {
        mergedValues.push(...filter.employee_name);
      }
    
      if ('contact_owner_email' in filter) {
        mergedValues.push(...filter.contact_owner_email);
      }
    
      filter.contact_owner_email = [...new Set(mergedValues)];
      
      delete filter.employee_id;
      delete filter.employee_name;
    }else if ("type" in filter || "status" in filter){
      if("type" in filter && "status" in filter){
        typeFilter = filter["type"] 
        statusFilter= filter["status"] 

        delete filter.type;
        delete filter.status;
      }else if ("type" in filter){
        typeFilter =  filter["type"] ;
        delete filter.type;
      }else if ("status" in filter){
        statusFilter=filter["status"] ;
        delete filter.status;
      }
    }
  }

  Object.keys(filter).forEach((key) => {
    if (datesField.includes(key)) {
      if (filter[key].length && filter[key].length === 2) {
        filter[key] = {
          $gte: new Date(filter[key][0]),
          $lte: new Date(filter[key][1]),
        };
      }
    } else if (booleanField.includes(key)) {
      filter[key].forEach((element, index) => {
        if (element === "True" || element === true) {
          filter[key][index] = true;
        } else if (
          element === "False" ||
          element === false
        ) {
          filter[key][index] = false;
        }
      });
    } else if (key === "reporting_to") {
      report = filter[key];
      userQuery["reporting_to"] = { $in: report };
      cond = true;
      delete filter[key];
    } else if (key === "branch") {
      branchName = filter[key];
      userQuery["branch"] = { $in: branchName };
      cond = true;
      delete filter[key];
    } else if (key === "team") {
      teamName = filter[key];
      userQuery["team"] = { $in: teamName };
      cond = true;
      delete filter[key];
    }
    else {
      filter[key] = { $in: filter[key] };
    }
  });

  
  if (missed === true) {
    filter["next_follow_up_date_time"] = {
      $lt: new Date(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  searchString.split(",").forEach((string) => {
    search = string.trim();
    const re = new RegExp(search, "i");
    if (search.match(/^[0-9]+$/) != null) {
      contact_list.push(re);
    } else if (search !== "") {
      customer_name_list.push(re);
    }
  });

  if (contact_list.length !== 0) {
    // filter["contact_no"] = { $in: contact_list };
    filter["$or"] = [{ "contact_no": { $in: contact_list } }, { "alternate_no": { $in: contact_list } }]
  }
  if (customer_name_list.length !== 0) {
    filter["customer_name"] = { $in: customer_name_list };
  }

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    return res.status(400).send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;
  let leads;

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
        let find;
        if (!cond) find = { organization_id, ...filter };
        else
          find = {
            organization_id,
            ...filter,
            uid: { $in: reportingUsers },
          };
        leads = await leadModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize).lean();
  
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);
        let leadIDS= leads.map((val)=>{
           return val.Id
        })

        const reslt = await taskModel.aggregate([
          {
            $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
          },
          {
            $sort: { created_at: -1 }   // Sort by leadID and createdAt in descending order
          },
          {
            $group: {
              _id: "$leadId",                      // Group by leadID
              latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
            }
          },
          {
            $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
          },
          {
            $project: {                            // Project only the desired fields
              leadId: 1,
              type: 1,
              status: 1
            }
          }
        ]);

        let query2 = new Date();
        let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
        console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);
        let userMapping={};

        reslt.forEach((val)=>{
            if(leadIDS.includes(val.leadId)){
              userMapping[`${val.leadId}`]={
                type:val.type || "",
                status:val.status || ""
              }
            }
        })


        leads.forEach((val) => {
          const mapping = userMapping[val.Id];
          if (mapping) {
            val["type"] = mapping["type"];
            val["status"] = mapping["status"];
          }else{
            val["type"]  = ""
            val["status"] = ""
          }
        });
 
        // console.log("rishabh",typeFilter,statusFilter)
        if (typeFilter.length !== 0 || statusFilter.length !== 0) {
          leads = leads.filter(val => {
            const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
            const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
            return typeMatch && statusMatch;
          });
        }

        // console.log("rishabh  rishabh",leads);
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(200).send(leads);
      } catch (error) {
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(400).json({
          success:false,
          error:error.message
        })
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        let find;

        const interesectionArray = usersList.filter(
          (value) => reportingUsers.includes(value)
        );

        if (!cond)
          find = { uid: { $in: usersList }, ...filter };
        else
          find = {
            uid: { $in: interesectionArray },
            ...filter,
          };

        leads = await leadModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize).lean();

          let query1 = new Date();
          let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
          console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);

          let leadIDS= leads.map((val)=>{
            return val.Id
         })

          const reslt = await taskModel.aggregate([
            {
              $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
            },
            {
              $sort: {  created_at: -1 }   // Sort by leadID and createdAt in descending order
            },
            {
              $group: {
                _id: "$leadId",                      // Group by leadID
                latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
              }
            },
            {
              $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
            },
            {
              $project: {                            // Project only the desired fields
                leadId: 1,
                type: 1,
                status: 1
              }
            }
          ]);

          let query2 = new Date();
          let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
          console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);
  
          let userMapping={};
  
          reslt.forEach((val)=>{
              if(leadIDS.includes(val.leadId)){
                userMapping[`${val.leadId}`]={
                  type:val.type || "",
                  status:val.status || ""
                }
              }
          })
  
  
          leads.forEach((val) => {
            const mapping = userMapping[val.Id];
            if (mapping) {
              val["type"] = mapping["type"];
              val["status"] = mapping["status"];
            }else{
              val["type"]  = ""
              val["status"] = ""
            }
          });
         
          if (typeFilter.length !== 0 || statusFilter.length !== 0) {
            leads = leads.filter(val => {
              const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
              const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
              return typeMatch && statusMatch;
            });
          }
        
          let apiEnd = new Date();
          timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
          console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(200).send(leads);
      } catch (error) {
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(400).json({
          success:false,
          error:error.message
        })
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      let find;
      const interesectionArray = usersList.filter((value) =>
        reportingUsers.includes(value)
      );
      if (!cond) {
        if (filter?.stage) {
          find = { uid: { $in: usersList }, ...filter };
        }
        else {
          find = { uid: { $in: usersList }, ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] } };
        }
      }
      else {
        if (filter?.stage) {
          find = {
            uid: { $in: interesectionArray },
            ...filter,
          };
        }
        else {
          find = {
            uid: { $in: interesectionArray },
            ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] }
          };
        }
      }
      leads = await leadModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize).lean();

        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);

        let leadIDS= leads.map((val)=>{
          return val.Id
       })

       const reslt = await taskModel.aggregate([
         {
           $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
         },
         {
          $sort: { created_at: -1 }  // Sort by leadID and createdAt in descending order
         },
         {
           $group: {
             _id: "$leadId",                      // Group by leadID
             latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
           }
         },
         {
           $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
         },
         {
           $project: {                            // Project only the desired fields
             leadId: 1,
             type: 1,
             status: 1
           }
         }
       ]);

       let query2 = new Date();
       let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
       console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);

       let userMapping={};

       reslt.forEach((val)=>{
           if(leadIDS.includes(val.leadId)){
             userMapping[`${val.leadId}`]={
               type:val.type || "",
               status:val.status || ""
             }
           }
       })


       leads.forEach((val) => {
         const mapping = userMapping[val.Id];
         if (mapping) {
           val["type"] = mapping["type"];
           val["status"] = mapping["status"];
         }else{
           val["type"]  = ""
           val["status"] = ""
         }
       });

       if (typeFilter.length !== 0 || statusFilter.length !== 0) {
        leads = leads.filter(val => {
          const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
          const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
          return typeMatch && statusMatch;
        });
      }
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(200).send(leads);
    } catch (error) {
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(400).json({
        success:false,
        error:error.message
      })
    }
  } else {
    try {
      let find;
      if (cond) {
        find = reportingUsers.includes(uid)
          ? { uid, ...filter }
          : "";
      }
      if (find === "") {
        return res.send([]);
      }
      else {
        if (filter?.stage) {
          find = { uid, ...filter };
        }
        else {
          find = { uid, ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] } };
        }
      }
      leads = await leadModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize).lean();

        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);

        let leadIDS= leads.map((val)=>{
          return val.Id
       })

       const reslt = await taskModel.aggregate([
         {
           $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
         },
         {
          $sort: { created_at: -1 }   // Sort by leadID and createdAt in descending order
         },
         {
           $group: {
             _id: "$leadId",                      // Group by leadID
             latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
           }
         },
         {
           $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
         },
         {
           $project: {                            // Project only the desired fields
             leadId: 1,
             type: 1,
             status: 1
           }
         }
       ]);

       let query2 = new Date();
       let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
       console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);

       let userMapping={};

       reslt.forEach((val)=>{
           if(leadIDS.includes(val.leadId)){
             userMapping[`${val.leadId}`]={
               type:val.type || "",
               status:val.status || ""
             }
           }
       })


       leads.forEach((val) => {
         const mapping = userMapping[val.Id];
         if (mapping) {
           val["type"] = mapping["type"];
           val["status"] = mapping["status"];
         }else{
           val["type"]  = ""
           val["status"] = ""
         }
       });

       if (typeFilter.length !== 0 || statusFilter.length !== 0) {
        leads = leads.filter(val => {
          const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
          const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
          return typeMatch && statusMatch;
        });
      }
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(200).send(leads);
    } catch (error) {
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(400).json({
        success:false,
        error:error.message
      })
    }
  }
};

leadController.contacttotalcount = async (req, res) => {
  let uidKeys = [];
  const uid = req.body.uid;
  let filter = req.body.filter;
  let leadFilter = req.body.leadFilter;
  let leadUserFilter = req.body.leadUserFilter;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  const missed = req.body.missed;
  // console.log("leadFilterdata", JSON.stringify(leadFilter))

  if(leadFilter){
    if ('employee_id' in leadFilter || 'employee_name' in leadFilter || 'contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('employee_id' in leadFilter && 'employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id, ...leadFilter.employee_name);
      } else if ('employee_id' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id);
      } else if ('employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_name);
      }
    
      if ('contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter.contact_owner_email);
      }
    
      leadFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete leadFilter.employee_id;
      delete leadFilter.employee_name;
    }
  }
  
  var query = "";
  const regex = /],/gi;
  const regex1 = /:/gi;
  var cc = JSON.stringify(leadUserFilter);
  var dd = cc.replace(regex, ']##').replace(regex1, ':{"$in":').slice(1).slice(0, -1);
  var ee = dd.split('##');

  Object.keys(ee).forEach((key) => {
    query = query + ee[key] + '},';
  });
  var finalQuery = '{' + query.slice(0, -1) + '}';

  !isObjectEmpty(leadUserFilter) &&
    Object.keys(leadUserFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadUserFilter[key].length &&
          leadUserFilter[key].length === 2
        ) {
          leadUserFilter[key] = {
            $gte: new Date(leadUserFilter[key][0]),
            $lte: new Date(leadUserFilter[key][1]),
          };
        }
      } else {
        leadUserFilter[key] = { $in: leadUserFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });
  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadFilter[key].length &&
          leadFilter[key].length === 2
        ) {
          leadFilter[key] = {
            $gte: new Date(leadFilter[key][0]),
            $lte: new Date(leadFilter[key][1]),
          };
        }
      }
      else {
        leadFilter[key] = { $in: leadFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });

    if (missed === true) {
      leadFilter["next_follow_up_date_time"] = {
        $lt: new Date(),
      };
    }

  let report = [];

  let resultUser = "";
  if(teamUids.length < 1){
    resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
      return res.send({ error: "User Not Found" });
    }
  }

  const user = resultUser && resultUser[0];
  const profile = user && user.profile;
  const organization_id = user && user.organization_id;
  const u_id = user && user.uid;
  let leads;

  if (!isObjectEmpty(leadUserFilter)) {
    const fullFinalQuery = JSON.parse(finalQuery);
    fullFinalQuery["organization_id"] = { $in: [organization_id] };
    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    Object.keys(uidTeamTo).forEach((key) => {
      uidKeys.push(uidTeamTo[key].uid);
    });
  }

  const role = req.body.role;

  // console.log("azzziii",role);

  // if (profile.toLowerCase() == "lead manager") {
  //   const permission = user.branchPermission;
  //   if (
  //     permission === undefined ||
  //     (permission && permission?.length === 0) ||
  //     (permission && permission?.includes("All"))
  //   ) {
  //     try {
  //       const and = [{ organization_id }];
  //       if (filter) {
  //         and.push(filter);
  //         if (!isObjectEmpty(leadFilter)) {
  //           Object.keys(leadFilter).forEach((key) => {
  //             and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //           })
  //         }
  //         if (!isObjectEmpty(leadUserFilter)) {
  //           and.push({ ["uid"]: { $in: uidKeys } });
  //         }
  //       }
  //       else {
  //         if (!isObjectEmpty(leadFilter)) {
  //           Object.keys(leadFilter).forEach((key) => {
  //             and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //           })
  //         }
  //         if (!isObjectEmpty(leadUserFilter)) {
  //           and.push({ ["uid"]: { $in: uidKeys } });
  //         }
  //       }
  //       const query = [
  //         {
  //           $match: {
  //             $and: and,
  //           },
  //         },
  //         { $count: "total" },
  //       ];
  //       console.log("New query pass :-" + JSON.stringify(query));
  //       const contactCount = await leadModel.aggregate([
  //         {
  //           $match: {
  //             $and: and,
  //           },
  //         },
  //         { $count: "total" },
  //       ]);
  //       res.send(contactCount[0]);

  //     } catch (error) {
  //       return res.send({ error });
  //     }
  //   }
  //   if (permission && !permission?.includes("All")) {
  //     let usersList = await getBranchUsers(
  //       uid,
  //       organization_id,
  //       permission
  //     );
  //     try {
  //       const and = [{ organization_id }, { uid: { $in: usersList } }];
  //       if (filter) {
  //         and.push(filter);
  //         if (!isObjectEmpty(leadFilter)) {
  //           Object.keys(leadFilter).forEach((key) => {
  //             and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //           })
  //         }
  //         if (!isObjectEmpty(leadUserFilter)) {
  //           and.push({ ["uid"]: { $in: uidKeys } });
  //         }
  //       }
  //       else {
  //         if (!isObjectEmpty(leadFilter)) {
  //           Object.keys(leadFilter).forEach((key) => {
  //             and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //           })
  //         }
  //         if (!isObjectEmpty(leadUserFilter)) {
  //           and.push({ ["uid"]: { $in: uidKeys } });
  //         }
  //       }
  //       const query = [
  //         {
  //           $match: {
  //             $and: and,
  //           },
  //         },
  //         { $count: "total" },
  //       ];
  //       console.log("New query pass :-" + JSON.stringify(query));
  //       const contactCount = await leadModel.aggregate([
  //         {
  //           $match: {
  //             $and: and,
  //           },
  //         },
  //         { $count: "total" },
  //       ]);
  //       res.send(contactCount[0]);

  //     } catch (error) {
  //       res.send({ error });
  //     }
  //   }
  // } else if (profile.toLowerCase() == "team lead") {
  //   let usersList = await getTeamUsers(
  //     uid,
  //     organization_id
  //   );
  //   try {
  //     const and = [{ uid: { $in: usersList } }];
  //     if (filter) {
  //       and.push(filter);

  //       if (!isObjectEmpty(leadFilter)) {
  //         Object.keys(leadFilter).forEach((key) => {
  //           and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //         })
  //       }
  //       if (!isObjectEmpty(leadUserFilter)) {
  //         and.push({ ["uid"]: { $in: uidKeys } });
  //       }
  //     }
  //     else {
  //       if (!isObjectEmpty(leadFilter)) {
  //         Object.keys(leadFilter).forEach((key) => {
  //           and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //         })
  //       }
  //       if (!leadFilter?.stage) {
  //         and.push({ "stage": { $nin: ["LOST", "NOT INTERESTED"] } });
  //       }
  //       if (!isObjectEmpty(leadUserFilter)) {
  //         and.push({ ["uid"]: { $in: uidKeys } });
  //       }
  //     }

  //     const contactCount = await leadModel.aggregate([
  //       {
  //         $match: {
  //           $and: and,
  //         },
  //       },
  //       { $count: "total" },
  //     ]);
  //     res.send(contactCount[0]);

  //   } catch (error) {
  //     res.send({ error });
  //   }
  // } else {
  //   try {
  //     const and = [{ "uid": u_id }];

  //     if (filter) {
  //       and.push(filter);
  //       if (!isObjectEmpty(leadFilter)) {
  //         Object.keys(leadFilter).forEach((key) => {
  //           and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //         })
  //       }
  //       if (!isObjectEmpty(leadUserFilter)) {
  //         and.push({ ["uid"]: { $in: uidKeys } });
  //       }
  //     }
  //     else {
  //       if (!isObjectEmpty(leadFilter)) {
  //         Object.keys(leadFilter).forEach((key) => {
  //           and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
  //         })
  //       }
  //       if (!leadFilter?.stage) {
  //         and.push({ "stage": { $nin: ["LOST", "NOT INTERESTED"] } });
  //       }
  //       if (!isObjectEmpty(leadUserFilter)) {
  //         and.push({ ["uid"]: { $in: uidKeys } });
  //       }
  //     }

  //     const contactCount = await leadModel.aggregate([
  //       {
  //         $match: {
  //           $and: and,
  //         },
  //       },
  //       { $count: "total" },
  //     ]);
  //     return res.send(contactCount[0]);

  //   } catch (error) {
  //     return res.send({ error });
  //   }
  // }

  if(role === false){
    try {
      let and;
      if(teamUids.length > 0){
        and = [{ uid:{$in:teamUids} }];
      }else{
        and = [{ "uid": u_id }];
      }
      if (filter) {
        and.push(filter);
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            // and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            if (key !== "reporting_to" && key !== "team"  && key !== "branch" && key !== "uid"){
              and.push({ [`${key}`]: leadFilter[key] });
            }
          })
        }
        // if (!isObjectEmpty(leadUserFilter)) {
        //   and.push({ ["uid"]: { $in: uidKeys } });
        // }
      }
      else {
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            // and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            if (key !== "reporting_to" && key !== "team"  && key !== "branch" && key !== "uid"){
              and.push({ [`${key}`]: leadFilter[key] });
            }
          })
        }
        // if (!leadFilter?.stage) {
        //   and.push({ "stage": { $nin: ["LOST", "NOT INTERESTED"] } });
        // }
        // if (!isObjectEmpty(leadUserFilter)) {
        //   and.push({ ["uid"]: { $in: uidKeys } });
        // }
      }

      const contactCount = await leadModel.aggregate([
        {
          $match: {
            $and: and,
          },
        },
        { $count: "total" },
      ]);
      return res.send(contactCount[0]);

    } catch (error) {
      return res.send({ error });
    }
  }else{
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission?.length === 0) ||
        (permission && permission?.includes("All"))
      ) {
        try {
          const and = [{ organization_id }];
          if (filter) {
            and.push(filter);
            if (!isObjectEmpty(leadFilter)) {
              Object.keys(leadFilter).forEach((key) => {
                and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
              })
            }
            if (!isObjectEmpty(leadUserFilter)) {
              and.push({ ["uid"]: { $in: uidKeys } });
            }
          }
          else {
            if (!isObjectEmpty(leadFilter)) {
              Object.keys(leadFilter).forEach((key) => {
                and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
              })
            }
            if (!isObjectEmpty(leadUserFilter)) {
              and.push({ ["uid"]: { $in: uidKeys } });
            }
          }
          const query = [
            {
              $match: {
                $and: and,
              },
            },
            { $count: "total" },
          ];
          console.log("New query pass :-" + JSON.stringify(query));
          const contactCount = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            { $count: "total" },
          ]);
          return res.send(contactCount[0]);
  
        } catch (error) {
          return res.send({ error });
        }
      }
      if (permission && !permission?.includes("All")) {
        let usersList = await getBranchUsers(
          uid,
          organization_id,
          permission
        );
        try {
          const and = [{ organization_id }, { uid: { $in: usersList } }];
          if (filter) {
            and.push(filter);
            if (!isObjectEmpty(leadFilter)) {
              Object.keys(leadFilter).forEach((key) => {
                and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
              })
            }
            if (!isObjectEmpty(leadUserFilter)) {
              and.push({ ["uid"]: { $in: uidKeys } });
            }
          }
          else {
            if (!isObjectEmpty(leadFilter)) {
              Object.keys(leadFilter).forEach((key) => {
                and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
              })
            }
            if (!isObjectEmpty(leadUserFilter)) {
              and.push({ ["uid"]: { $in: uidKeys } });
            }
          }
          const query = [
            {
              $match: {
                $and: and,
              },
            },
            { $count: "total" },
          ];
          console.log("New query pass :-" + JSON.stringify(query));
          const contactCount = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            { $count: "total" },
          ]);
          return res.send(contactCount[0]);
  
        } catch (error) {
          return res.send({ error });
        }
      }
    } else if (profile.toLowerCase() == "team lead") {
      let usersList = await getTeamUsers(
        uid,
        organization_id
      );
      try {
        const and = [{ uid: { $in: usersList } }];
        if (filter) {
          and.push(filter);
  
          if (!isObjectEmpty(leadFilter)) {
            Object.keys(leadFilter).forEach((key) => {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            })
          }
          if (!isObjectEmpty(leadUserFilter)) {
            and.push({ ["uid"]: { $in: uidKeys } });
          }
        }
        else {
          if (!isObjectEmpty(leadFilter)) {
            Object.keys(leadFilter).forEach((key) => {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            })
          }
          if (!leadFilter?.stage) {
            and.push({ "stage": { $nin: ["LOST", "NOT INTERESTED"] } });
          }
          if (!isObjectEmpty(leadUserFilter)) {
            and.push({ ["uid"]: { $in: uidKeys } });
          }
        }
  
        const contactCount = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ]);
        return res.send(contactCount[0]);
  
      } catch (error) {
        return res.send({ error });
      }
    } else {
      try {
        const and = [{ "uid": u_id }];
  
        if (filter) {
          and.push(filter);
          if (!isObjectEmpty(leadFilter)) {
            Object.keys(leadFilter).forEach((key) => {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            })
          }
          if (!isObjectEmpty(leadUserFilter)) {
            and.push({ ["uid"]: { $in: uidKeys } });
          }
        }
        else {
          if (!isObjectEmpty(leadFilter)) {
            Object.keys(leadFilter).forEach((key) => {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            })
          }
          if (!leadFilter?.stage) {
            and.push({ "stage": { $nin: ["LOST", "NOT INTERESTED"] } });
          }
          if (!isObjectEmpty(leadUserFilter)) {
            and.push({ ["uid"]: { $in: uidKeys } });
          }
        }
  
        const contactCount = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ]);
        return res.send(contactCount[0]);
  
      } catch (error) {
        return res.send({ error });
      }
    }
  }
};

 function updateAccessTime(CacheKey) {
  accessTimes.set(CacheKey, Date.now());
  // lruQueue.updateKey(CacheKey);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
}

async function checkFilterExist(CacheKey,key,cacheData) {
  key.updateData = false
  const CacheKey2 = JSON.stringify(key);

  if (cache.keys().length >= MAX_CACHE_SIZE) {
    const keys = cache.keys();
    cache.del(keys[0]);
  }
  if (cache.has(CacheKey) || cache.has(CacheKey2)) {
   cache.del( CacheKey )
   cache.del( CacheKey2 )
  }
  if(cache.keys().length <= MAX_CACHE_SIZE)
    {
      if(key.taskFilter && key.leadFilter && key.leadUserFilter && key.callFilter){
      if(Object.keys(key.taskFilter).length === 0 && Object.keys(key.leadFilter).length === 0 && Object.keys(key.leadUserFilter).length === 0 && Object.keys(key.callFilter).length === 0){
        cache.set(CacheKey, cacheData, 1800);
        const formattedDate = formatDate(new Date());
         await userModel.findOneAndUpdate(
          {uid:key.uid},
          { $set: { last_updated_at_contact_panel: formattedDate } },
          { new: true }
        );
      }
    }
    }
}

const getCachedData = (data) => {
  const CacheKey = JSON.stringify(data);
  const cachedData = cache.get(CacheKey);
  return {cachedData,CacheKey};
}

function enforceLRUPolicy() {
  while (cache.keys().length > MAX_CACHE_SIZE) {
    const keyToRemove = lruQueue.deq();
    cache.del(keyToRemove);
    accessTimes.delete(keyToRemove);
    console.log('LRU eviction:', keyToRemove);
  }
}

leadController.FilterValues = async (req, res) => {
  // console.log("cluster worker",cluster.worker ? cluster.worker.id: "no")
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  const stage = req.body.stage;
  const filters=req.body.filters;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  let stageFilter = stage ? { stage } : {};
  let missedFilter = {};
  let showFilterValue = req.body.showColumns;
  data=CONTACT_FILTER_VALUES
  // const User = await userModel.find({ uid });
//   let organization_id
//   User.map((item)=>{
//     organization_id= item.organization_id
//  })
//  console.log("User--User",CacheKey)
//  const CacheKey = JSON.stringify({ organization_id, stage, filters });
//  const cachedData = cache.get(CacheKey);
//  if (cachedData !== undefined) {
//   updateAccessTime(CacheKey);
//   return res.send(cachedData)
// }else{
 
 if(filters){
  Object.keys(filters).forEach((key)=>{
    if (datesField.includes(key)) {
      if (filters[key].length && filters[key].length === 2) {
        filters[key] = {
          $gte: new Date(filters[key][0]),
          $lte: new Date(filters[key][1]),
        };
      }
  }
  })
 }
  if (stage === "FOLLOWUP") {
    stageFilter = {
      stage: { $in: ["CALLBACK", "INTERESTED"] },
    };
  }

  if (stage === "MISSED") {
    stageFilter = {
      stage: { $in: ["CALLBACK", "INTERESTED"] },
    };
    missedFilter["next_follow_up_date_time"] = {
      $lt: new Date(),
    };
  }
  const finalFilters = { ...stageFilter, ...missedFilter,...filters };
  
    let resultUser = "";
  if(teamUids.length < 1){
    resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
      return res.send({ error: "User Not Found" });
    }
  }

  const user = resultUser && resultUser[0];
  const profile = user && user?.profile;
  const organization_id = user && user?.organization_id;

  let group = {
    $group: {
      _id: 0,
    }
  };

if(showFilterValue){
  const commonFields = data.filter(field => showFilterValue.includes(field));
  commonFields.forEach(field => {
    group.$group[field] = { $addToSet: '$' + field };
  });
}
else{

  group = {
    $group: {
      _id: 0,
      budget: { $addToSet: "$budget" },
      contact_owner_email: {
        $addToSet: "$contact_owner_email",
      },
      country_code: { $addToSet: "$country_code" },
      created_by: { $addToSet: "$created_by" },
      lead_source: { $addToSet: "$lead_source" },
      location: { $addToSet: "$location" },
      lost_reason: { $addToSet: "$lost_reason" },
      next_follow_up_type: {
        $addToSet: "$next_follow_up_type",
      },
      not_int_reason: { $addToSet: "$not_int_reason" },
      other_lost_reason: {
        $addToSet: "$other_lost_reason",
      },
      other_not_int_reason: {
        $addToSet: "$other_not_int_reason",
      },
      previous_owner: { $addToSet: "$previous_owner" },
      project: { $addToSet: "$project" },
      property_stage: { $addToSet: "$property_stage" },
      property_type: { $addToSet: "$property_type" },
      stage: { $addToSet: "$stage" },
      addset: { $addToSet: "$addset" },
      campaign: { $addToSet: "$campaign" },
      inventory_type: { $addToSet: "$inventory_type" },
      property_sub_type: {
        $addToSet: "$property_sub_type",
      },
      transfer_reason: { $addToSet: "$transfer_reason" },
      previous_stage_1: { $addToSet: "$previous_stage_1" },
      previous_stage_2: { $addToSet: "$previous_stage_2" },
      previous_owner_2: { $addToSet: "$previous_owner_2" },
      previous_owner_1: { $addToSet: "$previous_owner_1" },
      transfer_by_1: { $addToSet: "$transfer_by_1" },
      transfer_by_2: { $addToSet: "$transfer_by_2" },
      call_back_reason: { $addToSet: "$call_back_reason" },
      branch: { $addToSet: "$branch" },
      business_vertical: { $addToSet: "$business_vertical" },
      api_forms: { $addToSet: "$api_forms" },
      state: { $addToSet: "$state" },
    },
  };
}
  const groupUser = {
    $group: {
      _id: 0,
      reporting_to: { $addToSet: "$reporting_to" },
      branch: { $addToSet: "$branch" },
      team: { $addToSet: "$team" },
    },
  };

  const role = req.body.role;
  
  if(role === false){
  try {
       let filters;
       let userFilters;
      if(teamUids.length > 0){
              filters = await leadModel.aggregate([
        { $match: { uid:{$in:teamUids}, ...finalFilters} },
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      userFilters = await userModel.aggregate([
        { $match: { uid:{$in:teamUids} } },
        groupUser,
      ]);
      let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);
      }else{
              filters = await leadModel.aggregate([
        { $match: { uid, ...finalFilters } },
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      userFilters = await userModel.aggregate([
        { $match: { uid } },
        groupUser,
      ]);
      let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);
      }
      if (filters.length > 0) {
        filters[0].reporting_to =
          userFilters.length > 0
            ? userFilters[0].reporting_to
            : [];
        filters[0].branch =
          userFilters.length > 0
            ? userFilters[0].branch
            : [];
        filters[0].team =
          userFilters.length > 0
            ? userFilters[0].team
            : [];
      }

      let singleArray = [];
      let finalFilterSorted = {};

      Object.keys(filters[0]).forEach((key) => {
        if (key != "_id") {
          const val = filters[0][key].sort();
          finalFilterSorted[key] = val;

        }
      });
      singleArray.push(finalFilterSorted);
      // cache.set(CacheKey, singleArray, 7200);
      // accessTimes.set(CacheKey, Date.now());
      // lruQueue.enq(CacheKey);
      // enforceLRUPolicy();
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message || "An error occured, please try again"
    })
    }
  }else{
      if (profile?.toLowerCase() == "lead manager" || profile?.toLowerCase() == "admin" ) {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        // const query = [
        //   { $match: { organization_id, ...finalFilters } },
        //   group,
        // ];
        // console.log("LeadFilterValuesQuery 1 :" + JSON.stringify(query));
        // const query1 = [
        //   { $match: { organization_id } },
        //   groupUser,
        // ];
        // console.log("LeadFilterValuesQuery 2 :" + JSON.stringify(query1));
        const filters = await leadModel.aggregate([
          { $match: { organization_id, ...finalFilters } },
          group,
        ]);
        let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);

        const userFilters = await userModel.aggregate([
          { $match: { organization_id } },
          groupUser,
        ]);
        let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);

        if (filters.length > 0)
          filters[0].reporting_to =
            userFilters.length > 0
              ? userFilters[0].reporting_to
              : [];
        filters[0].branch =
          userFilters.length > 0
            ? userFilters[0].branch
            : [];
        filters[0].team =
          userFilters.length > 0
            ? userFilters[0].team
            : [];
        // console.log("filter data :" + filters);

        let singleArray = [];
        let finalFilterSorted = {};

        Object.keys(filters[0]).forEach((key) => {
          if (key != "_id") {
            const val = filters[0][key].sort();
            finalFilterSorted[key] = val;

          }
        });
        singleArray.push(finalFilterSorted);
        // cache.set(CacheKey, singleArray, 7200);
        // accessTimes.set(CacheKey, Date.now());
        // lruQueue.enq(CacheKey);
        // enforceLRUPolicy();
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
      } catch (error) {
        return res.status(400).json({
          success:false,
          error:error.message || "An error occured, please try again"
      })
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const query = [
          {
            $match: {
              uid: { $in: usersList },
              ...finalFilters,
            },
          },
          group,
        ];
        const filters = await leadModel.aggregate([
          {
            $match: {
              uid: { $in: usersList },
              ...finalFilters,
            },
          },
          group,
        ]);
        let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
        const userFilters = await userModel.aggregate([
          { $match: { uid: { $in: usersList } } },
          groupUser,
        ]);
        let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);

        if (filters.length > 0)
          filters[0].reporting_to =
            userFilters.length > 0
              ? userFilters[0].reporting_to
              : [];

        let singleArray = [];
        let finalFilterSorted = {};

        Object.keys(filters[0]).forEach((key) => {
          if (key != "_id") {
            const val = filters[0][key].sort();
            finalFilterSorted[key] = val;

          }
        });
        singleArray.push(finalFilterSorted);
        // cache.set(CacheKey, singleArray, 7200);
        // accessTimes.set(CacheKey, Date.now());
        // lruQueue.enq(CacheKey);
        // enforceLRUPolicy();
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
      } catch (error) {
        return res.status(400).json({
          success:false,
          error:error.message || "An error occured, please try again"
      })
      }
    }
  } else if (profile?.toLowerCase() == "team lead") {
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {

      const filters = await leadModel.aggregate([
        {
          $match: {
            uid: { $in: usersList },
            ...finalFilters,
            "stage": { $nin: ["LOST", "NOT INTERESTED"] }
          },
        },
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      const userFilters = await userModel.aggregate([
        { $match: { uid: { $in: usersList } } },
        groupUser,
      ]);
      let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);

      if (filters.length > 0)
        filters[0].reporting_to =
          userFilters.length > 0
            ? userFilters[0].reporting_to
            : [];
      filters[0].branch =
        userFilters.length > 0
          ? userFilters[0].branch
          : [];
      filters[0].team =
        userFilters.length > 0
          ? userFilters[0].team
          : [];

      let singleArray = [];
      let finalFilterSorted = {};

      Object.keys(filters[0]).forEach((key) => {
        if (key != "_id") {
          const val = filters[0][key].sort();
          finalFilterSorted[key] = val;

        }
      });
      singleArray.push(finalFilterSorted);
      // cache.set(CacheKey, singleArray, 7200);
      // accessTimes.set(CacheKey, Date.now());
      // lruQueue.enq(CacheKey);
      // enforceLRUPolicy();
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message || "An error occured, please try again"
    })
    }
  }
  else {
    try {
      const filters = await leadModel.aggregate([
        { $match: { uid, "stage": { $nin: ["LOST", "NOT INTERESTED"] } }, ...finalFilters },
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      const userFilters = await userModel.aggregate([
        { $match: { uid } },
        groupUser,
      ]);
      let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);
      if (filters.length > 0) {
        filters[0].reporting_to =
          userFilters.length > 0
            ? userFilters[0].reporting_to
            : [];
        filters[0].branch =
          userFilters.length > 0
            ? userFilters[0].branch
            : [];
        filters[0].team =
          userFilters.length > 0
            ? userFilters[0].team
            : [];
      }

      let singleArray = [];
      let finalFilterSorted = {};

      Object.keys(filters[0]).forEach((key) => {
        if (key != "_id") {
          const val = filters[0][key].sort();
          finalFilterSorted[key] = val;

        }
      });
      singleArray.push(finalFilterSorted);
      // cache.set(CacheKey, singleArray, 7200);
      // accessTimes.set(CacheKey, Date.now());
      // lruQueue.enq(CacheKey);
      // enforceLRUPolicy();
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message || "some error occured in catch"
    })
    }
  }
  }
// }
};

leadController.StageCount = async (req, res) => {
  const uid = req.body.uid;
  const stages = [
    "FRESH",
    "CALLBACK",
    "INTERESTED",
    "WON",
    "LOST",
    "NOT INTERESTED",
    "MISSED",
  ];
  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }
  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;
  const missedQuery = {
    stage: { $in: ["INTERESTED", "CALLBACK"] },
    next_follow_up_date_time: { $lt: new Date() },
    transfer_status: false,
  };
  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const count = await leadModel.aggregate([
          {
            $match: {
              organization_id,
              transfer_status: false,
            },
          },
          { $group: { _id: "$stage", count: { $sum: 1 } } },
        ]);
        const missedCount = await leadModel.aggregate([
          { $match: { organization_id, ...missedQuery } },
          { $count: "total" },
        ]);
        count.push({
          _id: "MISSED",
          count: missedCount[0] ? missedCount[0].total : 0,
        });
        stages.forEach((stage) => {
          let stageData = count.filter(
            (c) => c._id === stage
          );
          if (stageData.length === 0) {
            count.push({ _id: stage, count: 0 });
          }
        });
        res.send(count);
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const count = await leadModel.aggregate([
          {
            $match: {
              uid: { $in: usersList },
              transfer_status: false,
            },
          },
          { $group: { _id: "$stage", count: { $sum: 1 } } },
        ]);
        const missedCount = await leadModel.aggregate([
          {
            $match: {
              uid: { $in: usersList },
              ...missedQuery,
            },
          },
          { $count: "total" },
        ]);
        count.push({
          _id: "MISSED",
          count: missedCount[0] ? missedCount[0].total : 0,
        });
        stages.forEach((stage) => {
          let stageData = count.filter(
            (c) => c._id === stage
          );
          if (stageData.length === 0) {
            count.push({ _id: stage, count: 0 });
          }
        });
        res.send(count);
      } catch (error) {
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      const count = await leadModel.aggregate([
        {
          $match: {
            uid: { $in: usersList },
            transfer_status: false,
          },
        },
        { $group: { _id: "$stage", count: { $sum: 1 } } },
      ]);
      const missedCount = await leadModel.aggregate([
        {
          $match: {
            uid: { $in: usersList },
            ...missedQuery,
          },
        },
        { $count: "total" },
      ]);
      count.push({
        _id: "MISSED",
        count: missedCount[0] ? missedCount[0].total : 0,
      });
      stages.forEach((stage) => {
        let stageData = count.filter(
          (c) => c._id === stage
        );
        if (stageData.length === 0) {
          count.push({ _id: stage, count: 0 });
        }
      });
      res.send(count);
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      const count = await leadModel.aggregate([
        { $match: { uid, transfer_status: false } },
        { $group: { _id: "$stage", count: { $sum: 1 } } },
      ]);
      const missedCount = await leadModel.aggregate([
        { $match: { uid, ...missedQuery } },
        { $count: "total" },
      ]);
      count.push({
        _id: "MISSED",
        count: missedCount[0] ? missedCount[0].total : 0,
      });
      stages.forEach((stage) => {
        let stageData = count.filter(
          (c) => c._id === stage
        );
        if (stageData.length === 0) {
          count.push({ _id: stage, count: 0 });
        }
      });
      res.send(count);
    } catch (error) {
      res.send({ error });
    }
  }
};

leadController.LeadCount = async (req, res) => {
  const uid = req.body.uid;
  const filter = req.body.filter;
  let leadFilter = req.body.leadFilter;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [{ organization_id }];
        if (filter) {
          and.push(filter);
        }
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            and.push({ [key]: { $in: leadFilter[key] } });
          })
        }
        const query = [
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ];
        console.log("New query pass :-" + JSON.stringify(query));
        const count = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ]);
        res.send(count[0]);
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const and = [{ uid: { $in: usersList } }];
        if (filter) {
          and.push(filter);
        }
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            and.push({ [key]: { $in: leadFilter[key] } });
          })
        }
        const count = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ]);
        res.send(count[0]);
      } catch (error) {
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      if (filter) {
        and.push(filter);
      }
      const and = [{ uid: { $in: usersList } }];
      if (!isObjectEmpty(leadFilter)) {
        Object.keys(leadFilter).forEach((key) => {
          and.push({ [key]: { $in: leadFilter[key] } });
        })
      }
      const count = await leadModel.aggregate([
        {
          $match: {
            $and: and,
          },
        },
        { $count: "total" },
      ]);
      res.send(count[0]);
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (filter) {
        and.push(filter);
      }
      const and = [{ uid }];
      if (!isObjectEmpty(leadFilter)) {
        Object.keys(leadFilter).forEach((key) => {
          and.push({ [key]: { $in: leadFilter[key] } });
        })
      }
      const count = await leadModel.aggregate([
        {
          $match: {
            $and: and,
          },
        },
        { $count: "total" },
      ]);
      res.send(count[0]);
    } catch (error) {
      res.send({ error });
    }
  }
};

leadController.Create = async (req, res) => {

  let lead_type;
  if (req.body.lead_type === undefined) {
    lead_type = "Data";
  } else {
    lead_type = req.body.lead_type;
  }

  const data = new leadModel({
    Id: req.body.id,
    alternate_no: req.body.alternate_no,
    associate_status: req.body.associate_status,
    budget: req.body.budget,
    contact_no: req.body.contact_no,
    contact_owner_email: req.body.contact_owner_email,
    country_code: req.body.country_code,
    created_at:
      typeof req.body.created_at == "object"
        ? new timestamp(
          req.body.created_at._seconds,
          req.body.created_at._nanoseconds
        ).toDate()
        : new Date(),
    created_by: req.body.created_by,
    customer_image: req.body.customer_image,
    lead_type: lead_type,
    customer_name: req.body.customer_name,
    email: req.body.email,
    feedback_time:
      typeof req.body.feedback_time == "object"
        ? new timestamp(
          req.body.feedback_time._seconds,
          req.body.feedback_time._nanoseconds
        ).toDate()
        : new Date(),
    lead_assign_time:
      typeof req.body.lead_assign_time == "object"
        ? new timestamp(
          req.body.lead_assign_time._seconds,
          req.body.lead_assign_time._nanoseconds
        ).toDate()
        : new Date(),
    lead_source: req.body.lead_source,
    location: req.body.location,
    lost_reason: req.body.lost_reason,
    modified_at:
      typeof req.body.modified_at == "object"
        ? new timestamp(
          req.body.modified_at._seconds,
          req.body.modified_at._nanoseconds
        ).toDate()
        : new Date(),
    next_follow_up_date_time:
      typeof req.body.next_follow_up_date_time == "object"
        ? new timestamp(
          req.body.next_follow_up_date_time._seconds,
          req.body.next_follow_up_date_time._nanoseconds
        ).toDate()
        : "",
    next_follow_up_type: req.body.next_follow_up_type,
    not_int_reason: req.body.not_int_reason,
    organization_id: req.body.organization_id,
    other_lost_reason: req.body.other_lost_reason,
    other_not_int_reason: req.body.other_not_int_reason,
    previous_owner: req.body.previous_owner,
    project: req.body.project,
    property_stage: req.body.property_stage,
    property_type: req.body.property_type,
    source_status: req.body.source_status,
    stage: req.body.stage,
    stage_change_at:
      typeof req.body.stage_change_at == "object"
        ? new timestamp(
          req.body.stage_change_at._seconds,
          req.body.stage_change_at._nanoseconds
        ).toDate()
        : new Date(),
    transfer_status: req.body.transfer_status,
    uid: req.body.uid,
    addset: req.body.addset,
    campaign: req.body.campaign,
    inventory_type: req.body.inventory_type,
    property_sub_type: req.body.property_sub_type,
    transfer_reason: req.body.transfer_reason,
    previous_owner_1: req.body.previous_owner_1,
    previous_owner_2: req.body.previous_owner_2,
    transfer_by_1: req.body.transfer_by_1,
    transfer_by_2: req.body.transfer_by_2,
    previous_stage_1: req.body.previous_stage_1,
    previous_stage_2: req.body.previous_stage_2,
    call_back_reason: req.body.call_back_reason,
    is_button_called: req.body.is_button_called,
    gender: req.body.gender,
    marital_status: req.body.marital_status,
    address: req.body.address,
    business_vertical:req.body.business_vertical,
    api_forms:req.body.api_forms,
    state: req.body.state ? req.body.state : "",
    leadDistributionId: req.body.leadDistributionId ? req.body.leadDistributionId : "",
    autoRotationEnabled: req.body.autoRotationEnabled ? req.body.autoRotationEnabled : "OFF",
    autoRotationOwners: req.body.autoRotationOwners ? req.body.autoRotationOwners : [],
    nextRotationAt: typeof req.body.nextRotationAt == "object"
    ? req.body.nextRotationAt?._seconds && req.body.nextRotationAt?._nanoseconds ?
     new timestamp(
      req.body.nextRotationAt._seconds,
      req.body.nextRotationAt._nanoseconds
    ).toDate() : null
    : null,
    dob: typeof req.body.dob == "object"
    ? req.body.dob?._seconds && req.body.dob?._nanoseconds ? new timestamp(
      req.body.dob._seconds,
      req.body.dob._nanoseconds
    ).toDate() : null
    : null,
    anniversary_date: typeof req.body.anniversary_date == "object"
    ? req.body.anniversary_date?._seconds && req.body.anniversary_date?._nanoseconds ?
     new timestamp(
      req.body.anniversary_date._seconds,
      req.body.anniversary_date._nanoseconds
    ).toDate() : null
    : null,
  });
  data.save(async function (err, result) {
    if (err) {
      console.log(err);
    } else {
      console.log("DONE LEADS INSERTION");
    }
  });
  res.send("inserted data");
};

leadController.bulkCreate = (req, res) => {
  const dataList = req.body.dataList;
  for (var i = 0; i <= dataList.length; i++) {
    const data = new leadModel({
      alternate_no: dataList[i].alternate_no,
      associate_status: dataList[i].associate_status,
      budget: dataList[i].budget,
      contact_no: dataList[i].contact_no,
      contact_owner_email: dataList[i].contact_owner_email,
      country_code: dataList[i].country_code,
      created_at: dataList[i].created_at,
      created_by: dataList[i].created_by,
      customer_image: dataList[i].customer_image,
      customer_name: dataList[i].customer_name,
      email: dataList[i].email,
      feedback_time: dataList[i].feedback_time,
      lead_assign_time: dataList[i].lead_assign_time,
      lead_source: dataList[i].lead_source,
      location: dataList[i].location,
      lost_reason: dataList[i].lost_reason,
      modified_at: dataList[i].modified_at,
      next_follow_up_date_time:
        dataList[i].next_follow_up_date_time,
      next_follow_up_type: dataList[i].next_follow_up_type,
      not_int_reason: dataList[i].not_int_reason,
      organization_id: dataList[i].organization_id,
      other_lost_reason: dataList[i].other_lost_reason,
      other_not_int_reason:
        dataList[i].other_not_int_reason,
      previous_owner: dataList[i].previous_owner,
      project: dataList[i].project,
      property_stage: dataList[i].property_stage,
      property_type: dataList[i].property_type,
      source_status: dataList[i].source_status,
      stage: dataList[i].stage,
      stage_change_at: dataList[i].stage_change_at,
      transfer_status: dataList[i].transfer_status,
      uid: dataList[i].uid,
      previous_owner_1: dataList[i].previous_owner_1,
      previous_owner_2: dataList[i].previous_owner_2,
      transfer_by_1: dataList[i].transfer_by_1,
      transfer_by_2: dataList[i].transfer_by_2,
      previous_stage_1: dataList[i].previous_stage_1,
      previous_stage_2: dataList[i].previous_stage_2,
      call_back_reason: dataList[i].call_back_reason,
      is_button_called: dataList[i].is_button_called,
    });
    data.save(async (error, result) => {
      if (error) {
        console.log("error", error);
        console.log("data", dataList[i]);
      } else console.log("inserted data in leads");
    });
  }
  res.send("inserted all data");
};

leadController.callTimeUpdate = async (req, res) => {
  //const result = await leadModel.find({ id: req.body.id });
  const data = JSON.parse(JSON.stringify(req.body));
  const id = data?.id || data?.Id;

  data.call_response_time =
    typeof data.call_response_time == "object"
      ? new timestamp(
        data.call_response_time._seconds,
        data.call_response_time._nanoseconds
      ).toDate()
      : new Date();
  //const updateData=JSON.parse(JSON.stringify(req.body.data))
  leadModel
    .findOneAndUpdate({ Id: id }, { $set: data })
    .exec(function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send("Updation DONE!");
      }
    });
};

leadController.updateData = async (req, res) => {
  //const result = await leadModel.find({ id: req.body.id });
  const data = JSON.parse(JSON.stringify(req.body));
  const id = data.id;
  data.created_at =
    typeof data.created_at == "object"
      ? new timestamp(
        data.created_at._seconds,
        data.created_at._nanoseconds
      ).toDate()
      : new Date();

  data.feedback_time =
    typeof data.feedback_time == "object"
      ? new timestamp(
        data.feedback_time._seconds,
        data.feedback_time._nanoseconds
      ).toDate()
      : new Date();

  data.lead_assign_time =
    typeof data.lead_assign_time == "object"
      ? new timestamp(
        data.lead_assign_time._seconds,
        data.lead_assign_time._nanoseconds
      ).toDate()
      : new Date();

  data.modified_at =
    typeof data.modified_at == "object"
      ? new timestamp(
        data.modified_at._seconds,
        data.modified_at._nanoseconds
      ).toDate()
      : new Date();
  data.next_follow_up_date_time =
    typeof data.next_follow_up_date_time == "object"
      ? new timestamp(
        data.next_follow_up_date_time._seconds,
        data.next_follow_up_date_time._nanoseconds
      ).toDate()
      : "";
  data.stage_change_at =
    typeof data.stage_change_at == "object"
      ? new timestamp(
        data.stage_change_at._seconds,
        data.stage_change_at._nanoseconds
      ).toDate()
      : new Date();
      data.dob = typeof data.dob == "object"
      ? data.dob?._seconds && data.dob?._nanoseconds ? new timestamp(
        data.dob._seconds,
        data.dob._nanoseconds
      ).toDate() : null
      : null;
      data.anniversary_date = typeof data.anniversary_date == "object"
      ? data.anniversary_date?._seconds && data.anniversary_date?._nanoseconds ? new timestamp(
        data.anniversary_date._seconds,
        data.anniversary_date._nanoseconds
      ).toDate() : null
      : null;

  delete data.id;
  if (data._id) {
    delete data._id;
  }
  //const updateData=JSON.parse(JSON.stringify(req.body.data))
  leadModel
    .findOneAndUpdate({ Id: id }, { $set: data })
    .exec(function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send("Updation DONE!");
      }
    });
};

leadController.bulkUpdate = (req, res) => {
  const updateDataList = req.body;
  //res.send(updateDataList)
  for (var i = 0; i < updateDataList.length; i++) {
    const data = JSON.parse(
      JSON.stringify(updateDataList[i])
    );
    const id = data.id;
    delete data.id;
    if (ObjectId.isValid(id)) {
      leadModel
        .findByIdAndUpdate(id, { $set: data })
        .exec(function (err, result) {
          if (err) {
            console.log(err);
            console.log(data);
          } else {
            console.log(result);
          }
        });
    } else {
      leadModel
        .findOneAndUpdate({ id: id }, { $set: data })
        .exec(function (err, result) {
          if (err) {
            console.log(err);
            console.log(data);
          } else {
            console.log("Done!");
          }
        });
    }
  }
  res.status(200).send("Updation DONE!");
};

leadController.deleteData = async (req, res) => {
  //const result = await leadModel.find({ id: req.body.id });
  if (ObjectId.isValid(req.body.id)) {
    //res.send("true");
    //const data = JSON.parse(JSON.stringify(req.body));
    const id = req.body.id;
    //delete data.id;
    //const updateData=JSON.parse(JSON.stringify(req.body.data))
    leadModel
      .findOneAndDelete({ _id: id })
      .exec(function (err, result) {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send("Deletion DONE!");
        }
      });
  } else {
    //const data = JSON.parse(JSON.stringify(req.body));
    const id = req.body.id;
    //delete data.id;
    //const updateData=JSON.parse(JSON.stringify(req.body.data))
    leadModel
      .findOneAndDelete({ Id: id })
      .exec(function (err, result) {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send("Deletion DONE!");
        }
      });
  }
};

leadController.feedbackReport = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;


  const resultCacheData = getCachedData(req.body);
  if (resultCacheData.cachedData !== undefined && req.body.updateData === false) {
  //  updateAccessTime(resultCacheData.CacheKey);
   return res.send(resultCacheData.cachedData)
 }else{
  // for date filters
  const date_parameter = "lead_assign_time";

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
      .toDate();
  }

  if (req.body.start_date && req.body.end_date) {
    date_condition = {
      [`${date_parameter}`]: {
        $gte: start_date,
        $lte: end_date,
      },
    };
  }

  const groupByOwner = {
    $group: {
      _id: { owner: "$uid", stage: "$stage" },
      num: { $sum: 1 },
    },
  };

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      stage: {
        $push: { stage: "$_id.stage", count: "$num" },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      stage: 1,
      total: {
        $sum: "$stage.count",
      },
    },
  };

  const groupBySource = {
    $group: {
      _id: { lead_source: "$lead_source", stage: "$stage" },
      num: { $sum: 1 },
    },
  };

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.lead_source",
      stage: {
        $push: { stage: "$_id.stage", count: "$num" },
      },
    },
  };

  const projectSource = {
    $project: {
      lead_source: "$_id",
      _id: false,
      stage: 1,
      total: {
        $sum: "$stage.count",
      },
    },
  };

  // types - associate or source
  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associate_status: true };
    group = groupByOwner;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { source_status: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};

  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element.stage;
      makeKey.forEach((c) => {
        var key = c.stage;
        if (!ChartCount[key]) {
          ChartCount[key] = c.count;
          Total += c.count;
        } else {
          ChartCount[key] += c.count;
          Total += c.count;
        }
      });
    });
  };

  let uidKeys = [];
  // let branchUidKeys = [];
  // const uidReport = (arr) => {
  //   arr.forEach((element) => {
  //     uidKeys.push(element.value);
  //   });
  //   console.log("UIDKeys : "+uidKeys);
  // };
  let isBranchTo = false;
  let isReportingTo = false;
  let isTeamTo = false;
  const leadFilter = req.body.leadFilter;
  const taskFilter = req.body.taskFilter;
  const leadUserFilter = req.body.leadUserFilter;

  console.log("LeadUser filter values object :" + JSON.stringify(leadUserFilter));
  if(leadFilter){
    if ('employee_id' in leadFilter || 'employee_name' in leadFilter || 'contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('employee_id' in leadFilter && 'employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id, ...leadFilter.employee_name);
      } else if ('employee_id' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id);
      } else if ('employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_name);
      }
    
      if ('contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter.contact_owner_email);
      }
    
      leadFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete leadFilter.employee_id;
      delete leadFilter.employee_name;
    }
  }
  // if ('employee_id' in leadUserFilter || 'employee_name' in leadUserFilter) {
  //   if ('employee_id' in leadUserFilter && 'employee_name' in leadUserFilter) {
  //     const mergedValues = [...new Set([...leadUserFilter.employee_id, ...leadUserFilter.employee_name])];
  //     leadUserFilter.uid = mergedValues;
  //   } else {
  //     leadUserFilter.uid = leadUserFilter.employee_id || leadUserFilter.employee_name;
  //   }
  
  //   delete leadUserFilter.employee_id;
  //   delete leadUserFilter.employee_name;
  // }

  if (!isObjectEmpty(leadUserFilter)) {
    var query = "";
    const regex = /],/gi;
    const regex1 = /:/gi;
    var cc = JSON.stringify(leadUserFilter);
    var dd = cc.replace(regex, ']##').replace(regex1, ':{"$in":').slice(1).slice(0, -1);
    console.log("Old : " + cc);
    console.log("New : " + dd);
    var ee = dd.split('##');
    console.log("Split:" + ee);

    Object.keys(ee).forEach((key) => {
      console.log("Keys :" + key);
      console.log("Values :" + ee[key] + '}');
      query = query + ee[key] + '},';
    });
    var finalQuery = '{' + query.slice(0, -1) + '}';
    console.log("Final Query : " + finalQuery);
  }

  // const callFilter = req.body.callFilter;

  !isObjectEmpty(leadUserFilter) &&
    Object.keys(leadUserFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadUserFilter[key].length &&
          leadUserFilter[key].length === 2
        ) {
          leadUserFilter[key] = {
            $gte: new Date(leadUserFilter[key][0]),
            $lte: new Date(leadUserFilter[key][1]),
          };
        }
      } else {
        leadUserFilter[key] = { $in: leadUserFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });


  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadFilter[key].length &&
          leadFilter[key].length === 2
        ) {
          leadFilter[key] = {
            $gte: new Date(leadFilter[key][0]),
            $lte: new Date(leadFilter[key][1]),
          };
        }
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });

  // if (isReportingTo == true) {
  //   console.log("DATA : " + JSON.stringify(leadFilter["reporting_to"]));
  //   const uidReportingTo = await userModel.find({ "reporting_to": leadFilter["reporting_to"] }, { "_id": 0, "uid": 1 });
  //   console.log("UID : " + uidReportingTo);
  //   // uidReport(uidReportingTo);

  //   Object.keys(uidReportingTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidReportingTo[key].uid);
  //     uidKeys.push(uidReportingTo[key].uid);
  //   });
  //   console.log("UID Key arr:" + uidKeys);
  // }
  // if (isBranchTo == true) {
  //   const uidBranchTo = await userModel.find({ "branch": leadFilter["branch"] }, { "_id": 0, "uid": 1 });
  //   Object.keys(uidBranchTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidBranchTo[key].uid);
  //     uidKeys.push(uidBranchTo[key].uid);
  //   });
  //   console.log("Branch uid Key array :" + uidKeys);
  // }
  // if (isTeamTo == true) {
  //   const uidTeamTo = await userModel.find({ "team": leadFilter["team"] }, { "_id": 0, "uid": 1 });
  //   Object.keys(uidTeamTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidTeamTo[key].uid);
  //     uidKeys.push(uidTeamTo[key].uid);
  //   });
  //   console.log("Team uid Key array :" + uidKeys);
  // }
  if (!isObjectEmpty(leadUserFilter)) {
    const fullFinalQuery = JSON.parse(finalQuery);

    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    Object.keys(uidTeamTo).forEach((key) => {
      // console.log("Key:" + key);
      // console.log("Value:" + uidTeamTo[key].uid);
      uidKeys.push(uidTeamTo[key].uid);
    });
    // console.log("Team uid Key array :" + uidKeys);
  }


  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  // callFilter !== undefined &&
  //   Object.keys(callFilter).forEach((key) => {
  //     callFilter[key] = { $in: callFilter[key] };
  //   });

  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "Id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  // const lookupCall = {
  //   $lookup: {
  //     from: 'calllogs',
  //     localField: 'Id',
  //     foreignField: 'leadId',
  //     as: 'calllogs',
  //   },
  // }

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [{ organization_id }, type];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }
        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          });
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {

          const query = [
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ];
          console.log("Feedback Query :" + JSON.stringify(query));
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }
        countHelp(report);

        //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id,status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          let existingOwners = report.map(item => item.owner);
          
          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, stage: [], total: 0 };
          });

          report = [...report, ...arr]

        }

        ////////////////////////////////////////////////////////////////////////////////

      
        // console.log("dfsdfd",arr)

        // console.log(filterArr);


        


        // console.log("existingOwner",existingOwners)

        // let empty = isObjectEmpty(ChartCount);

        // let emptyArray = [];
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        return res.send({ report, ChartCount, Total });
        // else res.send({ report, ChartCount: emptyArray, Total });
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const and = [{ uid: { $in: usersList } }, type];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);

    //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id, status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] },branch: { $in: permission }},
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          const existingOwners = report.map(item => item.owner);

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, stage: [], total: 0 };
          });

          report = [...report, ...arr]

        }

    ////////////////////////////////////////////////////////////////////////////////

        // let empty = isObjectEmpty(ChartCount);

        // let emptyArray = [];
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        return res.send({ report, ChartCount, Total });
        // else res.send({ report, ChartCount: emptyArray, Total });
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    if (type.source_status === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      const and = [{ uid: { $in: usersList } }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }
      // if (!isObjectEmpty(leadFilter)) {
      //   const keys = Object.keys(leadFilter);
      //   keys.forEach((key, index) => {
      //     and.push({ [`${key=="reporting_to"?"uid":key}`]: key=="reporting_to"?{ $in: uidKeys}:leadFilter[key] });
      //   });
      // }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          console.log("Team Lead Keys :" + key);
          if (key == "reporting_to") {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: { $in: uidKeys } });
          }
          else if (key == "branch") {
            and.push({ [`${key == "branch" ? "uid" : key}`]: { $in: uidKeys } });
          }
          else {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
          // and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {

        const query = [
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ];
        console.log("Team Lead query : " + JSON.stringify(query));
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);

      //////////////////////Non performing user functionality ////////////////////////////
      if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
        const uids = await getTeamUsersForNonPerforming(uid, organization_id)

        const existingOwners = report.map(item => item.owner);

        let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

        // filterArr=[... new Set(filterArr)]
        const arr = filterArr.map((val) => {
          return { owner: val, stage: [], total: 0 };
        });

        report = [...report, ...arr]

      }



      ////////////////////////////////////////////////////////////////////////////////

      // let empty = isObjectEmpty(ChartCount);

      // let emptyArray = [];
      checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
      res.send({ report, ChartCount, Total });
      // else res.send({ report, ChartCount: emptyArray, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {

    try {
      if (type.source_status === true) {
        return res.send("Only for Lead manager");
      }

      const and = [{ uid }, type];

      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        and.push(leadFilter);
      }

      // if (!isObjectEmpty(leadFilter)) {
      //   const keys = Object.keys(leadFilter);
      //   keys.forEach((key, index) => {
      //     and.push({ [`${key=="reporting_to"?"uid":key}`]: key=="reporting_to"?{ $in: uidKeys}:leadFilter[key] });
      //   });
      // }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        lookupand.push(taskFilter);
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {

        const query = [
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ];
        console.log("Sales query :" + JSON.stringify(query));

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);

      let empty = isObjectEmpty(ChartCount);

      let emptyArray = [];

      if (!empty) {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });}
      else
       {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount: emptyArray, Total })
        res.send({ report, ChartCount: emptyArray, Total });
      }
      
    } catch (error) {
      res.send({ error });
    }
  }
}
};
////////////////////////////////////
// Author: Anuj chauhan
// Date: 29/08/2022
// Comment: Added this API to call back reason  report data  for analytics screen.
/////////////////////////////////
leadController.callBackReasonReport = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  const resultCacheData = getCachedData(req.body);
  if (resultCacheData.cachedData !== undefined && req.body.updateData === false) {
  //  updateAccessTime(resultCacheData.CacheKey);
   return res.send(resultCacheData.cachedData)
 }else{

  // for date filters
  const date_parameter = "lead_assign_time";

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
      .toDate();
  }

  if (req.body.start_date && req.body.end_date) {
    date_condition = {
      [`${date_parameter}`]: {
        $gte: start_date,
        $lte: end_date,
      },
    };
  }

  const groupByOwner = {
    $group: {
      _id: { owner: "$uid", call_back_reason: "$call_back_reason" },
      num: { $sum: 1 },
    },
  };

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      call_back_reason: {
        $push: { call_back_reason: "$_id.call_back_reason", count: "$num" },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      call_back_reason: 1,
      total: {
        $sum: "$call_back_reason.count",
      },
    },
  };

  const groupBySource = {
    $group: {
      _id: { lead_source: "$lead_source", call_back_reason: "$call_back_reason" },
      num: { $sum: 1 },
    },
  };

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.lead_source",
      call_back_reason: {
        $push: { call_back_reason: "$_id.call_back_reason", count: "$num" },
      },
    },
  };

  const projectSource = {
    $project: {
      lead_source: "$_id",
      _id: false,
      call_back_reason: 1,
      total: {
        $sum: "$call_back_reason.count",
      },
    },
  };

  // types - associate or source
  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associate_status: true };
    group = groupByOwner;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { source_status: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};

  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element.call_back_reason;
      makeKey.forEach((c) => {
        var key = c.call_back_reason;
        if (!ChartCount[key]) {
          ChartCount[key] = c.count;
          Total += c.count;
        } else {
          ChartCount[key] += c.count;
          Total += c.count;
        }
      });
    });
  };

  let uidKeys = [];
  const leadFilter = req.body.leadFilter;
  const taskFilter = req.body.taskFilter;
  const leadUserFilter = req.body.leadUserFilter;
  if(leadFilter){
    if ('employee_id' in leadFilter || 'employee_name' in leadFilter || 'contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('employee_id' in leadFilter && 'employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id, ...leadFilter.employee_name);
      } else if ('employee_id' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id);
      } else if ('employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_name);
      }
    
      if ('contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter.contact_owner_email);
      }
    
      leadFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete leadFilter.employee_id;
      delete leadFilter.employee_name;
    }
  }

  // if ('employee_id' in leadUserFilter || 'employee_name' in leadUserFilter) {
  //   if ('employee_id' in leadUserFilter && 'employee_name' in leadUserFilter) {
  //     const mergedValues = [...new Set([...leadUserFilter.employee_id, ...leadUserFilter.employee_name])];
  //     leadUserFilter.uid = mergedValues;
  //   } else {
  //     leadUserFilter.uid = leadUserFilter.employee_id || leadUserFilter.employee_name;
  //   }
  
  //   delete leadUserFilter.employee_id;
  //   delete leadUserFilter.employee_name;
  // }

  if (!isObjectEmpty(leadUserFilter)) {
    var query = "";
    const regex = /],/gi;
    const regex1 = /:/gi;
    var cc = JSON.stringify(leadUserFilter);
    var dd = cc.replace(regex, ']##').replace(regex1, ':{"$in":').slice(1).slice(0, -1);
    console.log("Old : " + cc);
    console.log("New : " + dd);
    var ee = dd.split('##');
    console.log("Split:" + ee);

    Object.keys(ee).forEach((key) => {
      console.log("Keys :" + key);
      console.log("Values :" + ee[key] + '}');
      query = query + ee[key] + '},';
    });
    var finalQuery = '{' + query.slice(0, -1) + '}';
    console.log("Final Query : " + finalQuery);
  }
  !isObjectEmpty(leadUserFilter) &&
    Object.keys(leadUserFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadUserFilter[key].length &&
          leadUserFilter[key].length === 2
        ) {
          leadUserFilter[key] = {
            $gte: new Date(leadUserFilter[key][0]),
            $lte: new Date(leadUserFilter[key][1]),
          };
        }
      } else {
        leadUserFilter[key] = { $in: leadUserFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });
  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadFilter[key].length &&
          leadFilter[key].length === 2
        ) {
          leadFilter[key] = {
            $gte: new Date(leadFilter[key][0]),
            $lte: new Date(leadFilter[key][1]),
          };
        }
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });
  if (!isObjectEmpty(leadUserFilter)) {
    const fullFinalQuery = JSON.parse(finalQuery);

    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    Object.keys(uidTeamTo).forEach((key) => {
      // console.log("Key:" + key);
      // console.log("Value:" + uidTeamTo[key].uid);
      uidKeys.push(uidTeamTo[key].uid);
    });
    // console.log("Team uid Key array :" + uidKeys);
  }


  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });
  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "Id",
      foreignField: "leadId",
      as: "tasks",
    },
  };
  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [{ organization_id }, { stage: "CALLBACK" }, type];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }
        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          });
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {

          const query = [
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ];
          console.log("callback Query :" + JSON.stringify(query));
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }
        countHelp(report);

        //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id,status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          const existingOwners = report.map(item => item.owner);

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, call_back_reason: [], total: 0 };
          });

          report = [...report, ...arr]

        }

        ////////////////////////////////////////////////////////////////////////////////

        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const and = [{ uid: { $in: usersList } }, { stage: "CALLBACK" }, type];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);

        //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id,status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] }, branch: { $in: permission } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          const existingOwners = report.map(item => item.owner);

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, call_back_reason: [], total: 0 };
          });

          report = [...report, ...arr]

        }

        ////////////////////////////////////////////////////////////////////////////////
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    if (type.source_status === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      const and = [{ uid: { $in: usersList } }, { stage: "CALLBACK" }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }
      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          console.log("Team Lead Keys :" + key);
          if (key == "reporting_to") {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: { $in: uidKeys } });
          }
          else if (key == "branch") {
            and.push({ [`${key == "branch" ? "uid" : key}`]: { $in: uidKeys } });
          }
          else {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {

        const query = [
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ];
        console.log("Team Lead query : " + JSON.stringify(query));
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);
         //////////////////////Non performing user functionality ////////////////////////////
         if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          const uids = await getTeamUsersForNonPerforming(uid, organization_id)
  
          const existingOwners = report.map(item => item.owner);
  
          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));
  
          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, call_back_reason: [], total: 0 };
          });
  
          report = [...report, ...arr]
  
        }
  
  
  
        ////////////////////////////////////////////////////////////////////////////////
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {

    try {
      if (type.source_status === true) {
        return res.send("Only for Lead manager");
      }
      const and = [{ uid }, { stage: "CALLBACK" }, type];
      let report;
      if (date_condition) {
        and.push(date_condition);
      }
      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }
      if (!isObjectEmpty(leadFilter)) {
        and.push(leadFilter);
      }
      let lookupand = [];
      if (!isObjectEmpty(taskFilter)) {
        lookupand.push(taskFilter);
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        const query = [
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ];
        console.log("Sales query :" + JSON.stringify(query));
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);

      let empty = isObjectEmpty(ChartCount);

      let emptyArray = [];

      if (!empty) {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });}
      else
       {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount: emptyArray, Total })
        res.send({ report, ChartCount: emptyArray, Total });}
    } catch (error) {
      res.send({ error });
    }
  }
}
};



leadController.InterestedReport = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  // for date leadFilters
  const date_parameter = "lead_assign_time";

  let start_date, end_date, date_condition;

  const resultCacheData = getCachedData(req.body);
  if (resultCacheData.cachedData !== undefined && req.body.updateData === false) {
  //  updateAccessTime(resultCacheData.CacheKey);
   return res.send(resultCacheData.cachedData)
 }else{

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
      .toDate();
  }

  if (req.body.start_date && req.body.end_date) {
    date_condition = {
      [`${date_parameter}`]: {
        $gte: start_date,
        $lte: end_date,
      },
    };
  }

  // parameters - ['budget', 'property_type', 'location', 'project', 'property_stage', 'property_type']
  const parameter = req.body.parameter;
console.log("parameter",parameter)
  let groupByAssociate;

  if (parameter === "stage_change_at") {
    groupByAssociate = {
      $group: {
        _id: {
          owner: "$uid",
          [`${parameter}`]: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: `$${parameter}`,
              timezone: "+05:30",
            },
          },
        },
        num: { $sum: 1 },
      },
    };
  } else {
    groupByAssociate = {
      $group: {
        _id: {
          owner: "$uid",
          [`${parameter}`]: `$${parameter}`,
        },
        num: { $sum: 1 },
      },
    };
  }

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  let groupBySource;

  if (parameter === "stage_change_at") {
    groupBySource = {
      $group: {
        _id: {
          lead_source: "$lead_source",
          [`${parameter}`]: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: `$${parameter}`,
              timezone: "+05:30",
            },
          },
        },
        num: { $sum: 1 },
      },
    };
  } else {
    groupBySource = {
      $group: {
        _id: {
          lead_source: "$lead_source",
          [`${parameter}`]: `$${parameter}`,
        },
        num: { $sum: 1 },
      },
    };
  }

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.lead_source",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectSource = {
    $project: {
      lead_source: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  // types - associate or source
  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associate_status: true };
    group = groupByAssociate;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { source_status: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};

  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element[`${parameter}`];
      makeKey.forEach((c) => {
        var key = c[`${parameter}`];
        if (!ChartCount[key]) {
          ChartCount[key] = c.count;
          Total += c.count;
        } else {
          ChartCount[key] += c.count;
          Total += c.count;
        }
      });
    });
  };
  let uidKeys = [];
  let isReportingTo = false;
  let isBranchTo = false;
  let isTeamTo = false;
  const leadFilter = req.body.leadFilter;
  const taskFilter = req.body.taskFilter;
  const leadUserFilter = req.body.leadUserFilter;

  if(leadFilter){
    if ('employee_id' in leadFilter || 'employee_name' in leadFilter || 'contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('employee_id' in leadFilter && 'employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id, ...leadFilter.employee_name);
      } else if ('employee_id' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id);
      } else if ('employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_name);
      }
    
      if ('contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter.contact_owner_email);
      }
    
      leadFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete leadFilter.employee_id;
      delete leadFilter.employee_name;
    }
  }

  // if ('employee_id' in leadUserFilter || 'employee_name' in leadUserFilter) {
  //   if ('employee_id' in leadUserFilter && 'employee_name' in leadUserFilter) {
  //     const mergedValues = [...new Set([...leadUserFilter.employee_id, ...leadUserFilter.employee_name])];
  //     leadUserFilter.uid = mergedValues;
  //   } else {
  //     leadUserFilter.uid = leadUserFilter.employee_id || leadUserFilter.employee_name;
  //   }
  
  //   delete leadUserFilter.employee_id;
  //   delete leadUserFilter.employee_name;
  // }

  // console.log("LeadUser filter values object :" + JSON.stringify(leadUserFilter));
  if (!isObjectEmpty(leadUserFilter)) {
    var query = "";
    const regex = /],/gi;
    const regex1 = /:/gi;
    var cc = JSON.stringify(leadUserFilter);
    var dd = cc.replace(regex, ']##').replace(regex1, ':{"$in":').slice(1).slice(0, -1);
    console.log("Old : " + cc);
    console.log("New : " + dd);
    var ee = dd.split('##');
    console.log("Split:" + ee);

    Object.keys(ee).forEach((key) => {
      console.log("Keys :" + key);
      console.log("Values :" + ee[key] + '}');
      query = query + ee[key] + '},';
    });
    var finalQuery = '{' + query.slice(0, -1) + '}';
    console.log("Final Query : " + finalQuery);
  }


  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadFilter[key].length &&
          leadFilter[key].length === 2
        ) {
          leadFilter[key] = {
            $gte: new Date(leadFilter[key][0]),
            $lte: new Date(leadFilter[key][1]),
          };
        }
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });

  if (isReportingTo == true) {
    console.log("DATA : " + JSON.stringify(leadFilter["reporting_to"]));
    const uidReportingTo = await userModel.find({ "reporting_to": leadFilter["reporting_to"] }, { "_id": 0, "uid": 1 });
    console.log("UID : " + uidReportingTo);
    // uidReport(uidReportingTo);

    Object.keys(uidReportingTo).forEach((key) => {
      console.log("Key:" + key);
      console.log("Value:" + uidReportingTo[key].uid);
      uidKeys.push(uidReportingTo[key].uid);
    });
    console.log("UID Key arr:" + uidKeys);

  }

  if (isBranchTo == true) {
    const uidBranchTo = await userModel.find({ "branch": leadFilter["branch"] }, { "_id": 0, "uid": 1 });
    Object.keys(uidBranchTo).forEach((key) => {
      console.log("Key:" + key);
      console.log("Value:" + uidBranchTo[key].uid);
      uidKeys.push(uidBranchTo[key].uid);
    });
    console.log("Branch uid Key array :" + uidKeys);
  }

  if (isTeamTo == true) {
    const uidTeamTo = await userModel.find({ "team": leadFilter["team"] }, { "_id": 0, "uid": 1 });
    Object.keys(uidTeamTo).forEach((key) => {
      console.log("Key:" + key);
      console.log("Value:" + uidTeamTo[key].uid);
      uidKeys.push(uidTeamTo[key].uid);
    });
    console.log("Team uid Key array :" + uidKeys);
  }

  if (!isObjectEmpty(leadUserFilter)) {
    const fullFinalQuery = JSON.parse(finalQuery);

    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    Object.keys(uidTeamTo).forEach((key) => {
      // console.log("Key:" + key);
      // console.log("Value:" + uidTeamTo[key].uid);
      uidKeys.push(uidTeamTo[key].uid);
    });
    // console.log("Team uid Key array :" + uidKeys);
  }

  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "Id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  const dateArrayFormat = (countArr, start, end) => {
    const res = [];
    if (start === "") {
      start = moment()
        .utcOffset("+05:30")
        .subtract(30, "days");
      end = moment().utcOffset("+05:30");

      for (
        let m = start;
        m.isBefore(end);
        m.add(1, "days")
      ) {
        if (
          !countArr.hasOwnProperty(m.format("DD-MM-YYYY"))
        ) {
          res.push({ [`${m.format("DD-MM-YYYY")}`]: 0 });
        } else {
          res.push({
            [`${m.format("DD-MM-YYYY")}`]:
              countArr[m.format("DD-MM-YYYY")],
          });
        }
      }
    } else {
      let endDate = moment(end).utcOffset("+05:30");
      for (
        let m = moment(start).utcOffset("+05:30");
        m.isBefore(endDate);
        m.add(1, "days")
      ) {
        if (
          !countArr.hasOwnProperty(m.format("DD-MM-YYYY"))
        ) {
          res.push({ [`${m.format("DD-MM-YYYY")}`]: 0 });
        } else {
          res.push({
            [`${m.format("DD-MM-YYYY")}`]:
              countArr[m.format("DD-MM-YYYY")],
          });
        }
      }
    }
    return res;
  };

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [
          { organization_id },
          { stage: "INTERESTED" },
          type,
        ];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            if (key == "reporting_to") {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: { $in: uidKeys } });
            }
            else if (key == "branch") {
              and.push({ [`${key == "branch" ? "uid" : key}`]: { $in: uidKeys } });
            }
            else if (key == "team") {
              and.push({ [`${key == "team" ? "uid" : key}`]: { $in: uidKeys } });
            }
            else {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            }
            // and.push({ [`${key=="reporting_to"?"uid":key}`]: key=="reporting_to"?{ $in: uidKeys}:leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          const query = [
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ];
          console.log("Intrested User Query : " + JSON.stringify(query));
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);
        //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id, status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          const existingOwners = report.map(item => item.owner);

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val,  [`${parameter}`]: [], total: 0 };
          });

          report = [...report, ...arr]

        }

        ////////////////////////////////////////////////////////////////////////////////

        // let empty = isObjectEmpty(ChartCount);

        // let emptyArray = [];
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });
        // else res.send({ report, ChartCount: emptyArray, Total });
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const and = [
          { uid: { $in: usersList } },
          { stage: "INTERESTED" },
          type,
        ];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);

             //////////////////////Non performing user functionality ////////////////////////////
             if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
              let mapper = await userModel
                .find(
                  { organization_id: organization_id, status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] }, branch: { $in: permission } },
                  { uid: 1, _id: 0 }
                )
                .lean();
    
              const uids = mapper.map((val) => val.uid);
    
              const existingOwners = report.map(item => item.owner);
    
              let filterArr = uids.filter((elem) => !existingOwners.includes(elem));
    
              // filterArr=[... new Set(filterArr)]
              const arr = filterArr.map((val) => {
                return { owner: val,  [`${parameter}`]: [], total: 0 };
              });
    
              report = [...report, ...arr]
    
            }
    
            ////////////////////////////////////////////////////////////////////////////////

        // let empty = isObjectEmpty(ChartCount);

        // let emptyArray = [];
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });
        // else res.send({ report, ChartCount: emptyArray, Total });
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    if (type.source_status === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      const and = [
        { uid: { $in: usersList } },
        { stage: "INTERESTED" },
        type,
      ];

      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          if (key == "reporting_to") {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: { $in: uidKeys } });
          }
          else if (key == "branch") {
            and.push({ [`${key == "branch" ? "uid" : key}`]: { $in: uidKeys } });
          }
          else {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
          // and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);

      //////////////////////Non performing user functionality ////////////////////////////
      if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
        const uids = await getTeamUsersForNonPerforming(uid, organization_id)

        const existingOwners = report.map(item => item.owner);

        let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

        // filterArr=[... new Set(filterArr)]
        const arr = filterArr.map((val) => {
          return { owner: val,  [`${parameter}`]: [], total: 0 };
        });

        report = [...report, ...arr]

      }

      ////////////////////////////////////////////////////////////////////////////////

      // let empty = isObjectEmpty(ChartCount);

      // let emptyArray = [];
      checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
      res.send({ report, ChartCount, Total });

      // else res.send({ report, ChartCount: emptyArray, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (type.source_status === true) {
        return res.send("Only for Lead manager");
      }

      const and = [{ uid }, { stage: "INTERESTED" }, type];

      let report;

      if (date_condition) {
        and.push(date_condition);
      }
      //  else {
      //   date_condition = {
      //     [`${date_parameter}`]: {
      //       $gte: new Date(
      //         Date.now() - 30 * 24 * 60 * 60 * 1000
      //       ),
      //       $lte: new Date(),
      //     },
      //   };
      //   and.push(date_condition);
      // }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);

      if (
        report.length > 0 &&
        parameter === "stage_change_at"
      )
        ChartCount = dateArrayFormat(
          ChartCount,
          start_date ? moment(start_date) : "",
          end_date ? moment(end_date) : ""
        );

      let empty = isObjectEmpty(ChartCount);

      let emptyArray = [];
      if (!empty) {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });}
      else
        {
          checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount: emptyArray, Total })
          res.send({ report, ChartCount: emptyArray, Total });}
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  }
}
};

leadController.InterestedReportOptimized = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  // for date leadFilters
  const date_parameter = "lead_assign_time";

  let start_date, end_date, date_condition;

  const resultCacheData = getCachedData(req.body);
  if (resultCacheData.cachedData !== undefined && req.body.updateData === false) {
    
  //  updateAccessTime(resultCacheData.CacheKey);
   return res.send(resultCacheData.cachedData)
 }else{
  

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
      .toDate();
  }

  if (req.body.start_date && req.body.end_date) {
    date_condition = {
      [`${date_parameter}`]: {
        $gte: start_date,
        $lte: end_date,
      },
    };
  }

  // parameters - ['budget', 'property_type', 'location', 'project', 'property_stage', 'property_type']
  const parameter = req.body.parameter;

  let groupByAssociate = { "$facet": { "budget": [{ "$group": { "_id": { "owner": "$uid", "budget": "$budget" }, "budgetCount": { "$sum": 1 } } }, { "$group": { "_id": { "owner": "$_id.owner" }, "budget": { "$addToSet": { "budget": "$_id.budget", "count": "$budgetCount" } }, "totalBudget": { "$sum": "$budgetCount" } } }, { "$project": { "owner": "$_id.owner", "_id": 0, "budget": 1, "totalBudget": 1, "location": null, "project": null } }], "location": [{ "$group": { "_id": { "owner": "$uid", "location": "$location" }, "locationCount": { "$sum": 1 } } }, { "$group": { "_id": { "owner": "$_id.owner" }, "location": { "$addToSet": { "location": "$_id.location", "count": "$locationCount" } }, "totalLocation": { "$sum": "$locationCount" } } }, { "$project": { "owner": "$_id.owner", "_id": 0, "location": 1, "totalLocation": 1, "budget": null, "project": null } }], "project": [{ "$group": { "_id": { "owner": "$uid", "project": "$project" }, "projectCount": { "$sum": 1 } } }, { "$group": { "_id": { "owner": "$_id.owner" }, "project": { "$addToSet": { "project": "$_id.project", "count": "$projectCount" } }, "totalProject": { "$sum": "$projectCount" } } }, { "$project": { "owner": "$_id.owner", "_id": 0, "project": 1, "totalProject": 1, "budget": null, "location": null } }], "property_type": [{ "$group": { "_id": { "owner": "$uid", "property_type": "$property_type" }, "property_typeCount": { "$sum": 1 } } }, { "$group": { "_id": { "owner": "$_id.owner" }, "property_type": { "$addToSet": { "property_type": "$_id.property_type", "count": "$property_typeCount" } }, "totalproperty_type": { "$sum": "$property_typeCount" } } }, { "$project": { "owner": "$_id.owner", "_id": 0, "property_type": 1, "totalproperty_type": 1, "project": null, "budget": null, "location": null } }], "property_stage": [{ "$group": { "_id": { "owner": "$uid", "property_stage": "$property_stage" }, "property_stageCount": { "$sum": 1 } } }, { "$group": { "_id": { "owner": "$_id.owner" }, "property_stage": { "$addToSet": { "property_stage": "$_id.property_stage", "count": "$property_stageCount" } }, "totalproperty_stage": { "$sum": "$property_stageCount" } } }, { "$project": { "owner": "$_id.owner", "_id": 0, "property_stage": 1, "totalproperty_stage": 1, "project": null, "budget": null, "location": null, "property_type": null } }] } };

  const groupByAssociatePropertyType = {
    "$project": {
      "data": {
        "$concatArrays": [
          "$budget",
          "$location",
          "$project",
          "$property_type",
          "$property_stage"
        ]
      }
    }
  };

  const unwind = {
    "$unwind": "$data"
  };

  const projectAssociate = { "$group": { "_id": "$data.owner", "location": { "$push": { "$ifNull": ["$data.location", "$$REMOVE"] } }, "budget": { "$push": { "$ifNull": ["$data.budget", "$$REMOVE"] } }, "project": { "$push": { "$ifNull": ["$data.project", "$$REMOVE"] } }, "property_type": { "$push": { "$ifNull": ["$data.property_type", "$$REMOVE"] } }, "property_stage": { "$push": { "$ifNull": ["$data.property_stage", "$$REMOVE"] } }, "totalBudget": { "$sum": "$data.totalBudget" }, "totalLocation": { "$sum": "$data.totalLocation" }, "totalProject": { "$sum": "$data.totalProject" }, "totalproperty_type": { "$sum": "$data.totalproperty_type" }, "totalproperty_stage": { "$sum": "$data.totalproperty_stage" } } };

  const projectFinal = { "$project": { "_id": 0, "owner": "$_id", "location": { "$arrayElemAt": ["$location", 0] }, "project": { "$arrayElemAt": ["$project", 0] }, "budget": { "$arrayElemAt": ["$budget", 0] }, "property_type": { "$arrayElemAt": ["$property_type", 0] }, "property_stage": { "$arrayElemAt": ["$property_stage", 0] }, "totalBudget": 1, "totalLocation": 1, "totalProject": 1, "totalproperty_type": 1, "totalproperty_stage": 1 } };

  let groupBySource = {
    $group: {
      _id: {
        lead_source: "$lead_source",
        [`${parameter}`]: `$${parameter}`,
      },
      num: { $sum: 1 },
    },
  };

  // const groupByAssociatePropertyType = {
  //   "$project": {
  //     "data": {
  //       "$concatArrays": [
  //         "$budget",
  //         "$location",
  //         "$project",
  //         "$property_type",
  //         "$property_stage"
  //       ]
  //     }
  //   }
  // };
  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.lead_source",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectSource = {
    $project: {
      lead_source: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  // types - associate or source
  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associate_status: true };
    group = groupByAssociate;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    console.log("type", req.params.type)
    type = { source_status: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};

  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      for (var i = 0; i < parameter.length; i++) {
        var makeKey = element[`${parameter[i]}`];
        makeKey.forEach((c) => {
          var key = c[`${parameter[i]}`];
          if (!ChartCount[key]) {
            ChartCount[key] = c.count;
            Total += c.count;
          } else {
            ChartCount[key] += c.count;
            Total += c.count;
          }
        });
      }
    });
  };

  const leadFilter = req.body.leadFilter;
  const taskFilter = req.body.taskFilter;

  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadFilter[key].length &&
          leadFilter[key].length === 2
        ) {
          leadFilter[key] = {
            $gte: new Date(leadFilter[key][0]),
            $lte: new Date(leadFilter[key][1]),
          };
        }
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
      }
    });

  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "Id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  const dateArrayFormat = (countArr, start, end) => {
    const res = [];
    if (start === "") {
      start = moment()
        .utcOffset("+05:30")
        .subtract(30, "days");
      end = moment().utcOffset("+05:30");

      for (
        let m = start;
        m.isBefore(end);
        m.add(1, "days")
      ) {
        if (
          !countArr.hasOwnProperty(m.format("DD-MM-YYYY"))
        ) {
          res.push({ [`${m.format("DD-MM-YYYY")}`]: 0 });
        } else {
          res.push({
            [`${m.format("DD-MM-YYYY")}`]:
              countArr[m.format("DD-MM-YYYY")],
          });
        }
      }
    } else {
      let endDate = moment(end).utcOffset("+05:30");
      for (
        let m = moment(start).utcOffset("+05:30");
        m.isBefore(endDate);
        m.add(1, "days")
      ) {
        if (
          !countArr.hasOwnProperty(m.format("DD-MM-YYYY"))
        ) {
          res.push({ [`${m.format("DD-MM-YYYY")}`]: 0 });
        } else {
          res.push({
            [`${m.format("DD-MM-YYYY")}`]:
              countArr[m.format("DD-MM-YYYY")],
          });
        }
      }
    }
    return res;
  };
  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [
          { organization_id },
          { stage: "INTERESTED" },
          type,
        ];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            unwind,
            project,
            projectFinal
          ]);
        }
        countHelp(report);

        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })

        res.send({ report, ChartCount, Total });
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const and = [
          { uid: { $in: usersList } },
          { stage: "INTERESTED" },
          type,
        ];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            unwind,
            project,
            projectFinal
          ]);
        }

        countHelp(report);

        // let empty = isObjectEmpty(ChartCount);

        // let emptyArray = [];
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })

        res.send({ report, ChartCount, Total });
        // else res.send({ report, ChartCount: emptyArray, Total });
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    if (type.source_status === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      const and = [
        { uid: { $in: usersList } },
        { stage: "INTERESTED" },
        type,
      ];

      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        const query = [
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          unwind,
          project,
          projectFinal
        ];
        console.log("Lead Team Query :" + JSON.stringify(query));
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          unwind,
          project,
          projectFinal
        ]);
      }

      countHelp(report);

      // let empty = isObjectEmpty(ChartCount);

      // let emptyArray = [];
      checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })

      res.send({ report, ChartCount, Total });
      // else res.send({ report, ChartCount: emptyArray, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (type.source_status === true) {
        return res.send("Only for Lead manager");
      }

      const and = [{ uid }, { stage: "INTERESTED" }, type];

      let report;

      if (date_condition) {
        and.push(date_condition);
      } 
      // else {
      //   date_condition = {
      //     [`${date_parameter}`]: {
      //       $gte: new Date(
      //         Date.now() - 30 * 24 * 60 * 60 * 1000
      //       ),
      //       $lte: new Date(),
      //     },
      //   };
      //   and.push(date_condition);
      // }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });
        console.log("IF condition Process :");

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        const query = [
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          unwind,
          project,
          projectFinal
        ];
        console.log("Else condition Process :" + JSON.stringify(query));
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          unwind,
          project,
          projectFinal
        ]);
      }

      countHelp(report);

      if (
        report.length > 0 &&
        parameter === "stage_change_at"
      )
        ChartCount = dateArrayFormat(
          ChartCount,
          start_date ? moment(start_date) : "",
          end_date ? moment(end_date) : ""
        );

      let empty = isObjectEmpty(ChartCount);

      let emptyArray = [];

      if (!empty) {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });}
      else
       {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount: emptyArray, Total })
        res.send({ report, ChartCount: emptyArray, Total });
      }
    } catch (error) {
      // console.log(error);
      res.send({ error });
    }
  }
}
};


leadController.ReasonReport = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

const resultCacheData = getCachedData(req.body);
  if (resultCacheData.cachedData !== undefined && req.body.updateData === false) {
    
  //  updateAccessTime(resultCacheData.CacheKey);
   return res.send(resultCacheData.cachedData)
 }else{
  

  // for date leadFilters
  const date_parameter = "lead_assign_time";

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
      .toDate();
  }

  if (req.body.start_date && req.body.end_date) {
    date_condition = {
      [`${date_parameter}`]: {
        $gte: start_date,
        $lte: end_date,
      },
    };
  }

  // paramters - ['call_back_reason', 'not_int_reason', 'lost_reason']
  const parameter = req.body.parameter || "";

  // stage - ['WON', 'NOT INTERESTED', 'CALLBACK']
  const stage = req.body.stage || "";

  // pipeline condition for grouping
  let condition;

  if (parameter === "call_back_reason") {
    condition = {
      call_back_reason: { $exists: true, $ne: "" },
    };
  } else if (parameter === "not_int_reason") {
    condition = {
      not_int_reason: { $exists: true, $ne: "" },
    };
  } else if (parameter === "lost_reason") {
    condition = { lost_reason: { $exists: true, $ne: "" } };
  }

  const groupByOwner = {
    $group: {
      _id: {
        owner: "$uid",
        [`${parameter}`]: `$${parameter}`,
      },
      num: { $sum: 1 },
    },
  };

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  const groupBySource = {
    $group: {
      _id: {
        lead_source: "$lead_source",
        [`${parameter}`]: `$${parameter}`,
      },
      num: { $sum: 1 },
    },
  };

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.lead_source",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectSource = {
    $project: {
      lead_source: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  // types - associate or source
  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associate_status: true };
    group = groupByOwner;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { source_status: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};

  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element[`${parameter}`];
      makeKey.forEach((c) => {
        var key = c[`${parameter}`];
        if (!ChartCount[key]) {
          ChartCount[key] = c.count;
          Total += c.count;
        } else {
          ChartCount[key] += c.count;
          Total += c.count;
        }
      });
    });
  };
  let uidKeys = [];
  let isReportingTo = false;
  let isBranchTo = false;
  let isTeamTo = false;
  const leadFilter = req.body.leadFilter;
  const taskFilter = req.body.taskFilter;
  const leadUserFilter = req.body.leadUserFilter;

  if(leadFilter){
    if ('employee_id' in leadFilter || 'employee_name' in leadFilter || 'contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('employee_id' in leadFilter && 'employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id, ...leadFilter.employee_name);
      } else if ('employee_id' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id);
      } else if ('employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_name);
      }
    
      if ('contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter.contact_owner_email);
      }
    
      leadFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete leadFilter.employee_id;
      delete leadFilter.employee_name;
    }
  }

  // if ('employee_id' in leadUserFilter || 'employee_name' in leadUserFilter) {
  //   if ('employee_id' in leadUserFilter && 'employee_name' in leadUserFilter) {
  //     const mergedValues = [...new Set([...leadUserFilter.employee_id, ...leadUserFilter.employee_name])];
  //     leadUserFilter.uid = mergedValues;
  //   } else {
  //     leadUserFilter.uid = leadUserFilter.employee_id || leadUserFilter.employee_name;
  //   }
  
  //   delete leadUserFilter.employee_id;
  //   delete leadUserFilter.employee_name;
  // }

  // console.log("LeadUser filter values object :" + JSON.stringify(leadUserFilter));
  if (!isObjectEmpty(leadUserFilter)) {
    var query = "";
    const regex = /],/gi;
    const regex1 = /:/gi;
    var cc = JSON.stringify(leadUserFilter);
    var dd = cc.replace(regex, ']##').replace(regex1, ':{"$in":').slice(1).slice(0, -1);
    console.log("Old : " + cc);
    console.log("New : " + dd);
    var ee = dd.split('##');
    console.log("Split:" + ee);

    Object.keys(ee).forEach((key) => {
      console.log("Keys :" + key);
      console.log("Values :" + ee[key] + '}');
      query = query + ee[key] + '},';
    });
    var finalQuery = '{' + query.slice(0, -1) + '}';
    console.log("Final Query : " + finalQuery);
  }

  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadFilter[key].length &&
          leadFilter[key].length === 2
        ) {
          leadFilter[key] = {
            $gte: new Date(leadFilter[key][0]),
            $lte: new Date(leadFilter[key][1]),
          };
        }
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
        if (key == "reporting_to") {
          isReportingTo = true;
        }
        if (key == "branch") {
          isBranchTo = true;
        }
        if (key == "team") {
          isTeamTo = true;
        }
      }
    });

  // if (isReportingTo == true) {
  //   console.log("DATA : " + JSON.stringify(leadFilter["reporting_to"]));
  //   const uidReportingTo = await userModel.find({ "reporting_to": leadFilter["reporting_to"] }, { "_id": 0, "uid": 1 });
  //   console.log("UID : " + uidReportingTo);
  //   // uidReport(uidReportingTo);

  //   Object.keys(uidReportingTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidReportingTo[key].uid);
  //     uidKeys.push(uidReportingTo[key].uid);
  //   });
  //   console.log("UID Key arr:" + uidKeys);

  // }
  // if (isBranchTo == true) {
  //   const uidBranchTo = await userModel.find({ "branch": leadFilter["branch"] }, { "_id": 0, "uid": 1 });
  //   Object.keys(uidBranchTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidBranchTo[key].uid);
  //     uidKeys.push(uidBranchTo[key].uid);
  //   });
  //   console.log("Branch uid Key array :" + uidKeys);
  // }
  // if (isTeamTo == true) {
  //   const uidTeamTo = await userModel.find({ "team": leadFilter["team"] }, { "_id": 0, "uid": 1 });
  //   Object.keys(uidTeamTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidTeamTo[key].uid);
  //     uidKeys.push(uidTeamTo[key].uid);
  //   });
  //   console.log("Team uid Key array :" + uidKeys);
  // }
  if (!isObjectEmpty(leadUserFilter)) {
    const fullFinalQuery = JSON.parse(finalQuery);

    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    Object.keys(uidTeamTo).forEach((key) => {
      // console.log("Key:" + key);
      // console.log("Value:" + uidTeamTo[key].uid);
      uidKeys.push(uidTeamTo[key].uid);
    });
    // console.log("Team uid Key array :" + uidKeys);
  }

  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [
          { organization_id },
          { stage },
          condition,
          type,
        ];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }
        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            if (key == "reporting_to") {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: { $in: uidKeys } });
            }
            else if (key == "branch") {
              and.push({ [`${key == "branch" ? "uid" : key}`]: { $in: uidKeys } });
            }
            else if (key == "team") {
              and.push({ [`${key == "team" ? "uid" : key}`]: { $in: uidKeys } });
            }
            else {
              and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            }
            // and.push({ [`${key=="reporting_to"?"uid":key}`]: key=="reporting_to"?{ $in: uidKeys}:leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);

        //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email  && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id, status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          const existingOwners = report.map(item => item.owner);

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, [`${parameter}`]: [], total: 0 };
          });

          report = [...report, ...arr]

        }

        ////////////////////////////////////////////////////////////////////////////////

        // let empty = isObjectEmpty(ChartCount);

        // let emptyArray = [];

        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })

        res.send({ report, ChartCount, Total });
        // else res.send({ report, ChartCount: emptyArray, Total });
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const and = [
          { uid: { $in: usersList } },
          { stage },
          condition,
          type,
        ];

        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);
        //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id, status:"ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] }, branch: { $in: permission } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          const existingOwners = report.map(item => item.owner);

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, [`${parameter}`]: [], total: 0 };
          });

          report = [...report, ...arr]

        }

        ////////////////////////////////////////////////////////////////////////////////

        // let empty = isObjectEmpty(ChartCount);

        // let emptyArray = [];

        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })

        res.send({ report, ChartCount, Total });
        // else res.send({ report, ChartCount: emptyArray, Total });
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    if (type.source_status === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      const and = [
        { uid: { $in: usersList } },
        { stage },
        condition,
        type,
      ];

      let report;

      if (date_condition) {
        and.push(date_condition);
      }
      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          if (key == "reporting_to") {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: { $in: uidKeys } });
          }
          else if (key == "branch") {
            and.push({ [`${key == "branch" ? "uid" : key}`]: { $in: uidKeys } });
          }

          else {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
          // and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);

      //////////////////////Non performing user functionality ////////////////////////////
      if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
        const uids = await getTeamUsersForNonPerforming(uid, organization_id)

        const existingOwners = report.map(item => item.owner);

        let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

        // filterArr=[... new Set(filterArr)]
        const arr = filterArr.map((val) => {
          return { owner: val, [`${parameter}`]: [], total: 0 };
        });

        report = [...report, ...arr]

      }

      ////////////////////////////////////////////////////////////////////////////////
      

      // let empty = isObjectEmpty(ChartCount);

      // let emptyArray = [];

      checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })

      res.send({ report, ChartCount, Total });
      // else res.send({ report, ChartCount: emptyArray, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (type.source_status === true) {
        console.log(type);
        return res.send("Only for Lead manager");
      }

      const and = [{ uid }, { stage }, condition, type];

      let report;

      if (date_condition) {
        and.push(date_condition);
      } else {
        date_condition = {
          [`${date_parameter}`]: {
            $gte: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000
            ),
            $lte: new Date(),
          },
        };
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);

      let empty = isObjectEmpty(ChartCount);

      let emptyArray = [];

      if (!empty){
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });}
      else
       {
        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount: emptyArray, Total })
        res.send({ report, ChartCount: emptyArray, Total });}
    } catch (error) {
      res.send({ error });
    }
  }
}
};

leadController.TaskSearch = async (req, res) => {
  const uid = req.body.uid;
  let filter = req.body.filter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString
    ? req.body.searchString
    : "";
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);
  let typeFilter=[];

  // console.log("filters",filter)

  if(filter){
    if ("type" in filter){
      typeFilter =  filter["type"] ;
      delete filter.type;
    }
  }

  Object.keys(filter).forEach((key) => {
    if (datesField.includes(key)) {
      if (filter[key].length && filter[key].length === 2) {
        filter[key] = {
          $gte: new Date(filter[key][0]),
          $lte: new Date(filter[key][1]),
        };
      }
    } else if (booleanField.includes(key)) {
      filter[key].forEach((element, index) => {
        if (element === "True") {
          filter[key][index] = true;
        } else if (element === "False") {
          filter[key][index] = false;
        }
      });
    } else {
      filter[key] = { $in: filter[key] };
    }
  });

  if (missed === true) {
    filter["next_follow_up_date_time"] = {
      $lt: new Date(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  searchString.split(",").forEach((string) => {
    search = string.trim();
    const re = new RegExp(search, "i");
    if (search.match(/^[0-9]+$/) != null) {
      contact_list.push(re);
    } else if (search !== "") {
      customer_name_list.push(re);
    }
  });

  if (contact_list.length !== 0) {
    filter["contact_no"] = { $in: contact_list };
  }

  if (customer_name_list.length !== 0) {
    filter["customer_name"] = { $in: customer_name_list };
  }

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  let sortModified = {};

  for (const [key, value] of Object.entries(sort)) {
    let val = parseInt(value);
    sortModified[key] = val;
  }

  const sortQuery = {
    $sort: sortModified,
  };

  const limitQuery = {
    $limit: pageSize,
  };

  const skipQuery = {
    $skip: (page - 1) * pageSize,
  };

  const lookup = {
    $lookup: {
      from: "tasks",
      localField: "Id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        let and = [
          { organization_id },
          { transfer_status: false },
          { stage: { $in: ["INTERESTED"] } },
        ];
        if (!isObjectEmpty(filter)) {
          const keys = Object.keys(filter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: filter[key] });
          });

          // and.push(filter);
        }

        let leads = await leadModel.aggregate([
          lookup,
          { $unwind: "$tasks" },
          {
            $match: {
              "tasks.type": {
                $in: ["Site Visit", "Meeting"],
              },
              "tasks.status": "Completed",
            },
          },
          {
            $match: {
              $and: and,
            },
          },
          // { $project: { tasks: 0 } },
          {
            $group: {
              _id: "$Id",
              doc: { $first: "$$ROOT" },
            },
          },
          { $replaceRoot: { newRoot: "$doc" } },
          {
            $addFields: {
              type: "$tasks.type"
            }
          },
          {
            $project: {
              tasks: 0,
            }
          },
          sortQuery,
          skipQuery,
          limitQuery,
        ]);

        const arrayUniqueByKey = Object.keys(
          leads.reduce(
            (r, { _id }) => ((r[_id] = ""), r),
            {}
          )
        );

        console.log("filters",typeFilter)
        if (typeFilter.length !== 0) {
          leads = leads.filter(val => {
            return  typeFilter.length === 0 || typeFilter.includes(val.type);

          });
        }

        // console.log(
        //   "unique: ",
        //   arrayUniqueByKey.length,
        //   "leads: ",
        //   leads.length
        // );
        // console.log("page", page);
        // console.log("pageSize", pageSize);

        res.send(leads);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        let and = [
          { uid: { $in: usersList } },
          { transfer_status: false },
          { stage: { $in: ["INTERESTED"] } },
        ];

        if (!isObjectEmpty(filter)) {
          const keys = Object.keys(filter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: filter[key] });
          });
        }
        let leads = await leadModel.aggregate([
          lookup,
          { $unwind: "$tasks" },
          {
            $match: {
              "tasks.type": {
                $in: ["Site Visit", "Meeting"],
              },
              "tasks.status": "Completed",
            },
          },
          {
            $match: {
              $and: and,
            },
          },
          // { $project: { tasks: 0 } },
          {
            $group: {
              _id: "$Id",
              doc: { $first: "$$ROOT" },
            },
          },
          { $replaceRoot: { newRoot: "$doc" } },
          {
            $addFields: {
              type: "$tasks.type"
            }
          },
          {
            $project: {
              tasks: 0,
            }
          },
          sortQuery,
          skipQuery,
          limitQuery,
        ]);

        if (typeFilter.length !== 0) {
          leads = leads.filter(val => {
            return  typeFilter.length === 0 || typeFilter.includes(val.type);

          });
        }

        res.send(leads);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      let and = [
        { uid: { $in: usersList } },
        { transfer_status: false },
        { stage: { $in: ["INTERESTED"] } },
      ];

      if (!isObjectEmpty(filter)) {
        const keys = Object.keys(filter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: filter[key] });
        });
      }

      let leads = await leadModel.aggregate([
        {
          $match: {
            $and: and,
          },
        },
        lookup,
        { $unwind: "$tasks" },
        {
          $match: {
            "tasks.type": {
              $in: ["Site Visit", "Meeting"],
            },
            "tasks.status": "Completed",
          },
        },
        // { $project: { tasks: 0 } },
        {
          $group: { _id: "$Id", doc: { $first: "$$ROOT" } },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        {
          $addFields: {
            type: "$tasks.type"
          }
        },
        {
          $project: {
            tasks: 0,
          }
        },
        sortQuery,
        skipQuery,
        limitQuery,
      ]);

      if (typeFilter.length !== 0) {
        leads = leads.filter(val => {
          return  typeFilter.length === 0 || typeFilter.includes(val.type);

        });
      }
      res.send(leads);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  } else {
    try {
      let and = [
        { uid },
        { transfer_status: false },
        { stage: { $in: ["INTERESTED"] } },
      ];
      if (!isObjectEmpty(filter)) {
        const keys = Object.keys(filter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: filter[key] });
        });
      }

      let leads = await leadModel.aggregate([
        {
          $match: {
            $and: and,
          },
        },
        lookup,
        { $unwind: "$tasks" },
        {
          $match: {
            "tasks.type": {
              $in: ["Site Visit", "Meeting"],
            },
            "tasks.status": "Completed",
          },
        },
        // { $project: { tasks: 0 } },
        {
          $group: { _id: "$Id", doc: { $first: "$$ROOT" } },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        {
          $addFields: {
            type: "$tasks.type"
          }
        },
        {
          $project: {
            tasks: 0,
          }
        },
        sortQuery,
        skipQuery,
        limitQuery,
      ]);

      if (typeFilter.length !== 0) {
        leads = leads.filter(val => {
          return  typeFilter.length === 0 || typeFilter.includes(val.type);

        });
      }
      res.send(leads);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  }
};

leadController.TaskStageCount = async (req, res) => {
  const uid = req.body.uid;
  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }
  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  const lookup = {
    $lookup: {
      from: "tasks",
      localField: "Id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const count = await leadModel.aggregate([
          {
            $match: {
              organization_id,
              transfer_status: false,
              stage: { $in: ["INTERESTED"] },
            },
          },
          lookup,
          { $unwind: "$tasks" },
          {
            $match: {
              "tasks.type": {
                $in: ["Meeting", "Site Visit"],
              },
              "tasks.status": "Completed",
            },
          },
          { $group: { _id: "$_id" } },
          { $count: "count" },
        ]);

        res.send(count[0]);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        const count = await leadModel.aggregate([
          {
            $match: {
              uid: { $in: usersList },
              transfer_status: false,
              stage: { $in: ["INTERESTED"] },
            },
          },
          lookup,
          { $unwind: "$tasks" },
          {
            $match: {
              "tasks.type": {
                $in: ["Meeting", "Site Visit"],
              },
              "tasks.status": "Completed",
            },
          },
          { $group: { _id: "$_id" } },
          { $count: "count" },
        ]);

        res.send(count[0]);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      const count = await leadModel.aggregate([
        {
          $match: {
            uid: { $in: usersList },
            transfer_status: false,
            stage: { $in: ["INTERESTED"] },
          },
        },
        lookup,
        { $unwind: "$tasks" },
        {
          $match: {
            "tasks.type": {
              $in: ["Meeting", "Site Visit"],
            },
            "tasks.status": "Completed",
          },
        },
        { $group: { _id: "$_id" } },
        { $count: "count" },
      ]);

      res.send(count[0]);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  } else {
    try {
      const count = await leadModel.aggregate([
        {
          $match: {
            uid,
            transfer_status: false,
            stage: { $in: ["INTERESTED"] },
          },
        },
        lookup,
        { $unwind: "$tasks" },
        {
          $match: {
            "tasks.type": {
              $in: ["Meeting", "Site Visit"],
            },
            "tasks.status": "Completed",
          },
        },
        { $group: { _id: "$_id" } },
        { $count: "count" },
      ]);
      res.send(count[0]);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  }
};

leadController.DrillDownSearch = async (req, res) => {
  const uid = req.body.uid;
  let leadFilter = req.body.leadFilter || {};
  let taskFilter = req.body.taskFilter || {};
  // let callFilter = req.body.callFilter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString
    ? req.body.searchString
    : "";
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);
  let leadUserFilter = req.body.leadUserFilter;
  let userQuery = {};
  let report = [];
  let branchName = "";
  let teamName = "";
  let cond = false;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];

  if(leadFilter){
    if ('employee_id' in leadFilter || 'employee_name' in leadFilter || 'contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('employee_id' in leadFilter && 'employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id, ...leadFilter.employee_name);
      } else if ('employee_id' in leadFilter) {
        mergedValues.push(...leadFilter.employee_id);
      } else if ('employee_name' in leadFilter) {
        mergedValues.push(...leadFilter.employee_name);
      }
    
      if ('contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter.contact_owner_email);
      }
    
      leadFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete leadFilter.employee_id;
      delete leadFilter.employee_name;
    }
  }

  Object.keys(leadFilter).forEach((key) => {
    if (datesField.includes(key)) {
      if (
        leadFilter[key].length &&
        leadFilter[key].length === 2
      ) {
        leadFilter[key] = {
          $gte: moment(leadFilter[key][0])
            .utcOffset("+05:30")
            .toDate(),
          $lte: moment(leadFilter[key][1])
            .utcOffset("+05:30")
            .toDate(),
        };
      }
    } else if (booleanField.includes(key)) {
      leadFilter[key].forEach((element, index) => {
        if (element === "True" || element === true) {
          leadFilter[key] = true;
        } else if (element === "False" || element === false) {
          leadFilter[key] = false;
        }
      });
    } else {
      leadFilter[key] = { $in: leadFilter[key] };
    }
  });

  Object.keys(taskFilter).forEach((key) => {
    if (datesField.includes(key.split(".")[1])) {
      if (
        taskFilter[key].length &&
        taskFilter[key].length === 2
      ) {
        taskFilter[key] = {
          $gte: new Date(taskFilter[key][0]),
          $lte: new Date(taskFilter[key][1]),
        };
      }
    } else if (booleanField.includes(key.split(".")[1])) {
      taskFilter[key].forEach((element, index) => {
        if (element === "True" || element === true) {
          taskFilter[key] = true;
        } else if (element === "False" || element === false) {
          taskFilter[key] = false;
        }
      });
    } else {
      taskFilter[key] = { $in: taskFilter[key] };
    }
  });

  Object.keys(leadUserFilter).forEach((key) => {
    if (key === "reporting_to") {
      report = leadUserFilter[key];
      userQuery["reporting_to"] = { $in: report };
      cond = true;
      // delete filter[key];
    } else if (key === "branch") {
      branchName = leadUserFilter[key];
      userQuery["branch"] = { $in: branchName };
      cond = true;
      // delete filter[key];
    } else if (key === "team") {
      teamName = leadUserFilter[key];
      userQuery["team"] = { $in: teamName };
      cond = true;
      // delete filter[key];
    }
  });

  if (missed === true) {
    leadFilter["next_follow_up_date_time"] = {
      $lt: new Date(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  searchString.split(",").forEach((string) => {
    search = string.trim();
    const re = new RegExp(search, "i");
    if (search.match(/^[0-9]+$/) != null) {
      contact_list.push(re);
    } else if (search !== "") {
      customer_name_list.push(re);
    }
  });
  if (contact_list.length !== 0) {
    leadFilter["contact_no"] = { $in: contact_list };
  }
  if (customer_name_list.length !== 0) {
    leadFilter["customer_name"] = {
      $in: customer_name_list,
    };
  }

  let resultUser = "";
  if(teamUids.length < 1){
    resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
      return res.send({ error: "User Not Found" });
    }
  }

  const user = resultUser && resultUser[0];
  const profile = user && user.profile;
  const organization_id = user && user.organization_id;

  userQuery["organization_id"] = { $in: [organization_id] };

  let reportingUsers = await userModel
    .find(userQuery)
    .select("uid -_id");

  reportingUsers = reportingUsers.map(({ uid }) => uid);

  let sortModified = {};

  for (const [key, value] of Object.entries(sort)) {
    let val = parseInt(value);
    sortModified[key] = val;
  }

  const sortQuery = {
    $sort: sortModified,
  };

  const limitQuery = {
    $limit: pageSize,
  };

  const skipQuery = {
    $skip: (page - 1) * pageSize,
  };

  const lookup = {
    $lookup: {
      from: "tasks",
      localField: "Id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  let lookupand = [];

  // for getting data according to role
  const role = req.body.role;

  if (role) {
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes("All"))
      ) {
        try {
          let and;
          if (!cond) {
            and = [{ organization_id }];
          } else {
            and = [{ organization_id, uid: { $in: reportingUsers } }];
          }

          let leads;

          if (!isObjectEmpty(leadFilter)) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              and.push({ [`${key}`]: leadFilter[key] });
            });
          }
          if (!isObjectEmpty(taskFilter)) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              lookupand.push({
                [`${key}`]: taskFilter[key],
              });
            });

            leads = await leadModel.aggregate([
              { $match: { $and: and } },
              lookup,
              { $unwind: "$tasks" },
              {
                $match: {
                  $and: lookupand,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
              { $project: { tasks: 0 } },
            ]);
          } else {
            leads = await leadModel.aggregate([
              { $match: { $and: and } },
              sortQuery,
              skipQuery,
              limitQuery,
              { $project: { tasks: 0 } },
            ]);
          }
          res.send(leads);
        } catch (error) {
          res.send({ error });
        }
      } else {
        let usersList = await getBranchUsers(
          uid,
          organization_id,
          permission
        );
        try {
          let and;
          if (!cond) {
            and = [{ uid: { $in: usersList } }];
          } else {
            const interesectionArray = usersList.filter(
              (value) => reportingUsers.includes(value)
            );
            and = [{ uid: { $in: interesectionArray } }];
          }

          let leads;

          if (!isObjectEmpty(leadFilter)) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              and.push({ [`${key}`]: leadFilter[key] });
            });
          }

          if (!isObjectEmpty(taskFilter)) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              lookupand.push({
                [`${key}`]: taskFilter[key],
              });
            });

            leads = await leadModel.aggregate([
              { $match: { $and: and } },
              lookup,
              { $unwind: "$tasks" },
              {
                $match: {
                  $and: lookupand,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
              { $project: { tasks: 0 } },
            ]);
          } else {
            leads = await leadModel.aggregate([
              { $match: { $and: and } },
              sortQuery,
              skipQuery,
              limitQuery,
              { $project: { tasks: 0 } },
            ]);
          }

          res.send(leads);
        } catch (error) {
          console.log(error);
          res.send({ error });
        }
      }
    } else if (profile.toLowerCase() == "team lead") {
      let usersList = await getTeamUsers(
        uid,
        organization_id
      );
      try {

        let and;

        if (!cond) {
          and = [{ uid: { $in: usersList } }];
        } else {
          const interesectionArray = usersList.filter(
            (value) => reportingUsers.includes(value)
          );
          and = [{ uid: { $in: interesectionArray } }];
        }


        let leads;

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          leads = await leadModel.aggregate([
            { $match: { $and: and } },
            lookup,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
            { $project: { tasks: 0 } },
          ]);
        } else {
          leads = await leadModel.aggregate([
            { $match: { $and: and } },
            sortQuery,
            skipQuery,
            limitQuery,
            { $project: { tasks: 0 } },
          ]);
        }
        res.send(leads);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    } else {
      try {
        let and = [{ uid }];
        let leads;

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          leads = await leadModel.aggregate([
            { $match: { $and: and } },
            lookup,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
            { $project: { tasks: 0 } },
          ]);
        } else {
          leads = await leadModel.aggregate([
            { $match: { $and: and } },
            sortQuery,
            skipQuery,
            limitQuery,
            { $project: { tasks: 0 } },
          ]);
        }
        res.send(leads);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else {
    try {
      let and;
      if(teamUids.length > 0){
        and = [{ uid:{$in:teamUids} }];
      }else{
        and = [{ uid }];
      }
      let leads;

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: leadFilter[key] });
        });
      }

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        leads = await leadModel.aggregate([
          { $match: { $and: and } },
          lookup,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          sortQuery,
          skipQuery,
          limitQuery,
          { $project: { tasks: 0 } },
        ]);
      } else {
        leads = await leadModel.aggregate([
          { $match: { $and: and } },
          sortQuery,
          skipQuery,
          limitQuery,
          { $project: { tasks: 0 } },
        ]);
      }
      res.send(leads);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  }
};

leadController.ResolveMissData = async (req, res) => {

  try {
    const data = req.body.data;
    let resArr = [];
    for (let i = 0; i < data.length; i++) {
      console.log("Desk test :- ", data[i].docId);
      const response = await leadModel.updateOne({ "contact_owner_email": data[i].contactOwnerEmail, "transfer_status": false, "contact_no": data[i].contactNumber }, { "$set": { "Id": data[i].docId } })
      resArr.push(response, data[i].docId);
    }
    res.send(resArr);
  } catch (error) {
    console.log(error);
    res.send({ error });
  }

}

leadController.GetDuplicateLeads = async (req, res) => {
  let organization_id = req.body.organization_id
  try {
    let duplicateLeads = await leadModel.aggregate([
      { $match: { organization_id: organization_id, transfer_status: false } },
      {
        $group: {
          "_id": "$contact_no",
          "Counter": { "$sum": 1 }
        }
      },
      {
        $match: {
          "Counter": { "$gt": 1 }
        }
      },
      { "$sort": { "Counter": -1 } },
    ])
    res.status(200).send({ duplicate_leads: duplicateLeads.length,leadsData:duplicateLeads });
  } catch (error) {
    res.status(400).send({ success: false, error });
  }

}
leadController.deleteDuplicate = async (req, res) => {
  let organization_id = req.body.organization_id
  let delArr = [];
  // let delArr1 = [];
  let id
  const data = []
  try {

    let duplicateLeads = await leadModel.aggregate([
      { $match: { organization_id: organization_id, transfer_status: false, stage: { $in: ["FRESH", "INTERESTED", "CALLBACK", "NOT INTERESTED", "LOST"] } } },
      { $group: { "_id": { "Contact_no": "$contact_no", "Id": "$Id" }, "Counter": { "$sum": 1 } } },
      {
        $match: {
          "Counter": { "$gt": 1 }
        }
      },
      { "$sort": { "Counter": -1 } },
    ])
    // console.log("duplicate---------",duplicateLeads)
    duplicateLeads.map((item) =>
      delArr.push(item._id)
    )
    delArr.map(async (item) => {
      // console.log("itemmmmmmmmmmmmmmmmmarrrrrrrrrrrrrrrrrrrrrrr",item)
      await leadModel.findOne({ Id: item.Id }).exec(function (err, result) {
        console.log("data", result)
        id = result._id
        let delArr1 = ({ "id": id, "contact_no": item.Contact_no, "Id": item.Id })
        // console.log("delArr11111111111111",delArr1)
        leadModel.deleteMany({
          contact_no: delArr1.contact_no,
          Id: delArr1.Id,
          _id: { $ne: ObjectId(delArr1.id) },
          stage: "FRESH"
        }).exec(function (err, result) {
          if (err) {
            console.log(err);
            // res.status(500).send(err);
          } else {
            res.status(200).json({leads:duplicateLeads.length,leadsData:duplicateLeads});
          }
        });
      });
    })
    //  res.send(delArr);
  } catch (error) {
    res.status(400).send({ success: false, error });
  }
};
// 5x4nZ88Vm9R6Y5iFNN8Z  JV
// OsAl0DXWjg8kxLjw4goA  H&O
// 1fmAckrBdfZYdLz5xryB  RP
// RBhGIrLmVex9dG3Rlcqu  TBJ
// XEkdE9MOgBtgx4fZqcI4  SSR
// L9PL1ZDAUoF0PMiirFKi  Vihaan homes
// xuBSjiiJcxSo8nH4LYVu risevilla
// QYkNzFMyAPP4Mlx8vTxw evron

leadController.deleteDuplicateOwner = async (req, res) => {
  let organization_id = req.body.organization_id;
  let delArr = [];
  // let delArr1 = [];
  let id
  try {

    let duplicateLeads = await leadModel.aggregate([
      { $match: { organization_id: organization_id, transfer_status: false, stage: { $in: ["FRESH", "INTERESTED", "CALLBACK", "NOT INTERESTED", "LOST"] } } },
      { $group: { "_id": { "Contact_no": "$contact_no" }, "Counter": { "$sum": 1 } } },
      {
        $match: {
          "Counter": { "$gt": 1 }
        }
      },
      { "$sort": { "Counter": -1 } },
    ])
    // console.log("duplicate---------",duplicateLeads.length)
    duplicateLeads.map((item,index) => {
      // console.log("itemmmmmmmmmmmmmmmmmarrrrrrrrrrrrrrrrrrrrrrr", item);
      if(index < 400){
        delArr.push(item._id)
      }
    }
    )
    delArr.map(async (item) => {
      // console.log("itemmmmmmmmmmmmmmmmmarrrrrrrrrrrrrrrrrrrrrrr",item)
      await leadModel.find({ contact_no: item.Contact_no, organization_id: organization_id, transfer_status: false }).exec(function (err, result) {
        // id = result
        let data = [];
        result.map((item, index) => {
          // console.log("jkdsgaskdgfasjgfkdsajgfkjgas", item._id)
          // delArr1.push(item)
          const contactToCheck = item.contact_no;
          let exists = false;
          // if(index===0){
          let date
          {
            item.next_follow_up_date_time === null ?
            date = new Date(12 / 12 / 2021) :
            date = item.next_follow_up_date_time
          }
          let delArr1 = ({ "id": item._id, "contact_no": item.contact_no, "next_follow_up_date_time": date, "leadId": item.Id })
          // }
          // for (let i = 0; i < delArr.length; i++) {
          //   if (delArr[i].contact_no === contactToCheck) {
          //     exists = true;

          // break;
          //     }
          //   }
          //   console.log("existssssssssssssssssssssssssssssssss",exists)
          // console.log("delArr11111111111111", delArr1)
          data.push(delArr1)
          // console.log("existssssssssssssssssssssssssssssssss",data)
          // console.log("uniqueContactsArrayyyyyyyyyyyyyyyyyyyyyyyyyyyyy",uniqueContactsArray)
          // res.send(delArr1);
          // res.send("Deletion DONE!");
        })
        const uniqueContacts = {};

        for (let i = 0; i < data.length; i++) {
          const contact = data[i];
          const existingContact = uniqueContacts[contact.contact_no];

          if (!existingContact || contact.next_follow_up_date_time >= existingContact.next_follow_up_date_time) {
            uniqueContacts[contact.contact_no] = contact;
          }
        }

        const uniqueContactsArray = Object.values(uniqueContacts);

        // res.status(200).json({data:uniqueContactsArray});
        // res.status(200).json({ammak:uniqueContactsArray});
        uniqueContactsArray.map((item) => {
          // console.log("itemmmmmmmmmmmmmmmmmarrrrrrrrrrrrrrrrrrrrrrr",item)
          leadModel.deleteMany({
            contact_no: item.contact_no,
            organization_id: organization_id,
            transfer_status: false,
            _id: { $ne: ObjectId(item.id) }
          }).exec(function (err, result) {
            if (err) {
              console.log(err);
              // res.status(500).send(err);
            } else {
              // res.status(200).send("Deletion DONE!");
            }
          });
          taskModel.deleteMany({
                    contact_no: item.contact_no,
                    organization_id: organization_id,
                    transfer_status: false,
                    leadId: { $ne: item.leadId }
                  }).exec(function (err, result) {
                    if (err) {
                      console.log(err);
                      // res.status(500).send(err);
                    } else {
                      // res.status(200).send("Deletion DONE!");
                    }
                  });
          callLogModel.deleteMany({
                    contact_no: item.contact_no,
                    organization_id: organization_id,
                    transfer_status: false,
                    leadId: { $ne: item.leadId }
                  }).exec(function (err, result) {
                    if (err) {
                      console.log(err);
                      // res.status(500).send(err);
                    } else {
                      // res.status(200).send("Deletion DONE!");
                    }
                  });
                  console.log("Deletion kkl",item.contact_no,item.leadId)
        })
        // const now = new Date();
        // const filteredArray = result.filter(obj => obj.next_follow_up_date_time !== null && obj.next_follow_up_date_time !== undefined);
        // const dateArray = filteredArray.map(obj => new Date(obj.next_follow_up_date_time));
        // const futureDates = dateArray.filter(date => date > now);
        // const sortedDates = futureDates.sort((a, b) => a - b);
        // const nearestDate = sortedDates.shift();
        // console.log(nearestDate);
        //   //   leadModel.deleteMany({
        //   //     contact_no: delArr1.contact_no,
        //   //     Id: delArr1.Id,
        //   //     _id: { $ne: ObjectId(delArr1.id) }
        //   //   }).exec(function (err, result) {
        //   //     if (err) {
        //   //       console.log(err);
        //   //       res.status(500).send(err);
        //   //     } else {
        //   //       res.status(200).send("Deletion DONE!");
        //   //     }
        //   //   });
      });
    })
    res.status(200).json({leads:duplicateLeads.length,leadsData:duplicateLeads});
  } catch (error) {
    res.status(400).send({ success: false, error });
  }
};

// const Id = ['vPT5zppW3IoK8iNUFIlW', 'J8xSaepU44xpvwxO84xJ'];

// for (let i = 0; i < Id.length; i++) {
//   // Find the first document that matches the ID
//   const firstDocument = await db.collection.findOne({ _id: Id[i] });

//   // Delete all other documents that match the ID
//   await db.collection.deleteMany({ _id: { $ne: firstDocument._id } });
// }

// leadController.deleteData = async (req, res) => {
//   if (ObjectId.isValid(req.body.id)) {
//     const id = req.body.id;
//     leadModel
//       .findOneAndDelete({ _id: id })
//       .exec(function (err, result) {
//         if (err) {
//           console.log(err);
//           res.status(500).send(err);
//         } else {
//           res.status(200).send("Deletion DONE!");
//         }
//       });
//   } else {
//     const id = req.body.id;
//     leadModel
//       .findOneAndDelete({ Id: id })
//       .exec(function (err, result) {
//         if (err) {
//           console.log(err);
//           res.status(500).send(err);
//         } else {
//           res.status(200).send("Deletion DONE!");
//         }
//       });
//   }
// };

leadController.GetNotWorkedFreshLeads = async (req, res) => {
  let data = req.body;
  if(data.uid && data.days){
    let date = new Date(Date.now() - Number(data.days) * 24 * 60 * 60 * 1000)
    try{
      const leadsQuery = {
        stage:"FRESH",
        transfer_status:false,
        uid: data.uid,
        lead_assign_time: {
          $lt: date
        }
        // created_at: {$gte: moment(startDate).utcOffset('+05:30').toDate(),$lte: moment(endDate).utcOffset('+05:30').toDate()}
      };
      const freshLeadsTotal = await leadModel.countDocuments(leadsQuery);
      return res.status(200).json({"success": true,data:{
        totalFreshLeads:freshLeadsTotal
      }});
    }catch(err){
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }

}

leadController.CheckIfLeadExists = async (req, res) => {
  let data = req.body;
  if(data.lead_id){
    try{
      const leadsQuery = {
        Id: data.lead_id
        // created_at: {$gte: moment(startDate).utcOffset('+05:30').toDate(),$lte: moment(endDate).utcOffset('+05:30').toDate()}
      };
      const response  = await leadModel.find(leadsQuery);
      if(response.length > 0){
        return res.status(200).json({"success": true,data:{
          lead_exists:true
        }});
      }else{
        return res.status(200).json({"success": true,data:{
          lead_exists:false
        }});
      }
    }catch(err){
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }

}

leadController.missCount = async (req, res) => {
  const orgId = "OsAl0DXWjg8kxLjw4goA"
  const stages = ['INTERESTED', 'CALLBACK'];
  const query = {$and:[{organization_id:orgId},{stage: { $in: stages } },{transfer_status:false}] };
  let task
  try {
    let missdata = await leadModel.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "tasks",
          localField: "Id",
          foreignField: "leadId",
          as: "tasks"
        }
      },
      {
        $match: {
          "tasks.0": { $exists: false }
        }
      }
    ])
    missdata.map(async (item,index) => {
      if(item){
        //  firebaseTask ={
        //   budget:item.budget,
        //   contact_no:item.contact_no,
        //   contact_owner_email:item.contact_owner_email,
        //   customer_name:item.customer_name,
        //   inventory_type:item.inventory_type,
        //   location:item.location,
        //   organization_id:item.organization_id,
        //   project:item.project,
        //   source:item.lead_source,
        //   stage:item.stage,
        //   status:"ACTIVE",
        //   tasks:[{
        //     call_back_reason:item.call_back_reason,
        //     created_at:item.created_at,
        //     created_by:item.created_by,
        //     customer_name:item.customer_name,
        //     due_date:item.next_follow_up_date_time,
        //     leadId:item.Id,
        //     status:"Pending",
        //     type:item.next_follow_up_type
        //   }],
        //   transfer_status:item.transfer_status,
        //   uid:item.uid
        // }
        mongoTask={
          leadId:item.Id,
          customer_name:item.customer_name,
          contact_no:item.contact_no,
          stage:item.stage,
          contact_owner_email:item.contact_owner_email,
          call_back_reason:item.call_back_reason,
          location:item.location,
          project:item.project,
          budget:item.budget,
          transfer_status:item.transfer_status,
          unique_meeting: false,
	        unique_site_visit: false,
          created_by:item.created_by,
          created_at:item.created_at,
          type:item.next_follow_up_type,
          inventory_type:item.inventory_type,
          source:item.lead_source,
          due_date:item.next_follow_up_date_time,
          completed_at:null,
          status:"Pending",
          uid:item.uid,
          organization_id:item.organization_id,
        }
        console.log("itemmmmmmmmmmmmmmmmmarrrr5555555888888666666", index);
        console.log("itemmmmmmmmmmmmmmmmmarrrr8888888888888", item);
      }
      // try{
      //   await admin.firestore().collection('tasks').doc(item.Id).set(firebaseTask);
      // }catch (error){
      //   console.log('User Image Upload Error', error);
      // }
      // try{
      // await taskModel.create(mongoTask);
      // }catch (error){
      //   console.log('User Image Upload Error', error);
      // }
    }
    )
    res.status(200).send({missed_length:missdata.length, missed_leads: missdata });
  } catch (error) {
    res.status(400).send({ success: false, error });
  }

}


leadController.HO_missCount1 = async (req, res) => {
  const orgId = "OsAl0DXWjg8kxLjw4goA"
  const stages = ['INTERESTED', 'CALLBACK'];
  const query = {$and:[{organization_id:orgId},{stage: { $in: stages } },{transfer_status:false}] };
  let task
  
  try {
    let missdata = await taskModel.aggregate([
      {
        $match: {
          organization_id:orgId,
          transfer_status: false,
          status: "Pending"
        }
      },
      {
        $group: {
          _id: "$leadId",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ])
    missdata.map(async (item,index) => {
      let dataArr =[]
       demodata = await taskModel.find({
        organization_id: orgId,
        leadId:item._id,
        status:"Pending"
      }).exec(function (err, result){
        // console.log("dataaaa",result)
        let data = [];
        result.map((item, index) => {
          let date
          {
            item.due_date === null ?
            date = new Date(12 / 12 / 2021) :
            date = item.due_date
          }
          let delArr1 = ({ "id": item._id, "contact_no": item.contact_no, "due_date": date, "leadId": item.leadId })
          data.push(delArr1)
        })
        const uniqueContacts = {};

        for (let i = 0; i < data.length; i++) {
          const contact = data[i];
          const existingContact = uniqueContacts[contact.contact_no];

          if (!existingContact || contact.due_date >= existingContact.due_date) {
            uniqueContacts[contact.contact_no] = contact;
          }
        }

        const uniqueContactsArray = Object.values(uniqueContacts);
        
        uniqueContactsArray.map((item) => {
          console.log("uniqueContactsArray",item)
          taskModel.updateOne(
            { contact_no: item.contact_no, status: 'Pending', due_date: { $ne: item.due_date } },
            { "$set": { status: "Completed" } }
          ).exec(function (err, result) {
            if (err) {
              console.log(err);
              // res.status(500).send(err);
            } else {
              // res.status(200).send("Deletion DONE!");  { "$set": { "Id": data[i].docId } }
            }
          });
        })
      });
      // dataArr.push(demodata)
      // res.status(200).send({missed_length:dataArr.length, missed_leads: dataArr });
    }
    )
    res.status(200).send({missed_length:missdata.length, missed_leads: missdata });
  } catch (error) {
    res.status(400).send({ success: false, error });
  }

}

leadController.HO_missCount2 = async (req, res) => {
  const orgId = "OsAl0DXWjg8kxLjw4goA"
  const stages = ['INTERESTED', 'CALLBACK'];
  const query = {$and:[{organization_id:orgId},{stage: { $in: stages } },{transfer_status:false}] };
  let task
  try {
    let missdata = await taskModel.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "contacts",
          localField: "leadId",
          foreignField: "Id",
          as: "contacts"
        }
      },
      {
        $match: {
          "contacts.0": { $exists: false }
        }
      }
    ])
    missdata.map(async (item,index) => {
      taskModel.deleteOne({ _id: ObjectId(item._id) }).exec(function (err, result) {
        if (err) {
          console.log(err);
          // res.status(500).send(err);
        } else {
          // res.status(200).send("Deletion DONE!");  { "$set": { "Id": data[i].docId } }
        }
      });
      // console.log("itemmmmmmmm",item._id)
    })
    res.status(200).send({missed_length:missdata.length, missed_leads: missdata });
  } catch (error) {
    res.status(400).send({ success: false, error });
  }
}

leadController.HO_missCount3 = async (req, res) => {
  const orgId = "OsAl0DXWjg8kxLjw4goA"
  const stages = ['INTERESTED', 'CALLBACK'];
  const query = {$and:[{organization_id:orgId},{stage: { $in: stages } },{transfer_status:false}] };
  let mongoTask
  try {
    let missdata = await leadModel.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "Id",
          foreignField: "leadId",
          as: "tasks"
        }
      },
      {
        $match: {
          "organization_id": orgId,
          $or: [
            { "stage": "INTERESTED" },
            { "stage": "CALLBACK" }
          ],
          "transfer_status": true,
          "tasks.transfer_status": false,
          "tasks.status": "Pending"
        }
      }
    ])
    missdata.map(async (item) => {
      if(item){
        item.tasks.map((taskItem,index)=>{
          if(taskItem.status==="Pending"){
            console.log("9818260308", taskItem);
            console.log("itemmmmmmmmmmmmmmmmmarrrr5555555888888666666", index);
            taskModel.updateOne(
              { _id: ObjectId(taskItem._id) },
              { "$set": { status: "Completed" } }
              ).exec(function (err, result) {
                  if (err) {
                    console.log(err);
                    // res.status(500).send(err);
                  } else {
                    // res.status(200).send("Deletion DONE!");  { "$set": { "Id": data[i].docId } }
                  }
                });
          }
        })
      }
      // try{
      //   await admin.firestore().collection('tasks').doc(item.Id).set(firebaseTask);
      // }catch (error){
      //   console.log('User Image Upload Error', error);
      // }
      // try{
      // await taskModel.create(mongoTask);
      // }catch (error){
      //   console.log('User Image Upload Error', error);
      // }
    }
    )
    res.status(200).send({missed_length:missdata.length, missed_leads: missdata });
  } catch (error) {
    res.status(400).send({ success: false, error });
  }
}



leadController.Reports = async (req, res) => {
  
  try {
    const orgId = req.body.orgId;
    let Report_type
    Report_type= req.body.type;
console.log("typeeeeeeeeeeee",Report_type)
    // Query for task collection
    let taskPipeline 
    if(Report_type==="project"){
      taskPipeline = [
      {
        $match: {
          organization_id: orgId,
          type: { $in: ['Meeting', 'Site Visit'] },
        },
      },
      {
        $group: {
          _id: {
            project: '$project',
            type: '$type',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: '$_id.project',
          stage: {
            $push: {
              stage: '$_id.type',
              count: '$count',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          project: '$_id',
          stage: 1,
        },
      },
    ];
  }else if(Report_type==="source"){
    taskPipeline = [
      {
        $match: {
          organization_id: orgId,
          type: { $in: ['Meeting', 'Site Visit'] },
        },
      },
      {
        $group: {
          _id: {
            source: '$source',
            type: '$type',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: '$_id.source',
          stage: {
            $push: {
              stage: '$_id.type',
              count: '$count',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          stage: 1,
        },
      },
    ];
    }

    // Query for contact collection
    let contactPipeline 
    if(Report_type==="project"){
      contactPipeline= [
      {
        $match: {
          organization_id: orgId,
        },
      },
      {
        $group: {
          _id: {
            project: '$project',
            stage: '$stage',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: '$_id.project',
          stage: {
            $push: {
              stage: '$_id.stage',
              count: '$count',
            },
          },
          total: {
            $sum: '$count',
          },
        },
      },
      {
        $project: {
          _id: 0,
          project: '$_id',
          stage: 1,
          total: 1,
        },
      },
    ];
  }else if(Report_type==="source"){
    contactPipeline = [
      {
        $match: {
          organization_id: orgId,
        },
      },
      {
        $group: {
          _id: {
            project: '$lead_source',
            stage: '$stage',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: '$_id.project',
          stage: {
            $push: {
              stage: '$_id.stage',
              count: '$count',
            },
          },
          total: {
            $sum: '$count',
          },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          stage: 1,
          total: 1,
        },
      },
    ];
  }

    // Execute both queries in parallel
    const [taskData, contactData] = await Promise.all([
      taskModel.aggregate(taskPipeline),
      leadModel.aggregate(contactPipeline),
    ]);

   // Combine the data where project names are the same
   const combinedData = [];
   const processedProjects = new Set();

   taskData.forEach((task) => {
     if (!processedProjects.has(task.project)) {
      let matchingContactData
       if(Report_type==="project"){
        matchingContactData = contactData.find((contact) => contact.project === task.project);
      }else if(Report_type==="source"){
        matchingContactData = contactData.find((contact) => contact.source === task.source);
      }

       if (matchingContactData) {
         task.stage.push(...matchingContactData.stage);
         task.total = matchingContactData.total;
       }

       combinedData.push(task);
       if(Report_type==="project"){
        processedProjects.add(task.project);
      }else if(Report_type==="source"){
        processedProjects.add(task.source);
      }
     }
   });


    // Prepare the combined result
    const result = {
      report: combinedData,
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }

}


// Below this are new apis which are created for migration purpose

// const sendNotification = async (
//   organization_id,
//   uid,
//   leadIds
// ) => {
//   // const fcmTokens = (
//   //   await admin
//   //     .firestore()
//   //     .collection("fcmTokens")
//   //     .doc(organization_id)
//   //     .get()
//   // ).data();
//   // if (fcmTokens && fcmTokens[uid] && fcmTokens[uid] !== "") {
//   //   try{
//   //   admin.messaging().sendToDevice(
//   //     fcmTokens[uid],
//   //     {
//   //       notification: {
//   //         title: "New Leads",
//   //         body: `${leadIds.length} leads assigned`,
//   //         sound: "default",
//   //       },
//   //       // data: {
//   //       //   id: doc.id,
//   //       // },
//   //     },
//   //     { contentAvailable: false, priority: "high" }
//   //   );
//   const user = await userModel.findOne({uid});
//   if (user && user["fcm_token"] && user["fcm_token"] !== "") {
//     try{
//     admin.messaging().sendToDevice(
//       user["fcm_token"],
//       {
//         notification: {
//           title: "New Leads",
//           body: `${leadIds.length} leads assigned`,
//           sound: "default",
//         },
//         // data: {
//         //   id: doc.id,
//         // },
//       },
//       { contentAvailable: false, priority: "high" }
//     );
//   }catch(error){
//     console.log("Error :-",error);
//   }
//   }
// };

const createNotification = async (uid, notification_title,notification_description,organization_id) => {
  let date = moment();
  if(uid && organization_id && notification_description && notification_title && date){
    try {
      let newNotification = new Notification({
        uid: uid,
        organization_id: organization_id,
        notification_description: notification_description,
        notification_title: notification_title,
        date: date
      });
  
      newNotification = await newNotification.save();
      console.log("Success","Notification Created")
    } catch (error) {
      console.log("Failure","Notification Was Not Created",error)
    }
  }
};

// const convertTimestampsToDate = (obj) => {
//   const outputObject = {};

//   for (const key in obj) {
//      if (obj.hasOwnProperty(key)) {
//         const value = obj[key];

//         if (typeof value === 'object' && value !== null && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
//            // Handle timestamp value
//            const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
//            outputObject[key] = date;
//         } else {
//            // Handle date value or other types
//            outputObject[key] = value;
//         }
//      }
//   }

//   return outputObject;
// }

const convertTimestampsToDate = (obj) => {
  const outputObject = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (
        typeof value === 'object' &&
        value !== null &&
        (value.hasOwnProperty('seconds') || value.hasOwnProperty('_seconds')) &&
        (value.hasOwnProperty('nanoseconds') || value.hasOwnProperty('_nanoseconds'))
      ) {
        // Handle timestamp value
        const seconds = value.seconds || value._seconds || 0;
        const nanoseconds = value.nanoseconds || value._nanoseconds || 0;
        const date = new Date(seconds * 1000 + nanoseconds / 1000000);
        outputObject[key] = date;
      } else {
        // Handle date value or other types
        outputObject[key] = value;
      }
    }
  }

  return outputObject;
};

leadController.CheckContactExistsNew = async (req,res) => {
  let leadAlreadyExists = false;
  if(req.body.contact_no){
    try{
      let result = await leadModel.findOne({organization_id:req.body.organization_id,transfer_status:false,contact_no:req.body.contact_no});
      let result2 = await leadModel.findOne({organization_id:req.body.organization_id,transfer_status:false,alternate_no:req.body.contact_no});
      if(result || result2){
        leadAlreadyExists = true;
      }
    }catch(err){
      console.log("error in checking lead exist", err);
      return res.status(400).json({"success": false,"error":err});
    }
  }

  if(req.body.alternate_no){
    try{
      let result = await leadModel.findOne({organization_id:req.body.organization_id,transfer_status:false,alternate_no:req.body.alternate_no});
      let result2 = await leadModel.findOne({organization_id:req.body.organization_id,transfer_status:false,contact_no:req.body.alternate_no});
      if(result || result2){
        leadAlreadyExists = true;
      }
    }catch(err){
      console.log("error in checking lead exist", err);
      return res.status(400).json({"success": false,"error":err});
    }
  }

  try{
    return res.status(200).json({"success": true,"leadAlreadyExists":leadAlreadyExists});
  }catch(err){
    console.log("error in checking lead exist", err);
    return res.status(400).json({"success": false,"error":err});
  }
}

leadController.CreateLeadNew = async (req, res) => {
  try{
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_create_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to create leads . Please contact your admin"});
    }
    let modifiedLeadData = convertTimestampsToDate(req.body);
    let lead_type;
    if (modifiedLeadData.lead_type === undefined) {
      lead_type = "Data";
    } else {
      lead_type = modifiedLeadData.lead_type;
    }

      ///////////// lead owner check////////////////////////////////////

      let check= await userModel.findOne({uid:req.body.uid});

      if(!check){
        return res.status(400).json({
          success:false,
          message:"user not found",
          error:"user not found"
        })
      }

      let contact_owner_email;
      if (check.profile === "Sales") {
        contact_owner_email = check.user_email;
    } else if (check.profile === "Team Lead") {
        let reporting = await userModel.find({ reporting_to: check.user_email }, { __v: 0, _id: 0 }).lean();
        let elem = reporting.map(val => val.user_email);

        if (elem && elem.includes(modifiedLeadData.contact_owner_email)) {
            contact_owner_email = modifiedLeadData.contact_owner_email;
        }
        else if(check.user_email===modifiedLeadData.contact_owner_email){
          contact_owner_email=modifiedLeadData.contact_owner_email
        }        
        else  {
            return res.status(400).json({
                success: false,
                message: "Team lead did not create the above or different profile lead",
                error: "Team lead did not create the above or different profile lead"
            });
        }
    } else {
        contact_owner_email = modifiedLeadData.contact_owner_email;
    }

  
  ////////////////////////////////////////////////////////////////////////

  let customer_name=sanitizationString(modifiedLeadData.customer_name)
  let address=sanitizationString(modifiedLeadData.address)
    // return res.send(contact_owner_email)
    let leadId = new ObjectId()
    const newLead = new leadModel({
      Id: leadId,
      alternate_no: modifiedLeadData.alternate_no,
      associate_status: modifiedLeadData.associate_status,
      budget: modifiedLeadData.budget,
      contact_no: modifiedLeadData.contact_no,
      contact_owner_email: contact_owner_email,
      country_code: modifiedLeadData.country_code,
      created_at: modifiedLeadData.created_at,
      created_by: modifiedLeadData.created_by,
      customer_image: modifiedLeadData.customer_image,
      lead_type: lead_type,
      customer_name: customer_name,
      email: modifiedLeadData.email,
      feedback_time: modifiedLeadData.feedback_time,
      lead_assign_time: modifiedLeadData.lead_assign_time,
      lead_source: modifiedLeadData.lead_source,
      location: modifiedLeadData.location,
      lost_reason: modifiedLeadData.lost_reason,
      modified_at: modifiedLeadData.modified_at,
      next_follow_up_date_time: modifiedLeadData.next_follow_up_date_time,
      next_follow_up_type: modifiedLeadData.next_follow_up_type,
      not_int_reason: modifiedLeadData.not_int_reason,
      organization_id: modifiedLeadData.organization_id,
      other_lost_reason: modifiedLeadData.other_lost_reason,
      other_not_int_reason: modifiedLeadData.other_not_int_reason,
      previous_owner: modifiedLeadData.previous_owner,
      project: modifiedLeadData.project,
      property_stage: modifiedLeadData.property_stage,
      property_type: modifiedLeadData.property_type,
      source_status: modifiedLeadData.source_status,
      stage: modifiedLeadData.stage,
      stage_change_at:modifiedLeadData.stage_change_at,
      transfer_status: modifiedLeadData.transfer_status,
      uid: modifiedLeadData.uid,
      addset: modifiedLeadData.addset,
      campaign: modifiedLeadData.campaign,
      inventory_type: modifiedLeadData.inventory_type,
      property_sub_type: modifiedLeadData.property_sub_type,
      transfer_reason: modifiedLeadData.transfer_reason,
      previous_owner_1: modifiedLeadData.previous_owner_1,
      previous_owner_2: modifiedLeadData.previous_owner_2,
      transfer_by_1: modifiedLeadData.transfer_by_1,
      transfer_by_2: modifiedLeadData.transfer_by_2,
      previous_stage_1: modifiedLeadData.previous_stage_1,
      previous_stage_2: modifiedLeadData.previous_stage_2,
      call_back_reason: modifiedLeadData.call_back_reason,
      is_button_called: modifiedLeadData.is_button_called,
      gender: modifiedLeadData.gender,
      marital_status: modifiedLeadData.marital_status,
      address: address,
      business_vertical:modifiedLeadData.business_vertical,
      api_forms:modifiedLeadData.api_forms,
      dob: modifiedLeadData.dob,
      anniversary_date: modifiedLeadData.anniversary_date,
      state: modifiedLeadData.state,
      requirement_Type: modifiedLeadData.requirement_Type,
      unit_no: modifiedLeadData.unit_no,
      city: modifiedLeadData.city,
      country: modifiedLeadData.country
    });
    const result = await newLead.save();
    if(modifiedLeadData.noteData){
      let organizationId = modifiedLeadData.organization_id ? modifiedLeadData.organization_id : "";
      let uid = modifiedLeadData.uid ? modifiedLeadData.uid : "";
      let noteData = modifiedLeadData.noteData ? modifiedLeadData.noteData : "";
      let modifiedNoteData = convertTimestampsToDate(noteData);
      // modifiedNoteData.notes=sanitizationString( modifiedNoteData.notes)
      let notes=sanitizationString( modifiedNoteData.note);
      modifiedNoteData["note"]=notes;

      // console.log("nvudnv",modifiedNoteData)
      const query = {
        leadId: leadId,
      };
      const update = {
        $push: { notes:  modifiedNoteData},
        uid:uid,
        organization_id:organizationId,
        leadId:leadId
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const updatedDocument = await contactResourcesMongoModel.findOneAndUpdate(query, update, options);
    }
    return res.status(200).json({"success": true,data:result});
  }catch(err){
    console.log("new lead creation error",err)
    return res.status(400).json({"success": false,"error":err.message});
  }
};

leadController.EditLeadNew = async (req, res) => {
  try{
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_update_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to update leads . Please contact your admin"});
    }
    let modifiedLeadData = convertTimestampsToDate(req.body);
    //const result = await leadModel.find({ id: req.body.id });
    // const data = JSON.parse(JSON.stringify(req.body));

    // console.log("modifiedLeadData",modifiedLeadData)
    modifiedLeadData["customer_name"]=sanitizationString(modifiedLeadData.customer_name)
    modifiedLeadData["address"]=sanitizationString(modifiedLeadData.address)
    const Id = modifiedLeadData.Id;
    const options = {
      new: true
    };
  
    delete modifiedLeadData.Id;
    // if (data._id) {
    //   delete data._id;
    // }
    const result = await leadModel.findOneAndUpdate({ Id: Id }, { $set: modifiedLeadData },options)
    return res.status(200).json({"success": true,data:result});
  }catch(err){
    console.log("lead updation error",err)
    return res.status(400).json({"success": false,"error":err.message});
  }
};

leadController.GetLeadDetails = async (req, res) => {
  let Id = req.body.leadId;
  if(Id){
    try{
      const result = await leadModel.findOne({ Id: Id })
      return res.status(200).json({"success": true,data:result});
    }catch(err){
      console.log("lead fetching error",err)
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
      return res.status(400).json({"success": false,"error":"Some fields are missing"});
  }
};

leadController.DeleteMultipleLeads = async (req, res) => {
  try {
    return res.status(403).json({ "success": false, "message": "Lead Deletion is currently disabled" });

    // Existing Deletion Logic Commented

    // const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    // if(userPreference && userPreference.contact_delete_record_approved === false){
    //     return res.status(400).json({ success: false, message: "You are not allowed to delete leads . Please contact your admin"});
    // }
    // let leadIds = req.body.leadIds;
    // let firstLeadId = leadIds[0];
    // let firstLeadData = await leadModel.findOne({Id:firstLeadId});
    // if(firstLeadData.organization_id == "eD6U3ngkzoAwfnthTgEh"){
    //   return res.status(400).json({"success": false,"error":err});
    // }else{
    //   let leads = await leadModel.deleteMany({Id:{$in:leadIds}});
    //   let tasks = await taskModel.deleteMany({leadId:{$in:leadIds}});
    //   let callLogs = await callLogModel.deleteMany({leadId:{$in:leadIds}});
    //   let contactResourcesMongo = await contactResourcesMongoModel.deleteMany({leadId:{$in:leadIds}});
    //   return res.status(200).json({"success": true,data:"Records were successfully deleted"});
    // }

  } catch (err) {
    console.error("Lead deletion error:", { error: err });
    return res.status(500).json({ success: false, message: "An error occurred while deleting leads", "error": err  });
  }
};

leadController.BulkUpdateLeads = async (req, res) => {
  try{

    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_mass_update_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to update leads. Please contact your admin"});
    }
    let leadIds = req.body.leadIds;
    let changeData = req.body.changeData;
    let modifiedChangeData = convertTimestampsToDate(changeData);
    const options = {
      new: true
    };
    let leads = await leadModel.updateMany({ Id: {$in:leadIds} }, { $set: modifiedChangeData },options)
    return res.status(200).json({"success": true,data:leads});
  }catch(err){
    console.log("lead deletion error",err)
    return res.status(400).json({"success": false,"error":err});
  }
};


leadController.TransferLeadsNew = async (req,res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try{
    let data = req.body;

    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_transfer_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to transfer leads . Please contact your admin"});
    }
        const leadsData = data.leadsData;
        let requestUserEmail = data.requestUserEmail;
        const options= {
          fresh,
          notes,
          attachments,
          task,
          contactDetails,
        } = data.options;
        const owner= {
          email,
          uid,
          organization_id,
        } = data.owner;
        const reason = data.reason;
        const leadType = data.leadType ? data.leadType : "";
        if (
          owner === undefined ||
          owner.email === undefined ||
          owner.uid === undefined
        ) {
          console.log("error in transferring leads")
          return res.status(400).json({"success": false,"error":"Onwer Not Found"});
        }
        if (leadsData.length > 500) {
          console.log("error in transferring leads")
          return res.status(400).json({"success": false,"error":"Only 500 Records allowed at once"});
        } else {
          let leadIds = [];
          let oldLeadIds = [];
          let bulkLeadsToInsert = [];
          let bulkOldLeadsToUpdate = [];
          let bulkContactResourcesToInsert = [];
          let bulkTasksToInsert = [];
          let bulkOldTasksToUpdate = [];
          let oldLeadIdToNewLeadIdMap = {};
          for (let i = 0; i < leadsData.length; i++) {
            const leadData = leadsData[i];
            let oldLeadType = leadData["lead_type"] ? leadData["lead_type"] : "Data";
            let leadId = leadData.contactId;
            delete leadData["contactId"];
            let newData = {};
            let oldData = { ...leadData };
            let associate_status = true;
            let new_source_status = false;
            let old_source_status = leadData.source_status;
            if (
              leadData.stage === "FRESH" ||
              leadData.stage === "INTERESTED" ||
              leadData.stage === "CALLBACK"
            ) {
              associate_status = false;
              old_source_status = false;
              new_source_status = true;
            } else {
              if (old_source_status) {
                new_source_status = false;
                old_source_status = true;
              } else {
                new_source_status = false;
                old_source_status = false;
              }
            }
            newData = {
              ...leadData,
              transfer_status: false,
              associate_status: true,
              source_status: new_source_status,
              uid: owner.uid,
              lead_type:leadType ? leadType : oldLeadType,
              contact_owner_email: owner.email,
              created_at: leadData.created_at
                ? new Date(leadData.created_at)
                : new Date(),
              modified_at: new Date(),
              stage_change_at: new Date(),
              lead_assign_time: new Date(),
              next_follow_up_date_time:
                leadData.next_follow_up_date_time === ""
                  ? ""
                  : new Date(leadData.next_follow_up_date_time),
              previous_owner_1: leadData.previous_owner_2
                ? leadData.previous_owner_2
                : "",
              previous_owner_2: leadData.contact_owner_email
                ? leadData.contact_owner_email
                : "",
              transfer_by_1: leadData.transfer_by_2 ? leadData.transfer_by_2 : "",
              transfer_by_2: requestUserEmail,
              previous_stage_1: leadData.previous_stage_2
                ? leadData.previous_stage_2
                : "",
              previous_stage_2: leadData.stage,
              organization_id:leadData.organization_id,
              autoRotationEnabled: "OFF"
            };
            oldData = {
              transfer_status: true,
              associate_status,
              source_status: old_source_status,
              transfer_reason: reason,
              modified_at: new Date(),
              autoRotationEnabled: "OFF"
            };
            delete oldData.created_at;
            delete oldData.stage_change_at;
            delete oldData.lead_assign_time;
            delete oldData.next_follow_up_date_time;
            if (options.fresh === true) {
              if (options.contactDetails === true) {
                newData = {
                  ...newData,
                  stage: "FRESH",
                  next_follow_up_type: "",
                  next_follow_up_date_time: "",
                  not_int_reason: "",
                  lost_reason: "",
                  other_not_int_reason: "",
                  other_lost_reason: "",
                };
              } else {
                newData = {
                  ...newData,
                  stage: "FRESH",
                  next_follow_up_type: "",
                  next_follow_up_date_time: "",
                  not_int_reason: "",
                  lost_reason: "",
                  other_not_int_reason: "",
                  other_lost_reason: "",
                  project: "",
                  property_stage: "",
                  property_type: "",
                  budget: "",
                  location: "",
                  property_sub_type: "",
                  call_back_reason: "",
                };
              }
            }
            if(newData["_id"]){
              delete newData["_id"];
            }
            if(newData["Id"]){
              delete newData["Id"];
            }

            let contactId = new ObjectId()
            leadIds.push(contactId);
            oldLeadIds.push(leadId);
            oldLeadIdToNewLeadIdMap[leadId] = contactId;
            let newLead = {
              Id: contactId,
              ...newData
            }
            bulkLeadsToInsert.push(newLead);
            bulkOldLeadsToUpdate.push({
              updateOne: {
                  filter:  { Id: leadId },
                  update: { $set: oldData }
              }
          });
            // const newLead = new leadModel({
            //   Id: contactId,
            //   ...newData
            // });
            // const newLeadData = await newLead.save();
            // const oldLeadData = await leadModel.findOneAndUpdate({ Id: leadId }, { $set: oldData },{new:true})
            // if (options.attachments === true || options.notes === true) {
            //   let resourceData = await contactResourcesMongoModel.findOne({leadId:leadId}).lean();
            //   if (resourceData) {
            //     if (
            //       options.attachments === false &&
            //       resourceData["attachments"]
            //     ) {
            //       delete resourceData["attachments"];
            //     }

            //     if (options.notes === false && resourceData["notes"]) {
            //       delete resourceData["notes"];
            //     }
            //     resourceData.uid = owner.uid;
            //     if(resourceData["_id"]){ 
            //       delete resourceData._id;
            //     }
            //     if(resourceData["leadId"]){
            //       delete resourceData.leadId;
            //     }
            //     const newContactResourceDoc = new contactResourcesMongoModel({
            //       ...resourceData,
            //       leadId: contactId,
            //     });
            //     const newContactResource = await newContactResourceDoc.save();
            //   }
            // }

            // let oldTaskData = await taskModel.find({leadId:leadId}).lean();
            // let newTasks = [];
            // if(oldTaskData){
            //   oldTaskData.forEach( async (task)=>{
            //     if (task.status === "Pending") {
            //       if (options.task === true) {
            //         newTasks.push({
            //           ...task,
            //           created_by: owner.email,
            //           organization_id: owner.organization_id,
            //           uid:owner.uid
            //         });
            //       }
            //       task.status = "Cancelled";
            //       task.completed_at = new Date();
            //       let updatedOldTasks = await taskModel.findByIdAndUpdate(
            //         task._id,
            //         { $set: task },
            //         { new: true }
            //       );
            //     }
            //   })
            // }
            // newTasks.forEach(async (task) => {
            //   if(task["_id"]){
            //     delete task["_id"];
            //   }
            //   if(task["leadId"]){
            //     delete task["leadId"];
            //   }
            //   let newTaskModel = new taskModel({...task,leadId: contactId});
            //   let newTaskData = await newTaskModel.save();
            // })
          }
          
          if (options.attachments === true || options.notes === true) {
            let contactResourcesData = await contactResourcesMongoModel.find({leadId:{$in:oldLeadIds}}).lean();
            // console.log("contact resources",contactResourcesData)
            contactResourcesData.forEach((resourceData)=>{
              if (resourceData) {
                let leadId = oldLeadIdToNewLeadIdMap[resourceData.leadId];
                if (
                  options.attachments === false &&
                  resourceData["attachments"]
                ) {
                  delete resourceData["attachments"];
                }
  
                if (options.notes === false && resourceData["notes"]) {
                  delete resourceData["notes"];
                }
                resourceData.uid = owner.uid;
                if(resourceData["_id"]){ 
                  delete resourceData._id;
                }
                if(resourceData["leadId"]){
                  delete resourceData.leadId;
                }
                let newContactResourceData = {
                  ...resourceData,
                  leadId: leadId,
                }
                // const newContactResourceDoc = new contactResourcesMongoModel({
                //   ...resourceData,
                //   leadId: contactId,
                // });
                bulkContactResourcesToInsert.push(newContactResourceData);
                // const newContactResource = await newContactResourceDoc.save();
              }
            })
          }

          let newTasks = [];
          let allTasksData = await taskModel.find({leadId:{$in:oldLeadIds}}).lean();
          if(allTasksData){
            allTasksData.forEach((task)=>{
              if (task.status === "Pending") {
                if (options.task === true) {
                  newTasks.push({
                    ...task,
                    created_by: owner.email,
                    organization_id: owner.organization_id,
                    uid:owner.uid
                  });
                }
                task.status = "Cancelled";
                task.completed_at = new Date();
                if(task["_id"]){
                  delete task["_id"];
                }
                bulkOldTasksToUpdate.push({
                  updateOne: {
                      filter:  { leadId: task.leadId },
                      update:  { $set: task },
                  }
              });
                // let updatedOldTasks = await taskModel.findByIdAndUpdate(
                //   task._id,
                //   { $set: task },
                //   { new: true }
                // );
              }
            })
          }

          newTasks.forEach(async (task) => {
            let leadId = oldLeadIdToNewLeadIdMap[task.leadId];
            if(task["_id"]){
              delete task["_id"];
            }
            if(task["leadId"]){
              delete task["leadId"];
            }
            // let newTaskModel = new taskModel({...task,leadId: contactId});
            // let newTaskData = await newTaskModel.save();
            let newTask = {...task,leadId: leadId};
            bulkTasksToInsert.push(newTask);
          })

          // let oldTaskData = await taskModel.find({leadId:leadId}).lean();
          // let newTasks = [];
          // if(oldTaskData){
          //   oldTaskData.forEach( async (task)=>{
          //     if (task.status === "Pending") {
          //       if (options.task === true) {
          //         newTasks.push({
          //           ...task,
          //           created_by: owner.email,
          //           organization_id: owner.organization_id,
          //           uid:owner.uid
          //         });
          //       }
          //       task.status = "Cancelled";
          //       task.completed_at = new Date();
          //       let updatedOldTasks = await taskModel.findByIdAndUpdate(
          //         task._id,
          //         { $set: task },
          //         { new: true }
          //       );
          //     }
          //   })
          // }
          // newTasks.forEach(async (task) => {
          //   if(task["_id"]){
          //     delete task["_id"];
          //   }
          //   if(task["leadId"]){
          //     delete task["leadId"];
          //   }
          //   let newTaskModel = new taskModel({...task,leadId: contactId});
          //   let newTaskData = await newTaskModel.save();
          // })
          // console.log("aman transfer request",bulkLeadsToInsert,bulkContactResourcesToInsert,bulkOldLeadsToUpdate,bulkOldTasksToUpdate,bulkTasksToInsert,oldLeadIdToNewLeadIdMap);
          let user = await userModel.findOne({uid});
          let userFcmToken = user?.fcm_token ? user?.fcm_token  : "";
          await leadModel.insertMany(bulkLeadsToInsert,{ session });
          await leadModel.bulkWrite(bulkOldLeadsToUpdate,{ session });
          await contactResourcesMongoModel.insertMany(bulkContactResourcesToInsert,{ session });
          await taskModel.insertMany(bulkTasksToInsert,{ session });
          // throw new Error("error occured after insert many");
          await taskModel.bulkWrite(bulkOldTasksToUpdate,{ session });
          
          // Commit the transaction if all operations succeed
          await session.commitTransaction();
          session.endSession();

          // await sendNotification(owner.organization_id, owner.uid, leadIds);
          await sendNotificationToSingleUser(userFcmToken,"New Leads", `${leadIds.length} leads assigned`);
          await createNotification(owner.uid,"New Leads",`${leadIds.length} leads assigned`,owner.organization_id);
          return res.status(200).json({"success": true,"data":`${leadIds.length} leads successfully transferred`});
        }
    
  }catch(err){
    // Rollback the transaction if any operation fails
    await session.abortTransaction();
    session.endSession();

    console.log("error in transferring leads",err)
    return res.status(400).json({"success": false,"error":err});
  }
};

leadController.CheckIfFieldExistsInLeads = async (req, res) => {
  let data = req.body;
  try{
    const leadsQuery = {
      ...data
      // created_at: {$gte: moment(startDate).utcOffset('+05:30').toDate(),$lte: moment(endDate).utcOffset('+05:30').toDate()}
    };
    const response  = await leadModel.find(leadsQuery);
    return res.status(200).json({"success": true,data:response});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

leadController.UpdateReenquiredLeads = async (req, res) => {
  try {
    const data = req.body;
    const leadsQuery = {
      organization_id: data.organization_id,
      transfer_status: data.transfer_status,
      contact_no: data.contact_no
    };

    const updateResult = await leadModel.updateMany(leadsQuery, { $set: { reenquired: true } });
    return res.status(200).json({ success: true, data:updateResult });
  } catch (error) {
    console.log("Error in updateReenquiredLeads:", error);
    return res.status(400).json({ success: false, error: error });
  }
}

leadController.AppSearch = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  let filter = req.body.filter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString
    ? req.body.searchString
    : "";
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);
  let userQuery = {};
  let report = [];
  let branchName = "";
  let teamName = "";
  let cond = false;

  let typeFilter=[];
  let statusFilter=[];

  if(filter){
    if ('employee_id' in filter || 'employee_name' in filter || 'contact_owner_email' in filter) {
      let mergedValues = [];
    
      if ('employee_id' in filter && 'employee_name' in filter) {
        mergedValues.push(...filter.employee_id, ...filter.employee_name);
      } else if ('employee_id' in filter) {
        mergedValues.push(...filter.employee_id);
      } else if ('employee_name' in filter) {
        mergedValues.push(...filter.employee_name);
      }
    
      if ('contact_owner_email' in filter) {
        mergedValues.push(...filter.contact_owner_email);
      }
    
      filter.contact_owner_email = [...new Set(mergedValues)];
      
      delete filter.employee_id;
      delete filter.employee_name;
    }else if ("type" in filter || "status" in filter){
      if("type" in filter && "status" in filter){
        typeFilter = filter["type"] 
        statusFilter= filter["status"] 

        delete filter.type;
        delete filter.status;
      }else if ("type" in filter){
        typeFilter =  filter["type"] ;
        delete filter.type;
      }else if ("status" in filter){
        statusFilter=filter["status"] ;
        delete filter.status;
      }
    }
  }

  Object.keys(filter).forEach((key) => {
    if (datesField.includes(key)) {
      if (filter[key].length && filter[key].length === 2) {
        filter[key] = {
          $gte: new Date(filter[key][0]),
          $lte: new Date(filter[key][1]),
        };
      }
    } else if (booleanField.includes(key)) {
      filter[key].forEach((element, index) => {
        if (element === "True" || element === true) {
          filter[key][index] = true;
        } else if (
          element === "False" ||
          element === false
        ) {
          filter[key][index] = false;
        }
      });
    } else if (key === "reporting_to") {
      report = filter[key];
      userQuery["reporting_to"] = { $in: report };
      cond = true;
      delete filter[key];
    } else if (key === "branch") {
      branchName = filter[key];
      userQuery["branch"] = { $in: branchName };
      cond = true;
      delete filter[key];
    } else if (key === "team") {
      teamName = filter[key];
      userQuery["team"] = { $in: teamName };
      cond = true;
      delete filter[key];
    }
    else {
      filter[key] = { $in: filter[key] };
    }
  });

  
  if (missed === true) {
    filter["next_follow_up_date_time"] = {
      $lt: new Date(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  searchString.split(",").forEach((string) => {
    search = string.trim();
    const re = new RegExp(search, "i");
    if (search.match(/^[0-9]+$/) != null) {
      contact_list.push(re);
    } else if (search !== "") {
      customer_name_list.push(re);
    }
  });

  if (contact_list.length !== 0) {
    // filter["contact_no"] = { $in: contact_list };
    filter["$or"] = [{ "contact_no": { $in: contact_list } }, { "alternate_no": { $in: contact_list } }]
  }
  if (customer_name_list.length !== 0) {
    filter["customer_name"] = { $in: customer_name_list };
  }

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    return res.status(400).send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;
  let leads;

  userQuery["organization_id"] = { $in: [organization_id] };

  let reportingUsers = [];

  if (profile.toLowerCase() == "lead manager" || profile?.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        let find;
        if (!cond){
          find = { organization_id, ...filter };
        } 
        else{
          reportingUsers = await userModel
            .find(userQuery)
            .select("uid -_id");

          reportingUsers = reportingUsers.map(({ uid }) => uid);
          find = {
            organization_id,
            ...filter,
            uid: { $in: reportingUsers },
          };
        }
        leads = await leadModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize).lean();
  
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);
 
        // console.log("rishabh",typeFilter,statusFilter)
        if (typeFilter.length !== 0 || statusFilter.length !== 0) {
          let leadIDS= leads.map((val)=>{
            return val.Id
         })
 
         const reslt = await taskModel.aggregate([
           {
             $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
           },
           {
             $sort: { created_at: -1 }   // Sort by leadID and createdAt in descending order
           },
           {
             $group: {
               _id: "$leadId",                      // Group by leadID
               latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
             }
           },
           {
             $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
           },
           {
             $project: {                            // Project only the desired fields
               leadId: 1,
               type: 1,
               status: 1
             }
           }
         ]);
 
         let query2 = new Date();
         let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
         console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);
         let userMapping={};
 
         reslt.forEach((val)=>{
             if(leadIDS.includes(val.leadId)){
               userMapping[`${val.leadId}`]={
                 type:val.type || "",
                 status:val.status || ""
               }
             }
         })
 
 
         leads.forEach((val) => {
           const mapping = userMapping[val.Id];
           if (mapping) {
             val["type"] = mapping["type"];
             val["status"] = mapping["status"];
           }else{
             val["type"]  = ""
             val["status"] = ""
           }
         });
         
          leads = leads.filter(val => {
            const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
            const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
            return typeMatch && statusMatch;
          });
        }

        // console.log("rishabh  rishabh",leads);
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(200).send(leads);
      } catch (error) {
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(400).json({
          success:false,
          error:error.message
        })
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organization_id,
        permission
      );
      try {
        let find;

        const interesectionArray = usersList.filter(
          (value) => reportingUsers.includes(value)
        );

        if (!cond)
          find = { uid: { $in: usersList }, ...filter };
        else
          find = {
            uid: { $in: interesectionArray },
            ...filter,
          };

        leads = await leadModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize).lean();

          let query1 = new Date();
          let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
          console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);

          let leadIDS= leads.map((val)=>{
            return val.Id
         })

          const reslt = await taskModel.aggregate([
            {
              $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
            },
            {
              $sort: {  created_at: -1 }   // Sort by leadID and createdAt in descending order
            },
            {
              $group: {
                _id: "$leadId",                      // Group by leadID
                latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
              }
            },
            {
              $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
            },
            {
              $project: {                            // Project only the desired fields
                leadId: 1,
                type: 1,
                status: 1
              }
            }
          ]);

          let query2 = new Date();
          let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
          console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);
  
          let userMapping={};
  
          reslt.forEach((val)=>{
              if(leadIDS.includes(val.leadId)){
                userMapping[`${val.leadId}`]={
                  type:val.type || "",
                  status:val.status || ""
                }
              }
          })
  
  
          leads.forEach((val) => {
            const mapping = userMapping[val.Id];
            if (mapping) {
              val["type"] = mapping["type"];
              val["status"] = mapping["status"];
            }else{
              val["type"]  = ""
              val["status"] = ""
            }
          });
         
          if (typeFilter.length !== 0 || statusFilter.length !== 0) {
            leads = leads.filter(val => {
              const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
              const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
              return typeMatch && statusMatch;
            });
          }
        
          let apiEnd = new Date();
          timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
          console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(200).send(leads);
      } catch (error) {
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
        return res.status(400).json({
          success:false,
          error:error.message
        })
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
    let usersList = await getTeamUsers(
      uid,
      organization_id
    );
    try {
      let find;
      const interesectionArray = usersList.filter((value) =>
        reportingUsers.includes(value)
      );
      if (!cond) {
        if (filter?.stage) {
          find = { uid: { $in: usersList }, ...filter };
        }
        else {
          find = { uid: { $in: usersList }, ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] } };
        }
      }
      else {
        if (filter?.stage) {
          find = {
            uid: { $in: interesectionArray },
            ...filter,
          };
        }
        else {
          find = {
            uid: { $in: interesectionArray },
            ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] }
          };
        }
      }
      leads = await leadModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize).lean();

        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);

        let leadIDS= leads.map((val)=>{
          return val.Id
       })

       const reslt = await taskModel.aggregate([
         {
           $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
         },
         {
          $sort: { created_at: -1 }  // Sort by leadID and createdAt in descending order
         },
         {
           $group: {
             _id: "$leadId",                      // Group by leadID
             latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
           }
         },
         {
           $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
         },
         {
           $project: {                            // Project only the desired fields
             leadId: 1,
             type: 1,
             status: 1
           }
         }
       ]);

       let query2 = new Date();
       let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
       console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);

       let userMapping={};

       reslt.forEach((val)=>{
           if(leadIDS.includes(val.leadId)){
             userMapping[`${val.leadId}`]={
               type:val.type || "",
               status:val.status || ""
             }
           }
       })


       leads.forEach((val) => {
         const mapping = userMapping[val.Id];
         if (mapping) {
           val["type"] = mapping["type"];
           val["status"] = mapping["status"];
         }else{
           val["type"]  = ""
           val["status"] = ""
         }
       });

       if (typeFilter.length !== 0 || statusFilter.length !== 0) {
        leads = leads.filter(val => {
          const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
          const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
          return typeMatch && statusMatch;
        });
      }
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(200).send(leads);
    } catch (error) {
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(400).json({
        success:false,
        error:error.message
      })
    }
  } else {
    try {
      let find;
      if (cond) {
        find = reportingUsers.includes(uid)
          ? { uid, ...filter }
          : "";
      }
      if (find === "") {
        return res.send([]);
      }
      else {
        if (filter?.stage) {
          find = { uid, ...filter };
        }
        else {
          find = { uid, ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED","FRESH"] } };
        }
      }
      leads = await leadModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize).lean();

        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - leads/search, time taken for query 1, ${timeTakenQuery1}`);

        let leadIDS= leads.map((val)=>{
          return val.Id
       })

       const reslt = await taskModel.aggregate([
         {
           $match: { leadId: { $in: leadIDS } }  // Match documents with leadIDs in the provided array
         },
         {
          $sort: { created_at: -1 }   // Sort by leadID and createdAt in descending order
         },
         {
           $group: {
             _id: "$leadId",                      // Group by leadID
             latestTask: { $first: "$$ROOT" }     // Get the first document in each group (which is the latest task due to the sorting)
           }
         },
         {
           $replaceRoot: { newRoot: "$latestTask" }  // Replace the root with the latest task document
         },
         {
           $project: {                            // Project only the desired fields
             leadId: 1,
             type: 1,
             status: 1
           }
         }
       ]);

       let query2 = new Date();
       let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
       console.log(`api endpoint - leads/search, time taken for query 2, ${timeTakenQuery2}`);

       let userMapping={};

       reslt.forEach((val)=>{
           if(leadIDS.includes(val.leadId)){
             userMapping[`${val.leadId}`]={
               type:val.type || "",
               status:val.status || ""
             }
           }
       })


       leads.forEach((val) => {
         const mapping = userMapping[val.Id];
         if (mapping) {
           val["type"] = mapping["type"];
           val["status"] = mapping["status"];
         }else{
           val["type"]  = ""
           val["status"] = ""
         }
       });

       if (typeFilter.length !== 0 || statusFilter.length !== 0) {
        leads = leads.filter(val => {
          const typeMatch = typeFilter.length === 0 || typeFilter.includes(val.type);
          const statusMatch = statusFilter.length === 0 || statusFilter.includes(val.status);
          return typeMatch && statusMatch;
        });
      }
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(200).send(leads);
    } catch (error) {
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - leads/search, time taken overall, ${timeTakenOverall}`);
      return res.status(400).json({
        success:false,
        error:error.message
      })
    }
  }
};

leadController.AppFilterValues = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  const stage = req.body.stage;
  const filters=req.body.filters;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  let stageFilter = stage ? { stage } : {};
  let missedFilter = {};
  let showFilterValue = req.body.showColumns;
  data=CONTACT_FILTER_VALUES
  // const User = await userModel.find({ uid });
//   let organization_id
//   User.map((item)=>{
//     organization_id= item.organization_id
//  })
//  console.log("User--User",CacheKey)
//  const CacheKey = JSON.stringify({ organization_id, stage, filters });
//  const cachedData = cache.get(CacheKey);
//  if (cachedData !== undefined) {
//   updateAccessTime(CacheKey);
//   return res.send(cachedData)
// }else{
 
 if(filters){
  Object.keys(filters).forEach((key)=>{
    if (datesField.includes(key)) {
      if (filters[key].length && filters[key].length === 2) {
        filters[key] = {
          $gte: new Date(filters[key][0]),
          $lte: new Date(filters[key][1]),
        };
      }
  }
  })
 }
  if (stage === "FOLLOWUP") {
    stageFilter = {
      stage: { $in: ["CALLBACK", "INTERESTED"] },
    };
  }

  if (stage === "MISSED") {
    stageFilter = {
      stage: { $in: ["CALLBACK", "INTERESTED"] },
    };
    missedFilter["next_follow_up_date_time"] = {
      $lt: new Date(),
    };
  }
  const finalFilters = { ...stageFilter, ...missedFilter,...filters };
  
    let resultUser = "";
  if(teamUids.length < 1){
    resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
      return res.send({ error: "User Not Found" });
    }
  }

  const user = resultUser && resultUser[0];
  const profile = user && user?.profile;
  const organization_id = user && user?.organization_id;

  let group = {
    $group: {
      _id: 0,
    }
  };

  let projection = {
    $project: {
      location: 1,
      contact_owner_email: 1,
      project: 1,
      property_stage: 1,
      property_type: 1,
      lead_source: 1,
      state: 1,
    }
  }

if(showFilterValue){
  const commonFields = data.filter(field => showFilterValue.includes(field));
  commonFields.forEach(field => {
    group.$group[field] = { $addToSet: '$' + field };
  });
}
else{

  group = {
    $group: {
      _id: 0,
      location: { $addToSet: "$location" },
      contact_owner_email: {
        $addToSet: "$contact_owner_email",
      },
      project: { $addToSet: "$project" },
      property_stage: { $addToSet: "$property_stage" },
      property_type: { $addToSet: "$property_type" },
      lead_source: { $addToSet: "$lead_source" },
      state: { $addToSet: "$state" },

      // budget: { $addToSet: "$budget" },
      // country_code: { $addToSet: "$country_code" },
      // created_by: { $addToSet: "$created_by" },
      // lost_reason: { $addToSet: "$lost_reason" },
      // next_follow_up_type: {
      //   $addToSet: "$next_follow_up_type",
      // },
      // not_int_reason: { $addToSet: "$not_int_reason" },
      // other_lost_reason: {
      //   $addToSet: "$other_lost_reason",
      // },
      // other_not_int_reason: {
      //   $addToSet: "$other_not_int_reason",
      // },
      // previous_owner: { $addToSet: "$previous_owner" },
      // stage: { $addToSet: "$stage" },
      // addset: { $addToSet: "$addset" },
      // campaign: { $addToSet: "$campaign" },
      // inventory_type: { $addToSet: "$inventory_type" },
      // property_sub_type: {
      //   $addToSet: "$property_sub_type",
      // },
      // transfer_reason: { $addToSet: "$transfer_reason" },
      // previous_stage_1: { $addToSet: "$previous_stage_1" },
      // previous_stage_2: { $addToSet: "$previous_stage_2" },
      // previous_owner_2: { $addToSet: "$previous_owner_2" },
      // previous_owner_1: { $addToSet: "$previous_owner_1" },
      // transfer_by_1: { $addToSet: "$transfer_by_1" },
      // transfer_by_2: { $addToSet: "$transfer_by_2" },
      // call_back_reason: { $addToSet: "$call_back_reason" },
      // branch: { $addToSet: "$branch" },
      // business_vertical: { $addToSet: "$business_vertical" },
      // api_forms: { $addToSet: "$api_forms" },
    },
  };
}
  const groupUser = {
    $group: {
      _id: 0,
      reporting_to: { $addToSet: "$reporting_to" },
      branch: { $addToSet: "$branch" },
      team: { $addToSet: "$team" },
    },
  };

  const role = req.body.role;
  
  if(role === false){
  try {
       let filters;
       let userFilters;
      if(teamUids.length > 0){
              filters = await leadModel.aggregate([
        { $match: { uid:{$in:teamUids}, ...finalFilters} },
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      userFilters = await userModel.aggregate([
        { $match: { uid:{$in:teamUids} } },
        groupUser,
      ]);
      let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);
      }else{
              filters = await leadModel.aggregate([
        { $match: { uid, ...finalFilters } },
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      userFilters = await userModel.aggregate([
        { $match: { uid } },
        groupUser,
      ]);
      let query2 = new Date();
      let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);
      }
      if (filters.length > 0) {
        filters[0].reporting_to =
          userFilters.length > 0
            ? userFilters[0].reporting_to
            : [];
        filters[0].branch =
          userFilters.length > 0
            ? userFilters[0].branch
            : [];
        filters[0].team =
          userFilters.length > 0
            ? userFilters[0].team
            : [];
      }

      let singleArray = [];
      let finalFilterSorted = {};

      Object.keys(filters[0]).forEach((key) => {
        if (key != "_id") {
          const val = filters[0][key].sort();
          finalFilterSorted[key] = val;

        }
      });
      singleArray.push(finalFilterSorted);
      // cache.set(CacheKey, singleArray, 7200);
      // accessTimes.set(CacheKey, Date.now());
      // lruQueue.enq(CacheKey);
      // enforceLRUPolicy();
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message || "An error occured, please try again"
    })
    }
  }else{
      if (profile?.toLowerCase() == "lead manager" || profile?.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        // const query = [
        //   { $match: { organization_id, ...finalFilters } },
        //   group,
        // ];
        // console.log("LeadFilterValuesQuery 1 :" + JSON.stringify(query));
        // const query1 = [
        //   { $match: { organization_id } },
        //   groupUser,
        // ];
        // console.log("LeadFilterValuesQuery 2 :" + JSON.stringify(query1));
        const filters = await leadModel.aggregate([
          { $match: { organization_id,transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
          projection,
          group,
        ]);
        let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);

      //   const userFilters = await userModel.aggregate([
      //     { $match: { organization_id } },
      //     groupUser,
      //   ]);
      //   let query2 = new Date();
      // let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      // console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);

      //   if (filters.length > 0)
      //     filters[0].reporting_to =
      //       userFilters.length > 0
      //         ? userFilters[0].reporting_to
      //         : [];
      //   filters[0].branch =
      //     userFilters.length > 0
      //       ? userFilters[0].branch
      //       : [];
      //   filters[0].team =
      //     userFilters.length > 0
      //       ? userFilters[0].team
      //       : [];
        // console.log("filter data :" + filters);

        let singleArray = [];
        let finalFilterSorted = {};

        Object.keys(filters[0]).forEach((key) => {
          if (key != "_id") {
            const val = filters[0][key].sort();
            finalFilterSorted[key] = val;

          }
        });
        singleArray.push(finalFilterSorted);
        // cache.set(CacheKey, singleArray, 7200);
        // accessTimes.set(CacheKey, Date.now());
        // lruQueue.enq(CacheKey);
        // enforceLRUPolicy();
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
      } catch (error) {
        return res.status(400).json({
          success:false,
          error:error.message || "An error occured, please try again"
      })
      }
    } else {
      // let usersList = await getBranchUsers(
      //   uid,
      //   organization_id,
      //   permission
      // );
      try {
        // const query = [
        //   {
        //     $match: {
        //       uid: { $in: usersList },
        //       ...finalFilters,
        //     },
        //   },
        //   group,
        // ];
        const users = await userModel.find({organization_id:organization_id,branch: { $in: permission }},{uid:1});
        let usersList = [];
        users.forEach(user => {
          usersList.push(user.uid);
        })
        const filters = await leadModel.aggregate([
          {
            $match: {
              uid: { $in: usersList },
              transfer_status:false,
              "stage": { $nin: ["LOST", "NOT INTERESTED"] },
              ...finalFilters,
            },
          },
          projection,
          group,
        ]);
        let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      //   const userFilters = await userModel.aggregate([
      //     { $match: { uid: { $in: usersList } } },
      //     groupUser,
      //   ]);
      //   let query2 = new Date();
      // let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      // console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);

      //   if (filters.length > 0)
      //     filters[0].reporting_to =
      //       userFilters.length > 0
      //         ? userFilters[0].reporting_to
      //         : [];

        let singleArray = [];
        let finalFilterSorted = {};

        Object.keys(filters[0]).forEach((key) => {
          if (key != "_id") {
            const val = filters[0][key].sort();
            finalFilterSorted[key] = val;

          }
        });
        singleArray.push(finalFilterSorted);
        // cache.set(CacheKey, singleArray, 7200);
        // accessTimes.set(CacheKey, Date.now());
        // lruQueue.enq(CacheKey);
        // enforceLRUPolicy();
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
        console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
      } catch (error) {
        return res.status(400).json({
          success:false,
          error:error.message || "An error occured, please try again"
      })
      }
    }
  } else if (profile?.toLowerCase() == "team lead") {
    // let usersList = await getTeamUsers(
    //   uid,
    //   organization_id
    // );
    try {
      const users = await userModel.find({organization_id,reporting_to:resultUser[0].user_email},{uid: 1});
      let usersList = [];
      users.forEach(user => {
        usersList.push(user.uid);
      })
      // console.log("kajsjs",users,resultUser[0].user_email,usersList)

      const filters = await leadModel.aggregate([
        {
          $match: {
            uid: { $in: usersList },
            transfer_status: false,
            "stage": { $nin: ["LOST", "NOT INTERESTED"] },
            ...finalFilters,
          },
        },
        projection,
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      // const userFilters = await userModel.aggregate([
      //   { $match: { uid: { $in: usersList } } },
      //   groupUser,
      // ]);
      // let query2 = new Date();
      // let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      // console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);

      // if (filters.length > 0)
      //   filters[0].reporting_to =
      //     userFilters.length > 0
      //       ? userFilters[0].reporting_to
      //       : [];
      // filters[0].branch =
      //   userFilters.length > 0
      //     ? userFilters[0].branch
      //     : [];
      // filters[0].team =
      //   userFilters.length > 0
      //     ? userFilters[0].team
      //     : [];

      let singleArray = [];
      let finalFilterSorted = {};

      Object.keys(filters[0]).forEach((key) => {
        if (key != "_id") {
          const val = filters[0][key].sort();
          finalFilterSorted[key] = val;

        }
      });
      singleArray.push(finalFilterSorted);
      // cache.set(CacheKey, singleArray, 7200);
      // accessTimes.set(CacheKey, Date.now());
      // lruQueue.enq(CacheKey);
      // enforceLRUPolicy();
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message || "An error occured, please try again"
    })
    }
  }
  else {
    try {
      const filters = await leadModel.aggregate([
        { $match: { uid,transfer_status:false, "stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
        projection,
        group,
      ]);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
      console.log(`api endpoint - /leads/filterValues, time taken for aggregate1, ${timeTakenQuery1}`);
      // const userFilters = await userModel.aggregate([
      //   { $match: { uid } },
      //   groupUser,
      // ]);
      // let query2 = new Date();
      // let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
      // console.log(`api endpoint - /leads/filterValues, time taken for aggregate2, ${timeTakenQuery2}`);
      // if (filters.length > 0) {
      //   filters[0].reporting_to =
      //     userFilters.length > 0
      //       ? userFilters[0].reporting_to
      //       : [];
      //   filters[0].branch =
      //     userFilters.length > 0
      //       ? userFilters[0].branch
      //       : [];
      //   filters[0].team =
      //     userFilters.length > 0
      //       ? userFilters[0].team
      //       : [];
      // }

      let singleArray = [];
      let finalFilterSorted = {};

      Object.keys(filters[0]).forEach((key) => {
        if (key != "_id") {
          const val = filters[0][key].sort();
          finalFilterSorted[key] = val;

        }
      });
      singleArray.push(finalFilterSorted);
      // cache.set(CacheKey, singleArray, 7200);
      // accessTimes.set(CacheKey, Date.now());
      // lruQueue.enq(CacheKey);
      // enforceLRUPolicy();
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
      console.log(`api endpoint - /leads/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message || "some error occured in catch"
    })
    }
  }
  }
// }
};

leadController.fetchLeadByMBContactId = async (req, res) => {
  const Id = req.query.contact_id;
  if(Id){
    try{
      // console.log("req.query.contact_id",Id)
      const decryptContId=decryptautoLogin(Id);
      // console.log("decryptContId",decryptContId)
      const result = await leadModel.findOne({ mb_contact_id: decryptContId,transfer_status:false })
      return res.status(200).json({"success": true,data:result});
    }catch(err){
      // console.log("lead fetching error",err)
      return res.status(200).json({"success": false,"error":err.message});
    }
  }else{
      return res.status(200).json({"success": false,"error":"contact_not found"});
  }
};

leadController.ShowMigratedLeadsBucket = async (req, res) => {
  const organization_id = req.query.organization_id;
  const uid = req.query.uid;
  if (!organization_id || !uid) {
    return res.status(400).json({
      success: false,
      message: "Invalid Params",
      error: "Invalid Params",
      data: { showMigratedBucket: false }
    });
  }

  try {
    // Get the current date
    const currentDate = new Date();

    // Fetch the lead with the most recent creation date
    const mmbLead = await leadModel
      .findOne({ organization_id, transfer_status: false, stage: "MIGRATED LEADS" })
      .sort({ created_at: -1 })
      .lean();

    // Check if a lead exists and is older than 6 months
    let showMigratedBucket = false;
    if (mmbLead) {
      const leadDate = new Date(mmbLead.created_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

      // Compare the date
      if (leadDate >= sixMonthsAgo) {
        showMigratedBucket = true;
      }
    }

    return res.status(200).json({
      success: true,
      data: { showMigratedBucket }
    });
  } catch (err) {
    console.log("Error in Show MMB Bucket API:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching response",
      error: err.message,
      data: { showMigratedBucket: false }
    });
  }
};


module.exports = leadController;
