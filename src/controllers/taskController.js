const taskModel = require('../models/taskSchema');
const userModel = require('../models/userSchema');
const leadModel = require("../models/leadsSchema");
const moment = require('moment');
const app = require('firebase');
const admin = require("../../firebaseAdmin");
const { TASK_FILTER_VALUES } = require('../constants/constants');
const userAuthorizationModel = require('../models/userAuthorizationSchema.js'); 
const NodeCache = require('node-cache');
const cache = new NodeCache();
const PriorityQueue = require('priorityqueuejs');
const MAX_CACHE_SIZE = 5000;
const accessTimes = new Map();
const lruQueue = new PriorityQueue((a, b) => accessTimes.get(a) - accessTimes.get(b));
const {sendNotifications}=require("../functions/sendNotification")
const { MESSAGES } = require("../constants/constants");
const mongoose = require('mongoose');
const {getTimeDifferenceInSeconds}=require("../constants/constants.js")
const {senNotificationWon}=require("../functions/wonNotification.js")

const timestamp = app.firestore.Timestamp;

const taskController = {};

const isObjectEmpty = (object) => {
  var isEmpty = true;
  for (keys in object) {
    isEmpty = false;
    break; // exiting since we found that the object is not empty
  }
  return isEmpty;
};

const datesField = [
  'created_at',
  'next_follow_up_date_time',
  'stage_change_at',
  'modified_at',
  'lead_assign_time',
  'completed_at',
  'due_date',
];

const booleanField = ['associate_status', 'source_status', 'transfer_status','unique_meeting',"unique_site_visit"];
const getBranchUsers = async (uid, organization_id, permission) => {
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
    if (item.reporting_to === '') {
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
  const users = await userModel.find({ organization_id: organization_id,status:"ACTIVE",  profile: { $nin: ["Admin", "CEO", "Operation Manager"] } });
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

// used in taskDateStatus to merge completed array with pending - missed array
const mergeArray = (arr1, arr2) => {
  let data = {};
  arr1.forEach((element) => {
    data[element._id] = {
      Pending: element.Pending,
      Missed: element.Missed,
      Completed: 0,
      ...data[element._id],
    };
  });
  arr2.forEach((element) => {
    data[element._id] = {
      Missed: 0,
      Pending: 0,
      ...data[element._id],
      Completed: element.Completed,
    };
  });
  return data;
};

taskController.Create = (req, res) => {
  const data = new taskModel({
    leadId: req.body.leadId,
    customer_name: req.body.customer_name,
    contact_no: req.body.contact_no,
    stage: req.body.stage,
    contact_owner_email: req.body.contact_owner_email,
    call_back_reason: req.body.call_back_reason,
    location: req.body.location,
    project: req.body.project,
    budget: req.body.budget,
    transfer_status: req.body.transfer_status,
    created_by: req.body.created_by,
    created_at:
      typeof req.body.created_at == 'object'
        ? new timestamp(
          req.body.created_at._seconds,
          req.body.created_at._nanoseconds
        ).toDate()
        : new Date(),
    type: req.body.type,
    inventory_type: req.body.inventory_type,
    source: req.body.source,
    due_date:
      typeof req.body.due_date == 'object'
        ? new timestamp(
          req.body.due_date._seconds,
          req.body.due_date._nanoseconds
        ).toDate()
        : "",
    completed_at:
      typeof req.body.completed_at == 'object'
        ? new timestamp(
          req.body.completed_at._seconds,
          req.body.completed_at._nanoseconds
        ).toDate()
        : "",
    status: req.body.status,
    uid: req.body.uid,
    organization_id: req.body.organization_id,
  });
  console.log("dataaaaaaaaaaaaaa",data)
  data
    .save()
    .then(() => {
      res.send('Task Created');
    })
    .catch((err) => {
      res.status(500).send(err);
    });
};

taskController.Update = (req, res) => {
  const leadId = req.body.leadId;
  if (req.body._id) {
    delete req.body._id;
  }
  taskModel
    .updateMany({ leadId }, { $set: req.body })
    .exec(function (err, result) {
      if (err) {
        // console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send('Updation DONE!');
      }
    });
};
taskController.UniqueTaskTypeUpdate = (req, res) => {
  const _id = req.body.id;
  let data = req.body;
  taskModel
    .findOneAndUpdate({_id}, { $set: data })
    .exec(function (err, result) {
      if (err) {
        // console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send('Updation DONE!');
      }
    });
};

taskController.UpdateVerification = (req, res) => {
  const leadId = req.body.leadId;
  let data = req.body;

  taskModel
    .findOneAndUpdate({leadId:leadId,status: 'Pending'}, { $set: data })
    .exec(function (err, result) {
      if (err) {
        // console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send('Updation DONE!');
      }
    });
};

taskController.UpdateTask = (req, res) => {
  const leadId = req.body.leadId;
  let data = req.body;
  data.created_at =
    typeof data.created_at == 'object'
      ? new timestamp(
        data.created_at._seconds,
        data.created_at._nanoseconds
      ).toDate()
      : new Date();
  data.due_date =
    typeof data.due_date == 'object'
      ? new timestamp(
        data.due_date._seconds,
        data.due_date._nanoseconds
      ).toDate()
      : new Date();
  data.completed_at =
    typeof data.completed_at == 'object'
      ? new timestamp(
        data.completed_at._seconds,
        data.completed_at._nanoseconds
      ).toDate()
      : "";
  taskModel
    .findOneAndUpdate({ leadId, status: 'Pending' }, { $set: data })
    .exec(function (err, result) {
      if (err) {
        // console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send('Updation DONE!');
      }
    });
};
taskController.DeleteTask = (req, res) => {
  const leadId = req.body.leadId;
  // console.log(leadId);
  taskModel.deleteMany({ leadId: leadId })
    .exec(function (err, result) {
      if (err) {
        // console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send("Task delted in MongoDb");
      }
    })
}
//////////////////////
taskController.GetTasksById = async (req, res) => {
  const lead_id =req.body.leadId;
  taskModel.find({ leadId: lead_id }, (err, results) => {
    if (err) {
      res.send(err);
    } else {
      //res.send(results)
      res.send(results);
    }
  });
};
/////////////////////
taskController.fetch = async (req, res) => {
  const uid = typeof req.body.uid == 'undefined' ? '' : req.body.uid;
  const lead_id = typeof req.body.leadId == 'undefined' ? '' : req.body.leadId;
  //console.log(uid)
  const status_state = req.body.status_state;
  if (!(uid == '')) {
    const resultuser = await userModel.find({ uid: req.body.uid });
    const profile = resultuser[0].profile;
    if (profile.toLowerCase() == 'sales') {
      taskModel.find({ uid: uid }, (err, results) => {
        if (err) {
          res.send(err);
        } else {
          res.send(results);
        }
      });
    } else if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
      taskModel.find(
        { organization_id: resultuser[0].organization_id },
        (err, results) => {
          if (err) {
            res.send(err);
          } else {
            var taskFilteredResults = [];
            if (status_state.toLowerCase() == 'active') {
              results.forEach((item) => {
                if (item.status_state.toLowerCase() == 'active') {
                  filteredResults.push(item);
                }
              });
              res.send(filteredResults);
            } else {
              res.send(results);
            }
          }
        }
      );
    }
  } else if (!(lead_id == '')) {
    taskModel.find({ leadId: lead_id }, (err, results) => {
      if (err) {
        res.send(err);
      } else {
        //res.send(results)
        res.send(results);
      }
    });
  } else {
    res.send("not found");
  }
};

taskController.Search = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  let filter = req.body.filter;
  let leadUserFilter = req.body.leadUserFilter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString ? req.body.searchString : '';
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);


  if (filter) {
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
    }
  }

  Object.keys(filter).forEach((key) => {
    if (datesField.includes(key)) {
      if (filter[key].length && filter[key].length === 2) {
        filter[key] = {
          $gte: moment(filter[key][0]).utcOffset('+05:30').toDate(),
          $lte: moment(filter[key][1]).utcOffset('+05:30').toDate(),
        };
      }
    } else if (booleanField.includes(key)) {
      filter[key].forEach((element, index) => {
        if (element === 'True') {
          filter[key][index] = true;
        } else if (element === 'False') {
          filter[key][index] = false;
        }
      });
    } else {
      filter[key] = { $in: filter[key] };
      if (key === 'status' && filter[key]['$in'].includes('Overdue')) {
        filter[key]['$in'] = filter[key]['$in'].filter((k) => k !== 'Overdue');
        if (!filter[key]['$in'].includes('Pending')) {
          filter[key]['$in'].push('Pending');
          filter['due_date'] = {
            $lte: moment().utcOffset('+05:30').toDate(),
          };
        }
      } else if (
        key === 'status' &&
        filter[key]['$in'].includes('Pending') &&
        !filter[key]['$in'].includes('Overdue')
      ) {
        filter['due_date'] = {
          $gt: moment().utcOffset('+05:30').toDate(),
        };
      }
    }
  });

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

  if (missed === true) {
    filter['next_follow_up_date_time'] = {
      $lt: moment().utcOffset('+05:30').toDate(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  searchString.split(',').forEach((string) => {
    search = string.trim();
    const re = new RegExp(search, 'i');
    if (search.match(/^[0-9]+$/) != null) {
      contact_list.push(re);
    } else if (search !== '') {
      customer_name_list.push(re);
    }
  });
  if (contact_list.length !== 0) {
    filter['contact_no'] = { $in: contact_list };
  }
  if (customer_name_list.length !== 0) {
    filter['customer_name'] = { $in: customer_name_list };
  }

  const resultUser = await userModel.find({ uid });
  // console.log("User record :" + resultUser);
  if (resultUser.length === 0) {
    return res.send({ error: 'User Not Found' });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;
  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        // console.log("mobile no :" + searchString);
        // console.log("mobile no :" + typeof (searchString));
        let find = {
          organization_id,
          ...filter,
        }
        // if(!isObjectEmpty(leadUserFilter)){
        //   find = {
        //     organization_id,
        //     ...filter,
        //     uid: { $in: leadUserFilter.uid },
        //   };
        // }else{
        //   find = {
        //     organization_id,
        //     ...filter,
        //   };
        // }
        const tasks = await taskModel
          .find(
            find,
            { _id: 0, __v: 0 }
          )
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
        console.log(`api endpoint - tasks/search, time taken for query 1, ${timeTakenQuery1}`);

        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);

        return res.send(tasks);
      } catch (error) {
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);

        return res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        let find = { uid: { $in: usersList }, ...filter };
        // if(!isObjectEmpty(leadUserFilter)){
        //   const interesectionArray = usersList.filter(
        //     (value) => leadUserFilter.uid.includes(value)
        //   );
        //   find = { uid: { $in: interesectionArray }, ...filter };
        // }else{
        //   find = { uid: { $in: usersList }, ...filter };
        // }
        const tasks = await taskModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
        console.log(`api endpoint - tasks/search, time taken for query 1, ${timeTakenQuery1}`);

        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);

        return res.send(tasks);
      } catch (error) {
        // console.log(error);
        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);
        return res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      // console.log("mobile no :" + searchString);
      // console.log("mobile no :" + typeof (searchString));
      let find = { uid: { $in: usersList }, ...filter };
      // if(!isObjectEmpty(leadUserFilter)){
      //   const interesectionArray = usersList.filter(
      //     (value) => leadUserFilter.uid.includes(value)
      //   );
      //   find = { uid: { $in: interesectionArray }, ...filter };
      // }else{
      //   find = { uid: { $in: usersList }, ...filter };
      // }
      const tasks = await taskModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
      console.log(`api endpoint - tasks/search, time taken for query 1, ${timeTakenQuery1}`);

      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);

      return res.send(tasks);
    } catch (error) {
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);
      return res.send({ error });
    }
  } else {
    try {
      // console.log("mobile no :" + searchString);
      // console.log("mobile no :" + typeof (searchString));
      const tasks = await taskModel
        .find({ uid, ...filter }, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
      console.log(`api endpoint - tasks/search, time taken for query 1, ${timeTakenQuery1}`);

      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);
      return res.send(tasks);
    } catch (error) {
      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/search, time taken overall, ${timeTakenOverall}`);
      return res.send({ error });
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
         { $set: { last_updated_at_task_panel: formattedDate } },
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

taskController.FilterValues = async (req, res) => {
  const uid = req.body.uid;
  const stage = req.body.stage;
  const filters=req.body.filters;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  let stageFilter = stage ? { stage } : {};
  let missedFilter = {};
  let showFilterValue = req.body.showColumns
  data=TASK_FILTER_VALUES

//   const User = await userModel.find({ uid });
//   let organization_id
//   User.map((item)=>{
//     organization_id= item.organization_id
//  })
// //  console.log("User--User",CacheKey)
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

  if (stage === 'FOLLOWUP') {
    stageFilter = { stage: { $in: ['CALLBACK', 'INTERESTED'] } };
  }

  if (stage === 'MISSED') {
    stageFilter = {};
    missedFilter['next_follow_up_date_time'] = {
      $lt: moment().utcOffset('+05:30').toDate(),
    };
  }
  const finalFilters = { ...stageFilter, ...missedFilter,...filters};

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
      created_by: { $addToSet: "$created_by" },
      source: { $addToSet: "$source" },
      location: { $addToSet: "$location" },
      project: { $addToSet: "$project" },
      property_stage: { $addToSet: "$property_stage" },
      property_type: { $addToSet: "$property_type" },
      stage: { $addToSet: "$stage" },
      inventory_type: { $addToSet: "$inventory_type" },
      type: { $addToSet: "$type" },
      call_back_reason: { $addToSet: "$call_back_reason" },
      branch: { $addToSet: "$branch" },
      state: { $addToSet: "$state" },
    },
  };
}

  const role = req.body.role;

  if(role === false){
    try {
      let userFilters;
      let filters;
      if(teamUids.length > 0){
        userFilters = await userModel.aggregate([
        { $match: { uid:{$in:teamUids} } },
        group,
      ]);
      filters = await taskModel.aggregate([
        { $match: { uid:{$in:teamUids}, ...finalFilters } },
        group,
      ]);
      }else{
        userFilters = await userModel.aggregate([
        { $match: { uid } },
        group,
      ]);
      filters = await taskModel.aggregate([
        { $match: { uid, ...finalFilters } },
        group,
      ]);
      }
      if (filters.length > 0) {
        filters[0].branch =
          userFilters.length > 0
            ? userFilters[0].branch
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
      res.send(singleArray);

      // res.send(finalFilterSorted);
      // console.log("task model filter values:" + JSON.stringify(filters));
      // res.send(filters);
    } catch (error) {
      res.send({ error });
    }
  }else{
      if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        const filters = await taskModel.aggregate([
          { $match: { organization_id, ...finalFilters } },
          group,
        ]);

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
        res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        const filters = await taskModel.aggregate([
          { $match: { uid: { $in: usersList }, ...finalFilters } },
          group,
        ]);

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
        res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        // console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      const filters = await taskModel.aggregate([
        { $match: { uid: { $in: usersList }, ...finalFilters } },
        group,
      ]);

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
     return  res.send(singleArray);
      // res.send(filters);
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      const userFilters = await userModel.aggregate([
        { $match: { uid } },
        group,
      ]);
      const filters = await taskModel.aggregate([
        { $match: { uid, ...finalFilters } },
        group,
      ]);
      if (filters.length > 0) {
        filters[0].branch =
          userFilters.length > 0
            ? userFilters[0].branch
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
     return res.send(singleArray);

      // res.send(finalFilterSorted);
      // console.log("task model filter values:" + JSON.stringify(filters));
      // res.send(filters);
    } catch (error) {
      res.send({ error });
    }
  // }
  }}
};

taskController.TaskCount = async (req, res) => {
  let uidKeys = [];
  const uid = req.body.uid;
  let leadFilter = req.body.leadFilter;
  let leadUserFilter = req.body.leadUserFilter;


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
    });

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
  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: 'User Not Found' });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;


  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        const and = [{ organization_id }];
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            if (key === 'status' &&
            leadFilter[key]?.includes('Overdue') &&
            leadFilter[key]?.includes('Pending')
          ) {
          }
          else if (
            key === 'status' &&
            leadFilter[key]?.includes('Overdue')
          ) {
            leadFilter[key] = leadFilter[key]?.filter(
              (k) => k !== 'Overdue'
            );
            leadFilter[key].push('Pending');
            and.push({
              due_date: { $lte: moment().utcOffset('+05:30').toDate() },
            });
          } else if (
            key === 'status' &&
            leadFilter[key]?.includes('Pending')
          ) {
            and.push({
              due_date: { $gte: moment().utcOffset('+05:30').toDate() },
            });
          }
            if (!datesField.includes(key)) {
              and.push({ [key]: { $in: leadFilter[key] } });
            }
            else {
              and.push({ [key]: leadFilter[key] });
            }
          })
        }
        // if(!isObjectEmpty(leadUserFilter)){
        //   Object.keys(leadUserFilter).forEach((key) => {
        //     and.push({ [key]: { $in: leadUserFilter[key] } });
        //   })
        // }
        const query = [
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ];
        console.log("New query pass :-" + JSON.stringify(query));
        const count = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ]);
        res.send(count[0]);
      }
      catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        const and = [{ uid: { $in: usersList } }];
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            if (key === 'status' &&
              leadFilter[key]?.includes('Overdue') &&
              leadFilter[key]?.includes('Pending')
            ) {
            }
            else if (
              key === 'status' &&
              leadFilter[key]?.includes('Overdue')
            ) {
              leadFilter[key] = leadFilter[key]?.filter(
                (k) => k !== 'Overdue'
              );
              leadFilter[key].push('Pending');
              and.push({
                due_date: { $lte: moment().utcOffset('+05:30').toDate() },
              });
            } else if (
              key === 'status' &&
              leadFilter[key]?.includes('Pending')
            ) {
              and.push({
                due_date: { $gte: moment().utcOffset('+05:30').toDate() },
              });
            }
            if (!datesField.includes(key)) {
              and.push({ [key]: { $in: leadFilter[key] } });
            }
            else {
              and.push({ [key]: leadFilter[key] });
            }
          })
        }
        // if(!isObjectEmpty(leadUserFilter)){
        //   const interesectionArray = usersList.filter(
        //     (value) => leadUserFilter.uid.includes(value)
        //   );
        //   Object.keys(leadUserFilter).forEach((key) => {
        //     and.push({ [key]: { $in: interesectionArray } });
        //   })
        // }
        const count = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ]);
        res.send(count[0]);
      } catch (error) {
        // console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      const and = [{ uid: { $in: usersList } }];
      if (!isObjectEmpty(leadFilter)) {
        Object.keys(leadFilter).forEach((key) => {
          if (key === 'status' &&
          leadFilter[key]?.includes('Overdue') &&
          leadFilter[key]?.includes('Pending')
        ) {
        }
        else if (
          key === 'status' &&
          leadFilter[key]?.includes('Overdue')
        ) {
          leadFilter[key] = leadFilter[key]?.filter(
            (k) => k !== 'Overdue'
          );
          leadFilter[key].push('Pending');
          and.push({
            due_date: { $lte: moment().utcOffset('+05:30').toDate() },
          });
        } else if (
          key === 'status' &&
          leadFilter[key]?.includes('Pending')
        ) {
          and.push({
            due_date: { $gte: moment().utcOffset('+05:30').toDate() },
          });
        }
          if (!datesField.includes(key)) {
            and.push({ [key]: { $in: leadFilter[key] } });
          }
          else {
            and.push({ [key]: leadFilter[key] });
          }
        })
      }
      // if(!isObjectEmpty(leadUserFilter)){
      //   const interesectionArray = usersList.filter(
      //     (value) => leadUserFilter.uid.includes(value)
      //   );
      //   Object.keys(leadUserFilter).forEach((key) => {
      //     and.push({ [key]: { $in: interesectionArray } });
      //   })
      // }
      const count = await taskModel.aggregate([
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
      const and = [{ uid }];
      if (!isObjectEmpty(leadFilter)) {
        Object.keys(leadFilter).forEach((key) => {
          if (key === 'status' &&
          leadFilter[key]?.includes('Overdue') &&
          leadFilter[key]?.includes('Pending')
        ) {
        }
        else if (
          key === 'status' &&
          leadFilter[key]?.includes('Overdue')
        ) {
          leadFilter[key] = leadFilter[key]?.filter(
            (k) => k !== 'Overdue'
          );
          leadFilter[key].push('Pending');
          and.push({
            due_date: { $lte: moment().utcOffset('+05:30').toDate() },
          });
        } else if (
          key === 'status' &&
          leadFilter[key]?.includes('Pending')
        ) {
          and.push({
            due_date: { $gte: moment().utcOffset('+05:30').toDate() },
          });
        }
          if (!datesField.includes(key)) {
            and.push({ [key]: { $in: leadFilter[key] } });
          }
          else {
            and.push({ [key]: leadFilter[key] });
          }
        })
      }
      const count = await taskModel.aggregate([
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

// get task status - pending, missed or completed between given dates
taskController.TaskDateStatus = async (req, res) => {
  const uid = req.body.uid;

  const startDate = moment()
    .set({
      month: req.body.month - 1,
      date: 1,
      hour: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
      year: req.body.year
    })
    .toDate();

  const endDate = moment(startDate).endOf('month').toDate();

  // for pending and missing
  const groupone = {
    $group: {
      _id: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$due_date',
          timezone: '+05:30',
        },
      },
      Pending: {
        $sum: {
          $cond: [
            {
              $and: [
                {
                  $eq: ['$status', 'Pending'],
                },
                { $gte: ['$due_date', moment().utcOffset('+05:30').toDate()] },
              ],
            },
            1,
            0,
          ],
        },
      },
      Missed: {
        $sum: {
          $cond: [
            {
              $and: [
                {
                  $eq: ['$status', 'Pending'],
                },
                { $lte: ['$due_date', moment().utcOffset('+05:30').toDate()] },
              ],
            },
            1,
            0,
          ],
        },
      },
    },
  };

  // for completed
  const grouptwo = {
    $group: {
      _id: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$completed_at',
          timezone: '+05:30',
        },
      },
      Completed: {
        $sum: {
          $cond: [
            {
              $eq: ['$status', 'Completed'],
            },
            1,
            0,
          ],
        },
      },
    },
  };

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    return res.status(400).send({ error: 'User Not Found' });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        // for pending and missed
        const dateStatusOne = await taskModel.aggregate([
          {
            $match: {
              organization_id,
              stage: { $in: ['INTERESTED', 'CALLBACK'] },
            },
          },
          {
            $match: {
              due_date: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          groupone,
          { $sort: { date: 1 } },
        ]);
         
        // for completed
        const dateStatusTwo = await taskModel.aggregate([
          {
            $match: {
              organization_id,
              stage: { $in: ['INTERESTED', 'CALLBACK'] },
            },
          },
          {
            $match: {
              completed_at: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          grouptwo,
          { $sort: { date: 1 } },
        ]);
      
        // merging the arrays and then updating the dates
        const ans = mergeArray(dateStatusOne, dateStatusTwo);
        return res.status(200).send(ans);
      } catch (error) {
        return res.status(400).json({
          success:false,
          error:error.message
        })
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        const dateStatusOne = await taskModel.aggregate([
          {
            $match: {
              uid: { $in: usersList },
              stage: { $in: ['INTERESTED', 'CALLBACK'] },
            },
          },
          {
            $match: {
              due_date: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          groupone,
          { $sort: { date: 1 } },
        ]);

        const dateStatusTwo = await taskModel.aggregate([
          {
            $match: {
              uid: { $in: usersList },
              stage: { $in: ['INTERESTED', 'CALLBACK'] },
            },
          },
          {
            $match: {
              completed_at: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          grouptwo,
          { $sort: { date: 1 } },
        ]);

        const ans = mergeArray(dateStatusOne, dateStatusTwo);
       return  res.status(200).send(ans);
      } catch (error) {
        // console.log(error);
        return res.status(400).json({
          success:false,
          error:error.message
        })
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      const dateStatusOne = await taskModel.aggregate([
        {
          $match: {
            uid: { $in: usersList },
            stage: { $in: ['INTERESTED', 'CALLBACK'] },
          },
        },
        {
          $match: {
            due_date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        groupone,
        { $sort: { date: 1 } },
      ]);

      const dateStatusTwo = await taskModel.aggregate([
        {
          $match: {
            uid: { $in: usersList },
            stage: { $in: ['INTERESTED', 'CALLBACK'] },
          },
        },
        {
          $match: {
            completed_at: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        grouptwo,
        { $sort: { date: 1 } },
      ]);

      const ans = mergeArray(dateStatusOne, dateStatusTwo);

      return res.status(200).send(ans);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message
      })
    }
  } else {
    try {
      const dateStatusOne = await taskModel.aggregate([
        { $match: { uid, stage: { $in: ['INTERESTED', 'CALLBACK'] } } },
        {
          $match: {
            due_date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        groupone,
        { $sort: { date: 1 } },
      ]);

      const dateStatusTwo = await taskModel.aggregate([
        { $match: { uid, stage: { $in: ['INTERESTED', 'CALLBACK'] } } },
        {
          $match: {
            completed_at: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        grouptwo,
        { $sort: { date: 1 } },
      ]);

      const ans = mergeArray(dateStatusOne, dateStatusTwo);

      return res.status(200).send(ans);
    } catch (error) {
      return res.status(400).json({
        success:false,
        error:error.message
      })
    }
  }
};

// to get task of a particular day
taskController.GetTasksOfDate = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  const date = moment(req.body.date, 'DD-MM-YYYY').utcOffset('+05:30');
  const startDate = date.startOf('day').toDate();
  const endDate = date.endOf('day').toDate();
  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    return res.send({ error: 'User Not Found' });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        const tasks = await taskModel
          .find({
            organization_id,
            $or: [
              {
                $and: [
                  { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                  { status: 'Pending' },
                  { due_date: { $gte: startDate, $lte: endDate } },
                ],
              },
              {
                $and: [
                  { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                  { status: 'Completed' },
                  { completed_at: { $gte: startDate, $lte: endDate } },
                ],
              },
            ],
          })
          .sort({ due_date: -1 });
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
        console.log(`api endpoint - tasks/getTasksOfDate, time taken for query 1, ${timeTakenQuery1}`);

        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);

        return res.send(tasks);
      } catch (error) {

        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);
        return res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        const tasks = await taskModel
          .find({
            uid: { $in: usersList },
            $or: [
              {
                $and: [
                  { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                  { status: 'Pending' },
                  { due_date: { $gte: startDate, $lte: endDate } },
                ],
              },
              {
                $and: [
                  { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                  { status: 'Completed' },
                  { completed_at: { $gte: startDate, $lte: endDate } },
                ],
              },
            ],
          })
          .sort({ due_date: -1 });

        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
        console.log(`api endpoint - tasks/getTasksOfDate, time taken for query 1, ${timeTakenQuery1}`);

        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);

        return res.send(tasks);
      } catch (error) {
        // console.log(error);

        let apiEnd = new Date();
        timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
        console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);
        return res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      const tasks = await taskModel
        .find({
          uid: { $in: usersList },
          $or: [
            {
              $and: [
                { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                { status: 'Pending' },
                { due_date: { $gte: startDate, $lte: endDate } },
              ],
            },
            {
              $and: [
                { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                { status: 'Completed' },
                { completed_at: { $gte: startDate, $lte: endDate } },
              ],
            },
          ],
        })
        .sort({ due_date: -1 });


      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
      console.log(`api endpoint - tasks/getTasksOfDate, time taken for query 1, ${timeTakenQuery1}`);

      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);
      return res.send(tasks);
    } catch (error) {

      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);
      return res.send({ error });
    }
  } else {
    try {
      const tasks = await taskModel
        .find({
          uid,
          $or: [
            {
              $and: [
                { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                { status: 'Pending' },
                { due_date: { $gte: startDate, $lte: endDate } },
              ],
            },
            {
              $and: [
                { stage: { $in: ['INTERESTED', 'CALLBACK'] } },
                { status: 'Completed' },
                { completed_at: { $gte: startDate, $lte: endDate } },
              ],
            },
          ],
        })
        .sort({ due_date: -1 });

      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
      console.log(`api endpoint - tasks/getTasksOfDate, time taken for query 1, ${timeTakenQuery1}`);

      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);
      return res.send(tasks);
    } catch (error) {

      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - tasks/getTasksOfDate, time taken overall, ${timeTakenOverall}`);
      return res.send({ error });
    }
  }
};

// analytics graph and report data
taskController.TasksReport = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: 'User Not Found' });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  const resultCacheData = getCachedData(req.body);
  if (resultCacheData.cachedData !== undefined && req.body.updateData === false) {
    
  //  updateAccessTime(resultCacheData.CacheKey);
   return res.send(resultCacheData.cachedData)
 }else{
  

  // status = 'Completed', etc
  const status = req.body.status || '';

  let stage;

  let date_type;

  if (status === 'Completed') {
    date_type = 'completed_at';
    stage = { stage: { $in: ['INTERESTED', 'WON', 'LOST'] } };
  } else {
    date_type = 'due_date';
    stage = { stage: { $in: ['CALLBACK', 'INTERESTED'] } };
  }

  // for date filters
  const date_parameter = `${date_type}`;

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset('+05:30')
      .startOf('day')
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset('+05:30')
      .endOf('day')
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

  const type = req.params.type;

  let status_type;

  if (type === 'associate') {
    status_type = 'associate_status';
  } else {
    status_type = 'source_status';
  }

  // parameters - ['type']
  const parameter = req.body.parameter;

  // for different conditions in match aggregate function
  let statusCondition;

  if (status === 'Pending') {
    statusCondition = [
      { status: { $eq: 'Pending' } },
      {
        due_date: {
          $gte: moment().utcOffset('+05:30').toDate(),
        },
      },
    ];
  } else if (status === 'Overdue') {
    statusCondition = [
      { status: { $eq: 'Pending' } },
      {
        due_date: {
          $lte: moment().utcOffset('+05:30').toDate(),
        },
      },
    ];
  } else {
    statusCondition = [{ status: 'Completed' }];
  }

  const groupByOwner = {
    $group: {
      _id: { owner: '$uid', [`${parameter}`]: `$${parameter}` },
      num: { $sum: 1 },
    },
  };

  const groupByParameter = {
    $group: {
      _id: '$_id.owner',
      [`${parameter}`]: {
        $push: { [`${parameter}`]: `$_id.${parameter}`, count: '$num' },
      },
    },
  };

  const groupByOwnerSource = {
    $group: {
      _id: {
        lead_source: '$leads.lead_source',
        [`${parameter}`]: `$${parameter}`,
      },
      num: { $sum: 1 },
    },
  };

  const groupByParameterSource = {
    $group: {
      _id: '$_id.lead_source',
      [`${parameter}`]: {
        $push: { [`${parameter}`]: `$_id.${parameter}`, count: '$num' },
      },
    },
  };

  const project = {
    $project: {
      owner: '$_id',
      _id: 0,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  const groupByType = {
    $group: {
      _id: {
        $dateToString: {
          format: '%d-%m-%Y',
          date: `$${date_type}`,
          timezone: '+05:30',
        },
      },
      Meeting: {
        $sum: {
          $cond: [{ $eq: ['$type', 'Meeting'] }, 1, 0],
        },
      },
      Call_Back: {
        $sum: {
          $cond: [{ $eq: ['$type', 'Call Back'] }, 1, 0],
        },
      },
      Site_Visit: {
        $sum: {
          $cond: [{ $eq: ['$type', 'Site Visit'] }, 1, 0],
        },
      },
    },
  };

  const projectByType = {
    $project: {
      [`${date_type}`]: '$_id',
      _id: false,
      Meeting: 1,
      Call_Back: 1,
      Site_Visit: 1,
    },
  };

  let uidKeys = [];
  let isReportingTo = false;
  let isBranchTo = false;
  const taskFilter = req.body.taskFilter;
  const leadFilter = req.body.leadFilter;
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

  console.log("LeadUser filter values object :" + JSON.stringify(leadUserFilter));
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


  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (taskFilter[key].length && taskFilter[key].length === 2) {
          taskFilter[key] = {
            $gte: moment(taskFilter[key][0]).utcOffset('+05:30').toDate(),
            $lte: moment(taskFilter[key][1]).utcOffset('+05:30').toDate(),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (leadFilter[key].length && leadFilter[key].length === 2) {
          if (key === "lead_assign_time") {
            leadFilter[`leads.${key}`] = {
              $gte: moment(leadFilter[key][0]).utcOffset('+05:30').toDate(),
              $lte: moment(leadFilter[key][1]).utcOffset('+05:30').toDate(),
            };
            delete leadFilter.lead_assign_time;
          }
          else {
            leadFilter[key] = {
              $gte: moment(leadFilter[key][0]).utcOffset('+05:30').toDate(),
              $lte: moment(leadFilter[key][1]).utcOffset('+05:30').toDate(),
            };
          }
        }
      } else if (booleanField.includes(key.split('.')[1])) {
        leadFilter[key].forEach((element, index) => {
          if (element === 'True') {
            leadFilter[key] = true;
          } else if (element === 'False') {
            leadFilter[key] = false;
          }
        });
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
        if (key.split('.')[1] == "reporting_to") {
          isReportingTo = true;
        }
        else if (key.split('.')[1] == "branch") {
          isBranchTo = true;
        }
      }
    });

  // if (isReportingTo == true) {
  //   console.log("DATA : " + JSON.stringify(leadFilter["leads.reporting_to"]));
  //   const uidReportingTo = await userModel.find({ "reporting_to": leadFilter["leads.reporting_to"] }, { "_id": 0, "uid": 1 });
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
  //   console.log("DATA : " + JSON.stringify(leadFilter["leads.branch"]));
  //   const uidBranchTo = await userModel.find({ "branch": leadFilter["leads.branch"] }, { "_id": 0, "uid": 1 });
  //   console.log("UID : " + uidBranchTo);
  //   // uidReport(uidReportingTo);

  //   Object.keys(uidBranchTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidBranchTo[key].uid);
  //     uidKeys.push(uidBranchTo[key].uid);
  //   });
  //   console.log("UID Key arr:" + uidKeys);

  // }

  // if (isTeamTo == true) {
  //   console.log("DATA : " + JSON.stringify(leadFilter["leads.team"]));
  //   const uidTeamTo = await userModel.find({ "team": leadFilter["leads.team"] }, { "_id": 0, "uid": 1 });
  //   console.log("UID : " + uidTeamTo);
  //   // uidReport(uidReportingTo);

  //   Object.keys(uidTeamTo).forEach((key) => {
  //     console.log("Key:" + key);
  //     console.log("Value:" + uidTeamTo[key].uid);
  //     uidKeys.push(uidTeamTo[key].uid);
  //   });
  //   console.log("UID Key arr:" + uidKeys);

  // }
  if (!isObjectEmpty(leadUserFilter)) {
    const fullFinalQuery = JSON.parse(finalQuery);

    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    Object.keys(uidTeamTo).forEach((key) => {
      // console.log("Key:" + key);
      // console.log("Value:" + uidTeamTo[key].uid);
      uidKeys.push(uidTeamTo[key].uid);
    });
    console.log("Team uid Key array :" + uidKeys);
  }

  // Chart count
  let ChartCount = {};

  let Total = 0;

  const countHelp = (arr, para = parameter) => {
    arr.forEach((element) => {
      var makeKey = element[`${para}`];
      makeKey.forEach((c) => {
        var key = c[`${para}`];
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

  const lookup = {
    $lookup: {
      from: 'contacts',
      localField: 'leadId',
      foreignField: 'Id',
      as: 'leads',
    },
  };

  const resultArrayFormat = (report) => {
    report.forEach((rep) => {
      let meeting = false,
        callback = false,
        site = false;
      rep.type?.forEach((type) => {
        if (type.type === 'Meeting') meeting = true;
        else if (type.type === 'Call Back') callback = true;
        else if (type.type === 'Site Visit') site = true;
      });
      if (!meeting) rep.type?.push({ type: 'Meeting', count: 0 });
      if (!callback) rep.type?.push({ type: 'Call Back', count: 0 });
      if (!site) rep.type?.push({ type: 'Site Visit', count: 0 });
    });
  };

  const countByType = (result) => {
    result.forEach((res) => {
      let Total = res.Meeting + res.Call_Back + res.Site_Visit;
      res.Total = Total;
    });
  };

  const dateArrayFormat = (countArr, start, end) => {
    const result = {};
    if (start === '') {
      start = moment().utcOffset('+05:30').subtract(30, 'days');
      end = moment().utcOffset('+05:30');

      for (let m = start; m.isBefore(end); m.add(1, 'days')) {
        result[`${m.format('DD-MM-YYYY')}`] = 0;
      }

      countArr.forEach((arr) => {
        if (result.hasOwnProperty(arr[`${date_type}`])) {
          result[arr[`${date_type}`]] = arr.Total;
        }
      });
    } else {
      let endDate = moment(end).utcOffset('+05:30');
      for (
        let m = moment(start).utcOffset('+05:30');
        m.isBefore(endDate);
        m.add(1, 'days')
      ) {
        result[`${m.format('DD-MM-YYYY')}`] = 0;
      }

      countArr.forEach((arr) => {
        if (result.hasOwnProperty(arr[`${date_type}`]))
          result[arr[`${date_type}`]] = arr.Total;
      });
    }
    // console.log("TaskController Result ret: "+result);
    return result;
  };

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        let report;
        let and = [{ organization_id }];

        if (stage) {
          and.push(stage);
        }

        if (date_condition) {
          and.push(date_condition);
        }
        // else {
        //   if (status === 'Pending') {
        //     date_condition = {
        //       [`${date_parameter}`]: {
        //         $gte: moment(moment() - 30 * 24 * 60 * 60 * 1000)
        //           .utcOffset('+05:30')
        //           .toDate(),
        //         $lte: moment(moment() + 30 * 24 * 60 * 60 * 1000)
        //           .utcOffset('+05:30')
        //           .toDate(),
        //       },
        //     };
        //   } else {
        //     date_condition = {
        //       [`${date_parameter}`]: {
        //         $gte: moment(moment() - 30 * 24 * 60 * 60 * 1000)
        //           .utcOffset('+05:30')
        //           .toDate(),
        //         $lte: moment().utcOffset('+05:30').toDate(),
        //       },
        //     };
        //   }
        //   and.push(date_condition);
        // }

        if (!isObjectEmpty(taskFilter)) {
          and.push(taskFilter);
        }


        and = and.concat(statusCondition);

        let group, groupBy;

        if (type === 'associate') {
          group = groupByOwner;
          groupBy = groupByParameter;
        } else if (type === 'source') {
          group = groupByOwnerSource;
          groupBy = groupByParameterSource;
        }

        let lookupand = [{ [`leads.${status_type}`]: true }];
        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            if (key == "leads.reporting_to") {
              lookupand.push({ [`${key == "leads.reporting_to" ? "uid" : key}`]: key == "leads.reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            }
            else if (key == "leads.branch") {
              lookupand.push({ [`${key == "leads.branch" ? "uid" : key}`]: key == "leads.branch" ? { $in: uidKeys } : leadFilter[key] });
            }

            else if (key == "leads.team") {
              lookupand.push({ [`${key == "leads.team" ? "uid" : key}`]: key == "leads.team" ? { $in: uidKeys } : leadFilter[key] });
            }
            else {
              lookupand.push({ [`${key == "leads.reporting_to" ? "uid" : key}`]: key == "leads.reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            }
          });
        }
        if (!isObjectEmpty(leadUserFilter)) {
          lookupand.push({ ["uid"]: { $in: uidKeys } });
        }

        // if (callFilter) lookupand.push(callFilter);
        // if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);

        report = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
       
        if (report.length > 0) resultArrayFormat(report);

        if (report.length > 0) countHelp(report);

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
        // console.log(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);

      try {
        let report;

        let and = [{ uid: { $in: usersList } }];

        if (stage) {
          and.push(stage);
        }

        if (date_condition) {
          and.push(date_condition);
        }
        // else {
        //   if (status === 'Pending') {
        //     date_condition = {
        //       [`${date_parameter}`]: {
        //         $gte: moment(Date.now() - 30 * 24 * 60 * 60 * 1000)
        //           .utcOffset('+05:30')
        //           .toDate(),
        //         $lte: moment(Date.now() + 30 * 24 * 60 * 60 * 1000)
        //           .utcOffset('+05:30')
        //           .toDate(),
        //       },
        //     };
        //   } else {
        //     date_condition = {
        //       [`${date_parameter}`]: {
        //         $gte: moment(Date.now() - 30 * 24 * 60 * 60 * 1000)
        //           .utcOffset('+05:30')
        //           .toDate(),
        //         $lte: moment().utcOffset('+05:30').toDate(),
        //       },
        //     };
        //   }
        //   and.push(date_condition);
        // }

        if (!isObjectEmpty(taskFilter)) {
          and.push(taskFilter);
        }

        and = and.concat(statusCondition);

        let group, groupBy;

        if (type === 'associate') {
          group = groupByOwner;
          groupBy = groupByParameter;
        } else if (type === 'source') {
          group = groupByOwnerSource;
          groupBy = groupByParameterSource;
        }

        let lookupand = [{ [`leads.${status_type}`]: true }];

        // if (callFilter) lookupand.push(callFilter);
        if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);

        report = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);

        if (report.length > 0) resultArrayFormat(report);

        if (report.length > 0) countHelp(report);

        //////////////////////Non performing user functionality ////////////////////////////
        if (req.params.type === "associate" && leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id,status:"ACTIVE",  profile: { $nin: ["Admin", "CEO", "Operation Manager"] }, branch: { $in: permission } },
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
        // console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    if (type === 'source') {
      return res.send('Only for Lead manager');
    }
    let usersList = await getTeamUsers(uid, organization_id);

    try {
      let report;
      let and = [{ uid: { $in: usersList } }];

      if (stage) {
        and.push(stage);
      }

      if (date_condition) {
        and.push(date_condition);
      }
      // else {
      //   if (status === 'Pending') {
      //     date_condition = {
      //       [`${date_parameter}`]: {
      //         $gte: moment(Date.now() - 30 * 24 * 60 * 60 * 1000)
      //           .utcOffset('+05:30')
      //           .toDate(),
      //         $lte: moment(Date.now() + 30 * 24 * 60 * 60 * 1000)
      //           .utcOffset('+05:30')
      //           .toDate(),
      //       },
      //     };
      //   } else {
      //     date_condition = {
      //       [`${date_parameter}`]: {
      //         $gte: moment(Date.now() - 30 * 24 * 60 * 60 * 1000)
      //           .utcOffset('+05:30')
      //           .toDate(),
      //         $lte: moment().utcOffset('+05:30').toDate(),
      //       },
      //     };
      //   }
      //   and.push(date_condition);
      // }

      if (!isObjectEmpty(taskFilter)) {
        and.push(taskFilter);
      }
      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      and = and.concat(statusCondition);

      let group, groupBy;

      if (type === 'associate') {
        group = groupByOwner;
        groupBy = groupByParameter;
      } else if (type === 'source') {
        group = groupByOwnerSource;
        groupBy = groupByParameterSource;
      }

      let lookupand = [{ [`leads.${status_type}`]: true }];
      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          if (key == "leads.reporting_to") {
            lookupand.push({ [`${key == "leads.reporting_to" ? "uid" : key}`]: key == "leads.reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
          else if (key == "leads.branch") {
            lookupand.push({ [`${key == "leads.branch" ? "uid" : key}`]: key == "leads.branch" ? { $in: uidKeys } : leadFilter[key] });
          }
          else {
            lookupand.push({ [`${key == "leads.reporting_to" ? "uid" : key}`]: key == "leads.reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
        });
      }

      // if (callFilter) lookupand.push(callFilter);
      // if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);

      report = await taskModel.aggregate([
        {
          $match: {
            $and: and,
          },
        },
        lookup,
        { $unwind: '$leads' },
        {
          $match: {
            $and: lookupand,
          },
        },
        group,
        groupBy,
        project,
      ]);

      if (report.length > 0) resultArrayFormat(report);

      if (report.length > 0) countHelp(report);

      
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
      // console.log(error);
      res.send({ error });
    }
  } else {
    if (type === 'source') {
      return res.send('Only for Lead manager');
    }
    try {
      let report;
      let cond;

      if (status === 'Completed') {
        cond = { completed_at: { $exists: true, $ne: null } };
      } else {
        cond = { due_date: { $exists: true, $ne: null } };
      }
      let and = [{ uid }, cond];

      if (stage) {
        and.push(stage);
      }

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(taskFilter)) {
        and.push(taskFilter);
      }

      and = and.concat(statusCondition);

      let lookupand = [{ [`leads.${status_type}`]: true }];

      // if (callFilter) lookupand.push(callFilter);
      if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);

      report = await taskModel.aggregate([
        {
          $match: {
            $and: and,
          },
        },
        lookup,
        { $unwind: '$leads' },
        {
          $match: {
            $and: lookupand,
          },
        },
        // groupByDates,
        // groupCond,
        // projectCond,
        groupByType,
        projectByType,
      ]);

      // if (report.length > 0) resultArrayFormat(report);

      if (report.length > 0) countByType(report);

      if (report.length > 0)
        ChartCount = dateArrayFormat(
          report,
          start_date ? moment(start_date) : '',
          end_date ? moment(end_date) : ''
        );

      let empty = isObjectEmpty(ChartCount);

      let emptyArray = [];

      if (!empty) {

        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
        res.send({ report, ChartCount, Total });}
      else {

        checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount: emptyArray, Total })
        res.send({ report, ChartCount: emptyArray, Total });}
    } catch (error) {
      // console.log(error);
      res.send({ error });
    }
  }
}
};

taskController.TasksSalesCategoryCount = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: 'User Not Found' });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  let date_type = 'created_at';

  // for date filters
  const date_parameter = `${date_type}`;

  let start_date, end_date, date_condition;

  if (req.body.start_date)
    start_date = moment(req.body.start_date).utcOffset('+05:30').toDate();

  if (req.body.end_date)
    end_date = moment(req.body.end_date).utcOffset('+05:30').toDate();

  if (req.body.start_date && req.body.end_date) {
    date_condition = {
      [`${date_parameter}`]: {
        $gte: moment(start_date).utcOffset('+05:30').toDate(),
        $lte: moment(end_date).utcOffset('+05:30').toDate(),
      },
    };
  } else {
    // if dates are not mentioned, we send data for last 30 days
    date_condition = {
      [`${date_parameter}`]: {
        $gte: moment(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .utcOffset('+05:30')
          .toDate(),
        $lte: moment().utcOffset('+05:30').toDate(),
      },
    };
  }

  const type = req.params.type;

  let status_type;

  if (type === 'associate') {
    status_type = 'associate_status';
  } else {
    status_type = 'source_status';
  }

  const stage = { stage: { $in: ['CALLBACK', 'INTERESTED', 'WON'] } };

  // grouping by task type - Meeting, Call Back, Site Visit
  const groupByType = {
    $group: {
      _id: '$status',
      Meeting: {
        $sum: {
          $cond: [{ $eq: ['$type', 'Meeting'] }, 1, 0],
        },
      },
      Call_Back: {
        $sum: {
          $cond: [{ $eq: ['$type', 'Call Back'] }, 1, 0],
        },
      },
      Site_Visit: {
        $sum: {
          $cond: [{ $eq: ['$type', 'Site Visit'] }, 1, 0],
        },
      },
    },
  };

  // project query for task type
  const projectByType = {
    $project: {
      status: '$_id',
      _id: false,
      Meeting: 1,
      Call_Back: 1,
      Site_Visit: 1,
    },
  };

  const taskFilter = req.body.taskFilter;
  const leadFilter = req.body.leadFilter;

  taskFilter !== undefined &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (taskFilter[key].length && taskFilter[key].length === 2) {
          taskFilter[key] = {
            $gte: moment(taskFilter[key][0]).utcOffset('+05:30').toDate(),
            $lte: moment(taskFilter[key][1]).utcOffset('+05:30').toDate(),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  leadFilter !== undefined &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (leadFilter[key].length && leadFilter[key].length === 2) {
          leadFilter[key] = {
            $gte: moment(leadFilter[key][0]).utcOffset('+05:30').toDate(),
            $lte: moment(leadFilter[key][1]).utcOffset('+05:30').toDate(),
          };
        }
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
      }
    });

  const lookup = {
    $lookup: {
      from: 'contacts',
      localField: 'leadId',
      foreignField: 'Id',
      as: 'leads',
    },
  };

  try {
    if (profile.toLowerCase() == 'sales') {
      if (type === 'source') {
        return res.send('Only for Lead manager');
      }
      let report;

      let and = [{ uid }, stage];

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(taskFilter)) {
        and.push(taskFilter);
      }

      let lookupand = [{ [`leads.${status_type}`]: true }];

      // if (callFilter) lookupand.push(callFilter);
      if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);
      report = await taskModel.aggregate([
        {
          $addFields: {
            status: {
              $cond: {
                if: {
                  $gt: ['$due_date', moment().utcOffset('+05:30').toDate()],
                },
                then: 'Overdue',
                else: '$status',
              },
            },
          },
        },
        {
          $match: {
            $and: and,
          },
        },
        lookup,
        { $unwind: '$leads' },
        {
          $match: {
            $and: lookupand,
          },
        },
        groupByType,
        projectByType,
      ]);

      // formatting data as required in the frontend
      const arr = {
        Pending: { 'Site Visit': 0, 'Call Back': 0, Meeting: 0 },
        Completed: { 'Site Visit': 0, 'Call Back': 0, Meeting: 0 },
        Overdue: { 'Site Visit': 0, 'Call Back': 0, Meeting: 0 },
        Cancelled: { 'Site Visit': 0, 'Call Back': 0, Meeting: 0 },
      };

      report.forEach((rep) => {
        arr[rep.status]['Site Visit'] += rep.Site_Visit;
        arr[rep.status]['Call Back'] += rep.Call_Back;
        arr[rep.status]['Meeting'] += rep.Meeting;
      });

      res.send({ arr });
    } else {
      res.send('Only for sales profile');
    }
  } catch (errs) {
    res.send({ error: errs.stack });
  }
};
//////////////////////////////////////////////////////////////
// Author: Anuj Chauhan
// Date: 30/05/2022
// Comment: Added this API to get total drill down count for
// tasks analytics (associate & source ).
///////////////////////////////////////////
taskController.DrillDownCount = async (req, res) => {
  const uid = req.body.uid;
  let taskFilter = req.body.taskFilter;
  let leadFilter = req.body.leadFilter;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  // const sort = req.body.sort;
  const missed = req.body.missed;
  // const searchString = req.body.searchString ? req.body.searchString : '';
  // const page = Number(req.body.page);
  // const pageSize = Number(req.body.pageSize);

  let stage;

  let userQuery = {};
  let report = [];
  let branchName = "";
  let teamName = "";
  let cond = false;

  if (taskFilter.status && !taskFilter.status.includes('Completed')) {
    stage = { stage: { $in: ['CALLBACK', 'INTERESTED'] } };
  } else {
    stage = { stage: { $in: ['INTERESTED', 'WON', 'LOST'] } };
  }

  if(leadFilter){
    if ('leads.employee_id' in leadFilter || 'leads.employee_name' in leadFilter || 'leads.contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('leads.employee_id' in leadFilter && 'leads.employee_name' in leadFilter) {
        mergedValues.push(...leadFilter['leads.employee_id'], ...leadFilter['leads.employee_name']);
      } else if ('leads.employee_id' in leadFilter) {
        mergedValues.push(...leadFilter['leads.employee_id']);
      } else if ('leads.employee_name' in leadFilter) {
        mergedValues.push(...leadFilter['leads.employee_name']);
      }
    
      if ('leads.contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter['leads.contact_owner_email']);
      }
    
      leadFilter['leads.contact_owner_email'] = [...new Set(mergedValues)];
      
      delete leadFilter['leads.employee_id'];
      delete leadFilter['leads.employee_name'];
    }
  }

  Object.keys(taskFilter).forEach((key) => {
    if (datesField.includes(key)) {
      if (taskFilter[key].length && taskFilter[key].length === 2) {
        taskFilter[key] = {
          $gte: moment(taskFilter[key][0]).utcOffset('+05:30').toDate(),
          $lte: moment(taskFilter[key][1]).utcOffset('+05:30').toDate(),
        };
      }
    } else if (booleanField.includes(key)) {
      taskFilter[key].forEach((element, index) => {
        if (element === 'True' || element === true) {
          taskFilter[key] = true;
        } else if (element === 'False' || element === false) {
          taskFilter[key] = false;
        }
      });
    } else {
      taskFilter[key] = { $in: taskFilter[key] };
    }
  });

  Object.keys(leadFilter).forEach((key) => {
    if (datesField.includes(key.split('.')[1])) {
      if (leadFilter[key].length && leadFilter[key].length === 2) {
        leadFilter[key] = {
          $gte: moment(leadFilter[key][0]).utcOffset('+05:30').toDate(),
          $lte: moment(leadFilter[key][1]).utcOffset('+05:30').toDate(),
        };
      }
    } else if (booleanField.includes(key.split('.')[1])) {
      leadFilter[key].forEach((element, index) => {
        if (element === 'True' || element === true) {
          leadFilter[key] = true;
        } else if (element === 'False' || element === false) {
          leadFilter[key] = false;
        }
      });
    }
    else if (key.split('.')[1] === "reporting_to") {
      report = leadFilter[key];
      userQuery["reporting_to"] = { $in: report };
      cond = true;
      // delete filter[key];
    }else if (key.split('.')[1] === "branch") {
      branchName = leadFilter[key];
      userQuery["branch"] = { $in: branchName };
      cond = true;
      // delete filter[key];
    }else if (key.split('.')[1] === "team") {
      teamName = leadFilter[key];
      userQuery["team"] = { $in: teamName };
      cond = true;
      // delete filter[key];
    }
    else {
      leadFilter[key] = { $in: leadFilter[key] };
    }
  });

  if (missed === true) {
    taskFilter['next_follow_up_date_time'] = {
      $lt: moment().utcOffset('+05:30').toDate(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  // searchString.split(',').forEach((string) => {
  //   search = string.trim();
  //   const re = new RegExp(search, 'i');
  //   if (search.match(/^[0-9]+$/) != null) {
  //     contact_list.push(re);
  //   } else if (search !== '') {
  //     customer_name_list.push(re);
  //   }
  // });

  if (contact_list.length !== 0) {
    taskFilter['contact_no'] = { $in: contact_list };
  }
  if (customer_name_list.length !== 0) {
    taskFilter['customer_name'] = { $in: customer_name_list };
  }
  let resultUser = "";
  if(teamUids.length < 1){
     resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
       res.send({ error: 'User Not Found' });
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

  // let sortModified = {};

  // for (const [key, value] of Object.entries(sort)) {
  //   let val = parseInt(value);
  //   sortModified[key] = val;
  // }

  // const sortQuery = {
  //   $sort: sortModified,
  // };

  // const limitQuery = {
  //   $limit: pageSize,
  // };

  // const skipQuery = {
  //   $skip: (page - 1) * pageSize,
  // };

  const lookup = {
    $lookup: {
      from: 'contacts',
      localField: 'leadId',
      foreignField: 'Id',
      as: 'leads',
    },
  };
  let lookupand = [];
  // for getting data according to role
  const role = req.body.role;
  if (role === false) {
    try {
      let and;
      if(teamUids.length > 0){
        and = [{ uid:{$in:teamUids} }];
      }else{
        and = [{ uid }];
      }

      if (stage) {
        and.push(stage);
      }

      let tasks;
      Object.keys(taskFilter).forEach((key) => {
        if (key === 'status' &&
          taskFilter[key]['$in'].includes('Overdue') &&
          taskFilter[key]['$in'].includes('Pending')
        ) {

        }
        else if (
          key === 'status' &&
          taskFilter[key]['$in'].includes('Overdue')
        ) {
          taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
            (k) => k !== 'Overdue'
          );
          taskFilter[key]['$in'].push('Pending');
          and.push({
            due_date: { $lte: moment().utcOffset('+05:30').toDate() },
          });
        } else if (
          key === 'status' &&
          taskFilter[key]['$in'].includes('Pending')
        ) {
          and.push({
            due_date: { $gte: moment().utcOffset('+05:30').toDate() },
          });
        }
      });

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: taskFilter[key] });
        });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          // lookupand.push({ [`${key}`]: leadFilter[key] });
          if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
            lookupand.push({ [`${key}`]: leadFilter[key] });
          }
        });
        tasks = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupand,
            },
          },
          {
            "$count": "total"
          }
        ]);
      } else {
        tasks = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          {
            "$count": "total"
          }
        ]);
      }

       res.send(tasks);
    } catch (error) {
      // console.log(error);
       res.send({ error });
    }

  } else {
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        try {
          let and;
          if(!cond){
            and = [{ organization_id }];
          }else{
            and = [{ organization_id,uid: { $in: reportingUsers }}];
          }
          if (stage) {
            and.push(stage);
          }
          let tasks;
          Object.keys(taskFilter).forEach((key) => {
            if (key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue') &&
              taskFilter[key]['$in'].includes('Pending')
            ) {

            }
            else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue')
            ) {
              taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
                (k) => k !== 'Overdue'
              );
              taskFilter[key]['$in'].push('Pending');
              and.push({
                due_date: { $lte: moment().utcOffset('+05:30').toDate() },
              });
            } else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Pending')
            ) {
              and.push({
                due_date: { $gte: moment().utcOffset('+05:30').toDate() },
              });
            }
          });

          if (!isObjectEmpty(taskFilter)) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              and.push({ [`${key}`]: taskFilter[key] });
            });
          }

          if (!isObjectEmpty(leadFilter)) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
                lookupand.push({ [`${key}`]: leadFilter[key] });
              }
            });
            const query = [
              {
                $match: {
                  $and: and,
                },
              },
              lookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupand,
                },
              },
              {
                "$count": "total"
              }
            ];
            console.log("drilldown count total", JSON.stringify(query));
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              lookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupand,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else {
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              {
                "$count": "total"
              }
            ]);
          }

           res.send(tasks);
        } catch (error) {
          // console.log(error);
           res.send({ error });
        }
      } else {
        let and;
        let usersList = await getBranchUsers(uid, organization_id, permission);
        try {
          const interesectionArray = usersList.filter(
            (value) => reportingUsers.includes(value)
          );
          if(!cond){
             and = [{ uid: { $in: usersList } }];
          }else{
            and = [{ uid: { $in: interesectionArray } }];
          }
          if (stage) {
            and.push(stage);
          }
          let tasks;
          Object.keys(taskFilter).forEach((key) => {
            if (key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue') &&
              taskFilter[key]['$in'].includes('Pending')
            ) {
            }
            else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue')
            ) {
              taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
                (k) => k !== 'Overdue'
              );
              taskFilter[key]['$in'].push('Pending');
              and.push({
                due_date: { $lte: moment().utcOffset('+05:30').toDate() },
              });
            } else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Pending')
            ) {
              and.push({
                due_date: { $gte: moment().utcOffset('+05:30').toDate() },
              });
            }
          });

          if (!isObjectEmpty(taskFilter)) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              and.push({ [`${key}`]: taskFilter[key] });
            });
          }

          if (!isObjectEmpty(leadFilter)) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
                lookupand.push({ [`${key}`]: leadFilter[key] });
              }
            });
           
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              lookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupand,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else {
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          }

           res.send(tasks);
        } catch (error) {
          // console.log(error);
           res.send({ error });
        }
      }
    } else if (profile.toLowerCase() == 'team lead') {
      let and;
      let usersList = await getTeamUsers(uid, organization_id);
      try {
        const interesectionArray = usersList.filter(
          (value) => reportingUsers.includes(value)
        );
        if(!cond){
           and = [{ uid: { $in: usersList } }];
        }else{
          and = [{ uid: { $in: interesectionArray } }];
        }

        if (stage) {
          and.push(stage);
        }

        let tasks;
        Object.keys(taskFilter).forEach((key) => {
          if (key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue') &&
            taskFilter[key]['$in'].includes('Pending')
          ) {

          }
          else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue')
          ) {
            taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
              (k) => k !== 'Overdue'
            );
            taskFilter[key]['$in'].push('Pending');
            and.push({
              due_date: { $lte: moment().utcOffset('+05:30').toDate() },
            });
          } else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Pending')
          ) {
            and.push({
              due_date: { $gte: moment().utcOffset('+05:30').toDate() },
            });
          }
        });

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
              lookupand.push({ [`${key}`]: leadFilter[key] });
            }
          });

          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupand,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else {
          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            {
              "$count": "total"
            }
          ]);
        }

         res.send(tasks);
      } catch (error) {
        // console.log(error);
         res.send({ error });
      }
    } else {
      try {
        let and = [{ uid }];

        if (stage) {
          and.push(stage);
        }

        let tasks;
        Object.keys(taskFilter).forEach((key) => {
          if (key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue') &&
            taskFilter[key]['$in'].includes('Pending')
          ) {

          }
          else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue')
          ) {
            taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
              (k) => k !== 'Overdue'
            );
            taskFilter[key]['$in'].push('Pending');
            and.push({
              due_date: { $lte: moment().utcOffset('+05:30').toDate() },
            });
          } else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Pending')
          ) {
            and.push({
              due_date: { $gte: moment().utcOffset('+05:30').toDate() },
            });
          }
        });

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            // lookupand.push({ [`${key}`]: leadFilter[key] });
            if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
              lookupand.push({ [`${key}`]: leadFilter[key] });
            }
          });

          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupand,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else {
          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            {
              "$count": "total"
            }
          ]);
        }

         res.send(tasks);
      } catch (error) {
        // console.log(error);
         res.send({ error });
      }
    }
  }
};
taskController.DrillDownSearch = async (req, res) => {
  const uid = req.body.uid;
  let taskFilter = req.body.taskFilter;
  let leadFilter = req.body.leadFilter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString ? req.body.searchString : '';
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);
  let teamUids = req.body.teamUids ? req.body.teamUids : [];

  let userQuery = {};
  let report = [];
  let branchName = "";
  let teamName = "";
  let cond = false;

  let stage;

  if (taskFilter.status && !taskFilter.status.includes('Completed')) {
    stage = { stage: { $in: ['CALLBACK', 'INTERESTED'] } };
  } else {
    stage = { stage: { $in: ['INTERESTED', 'WON', 'LOST'] } };
  }

  if(leadFilter){
    if ('leads.employee_id' in leadFilter || 'leads.employee_name' in leadFilter || 'leads.contact_owner_email' in leadFilter) {
      let mergedValues = [];
    
      if ('leads.employee_id' in leadFilter && 'leads.employee_name' in leadFilter) {
        mergedValues.push(...leadFilter['leads.employee_id'], ...leadFilter['leads.employee_name']);
      } else if ('leads.employee_id' in leadFilter) {
        mergedValues.push(...leadFilter['leads.employee_id']);
      } else if ('leads.employee_name' in leadFilter) {
        mergedValues.push(...leadFilter['leads.employee_name']);
      }
    
      if ('leads.contact_owner_email' in leadFilter) {
        mergedValues.push(...leadFilter['leads.contact_owner_email']);
      }
    
      leadFilter['leads.contact_owner_email'] = [...new Set(mergedValues)];
      
      delete leadFilter['leads.employee_id'];
      delete leadFilter['leads.employee_name'];
    }
  }

  Object.keys(taskFilter).forEach((key) => {
    if (datesField.includes(key)) {
      if (taskFilter[key].length && taskFilter[key].length === 2) {
        taskFilter[key] = {
          $gte: moment(taskFilter[key][0]).utcOffset('+05:30').toDate(),
          $lte: moment(taskFilter[key][1]).utcOffset('+05:30').toDate(),
        };
      }
    } else if (booleanField.includes(key)) {
      taskFilter[key].forEach((element, index) => {
        if (element === 'True' || element === true) {
          taskFilter[key] = true;
        } else if (element === 'False' || element === false) {
          taskFilter[key] = false;
        }
      });
    } else {
      taskFilter[key] = { $in: taskFilter[key] };
    }
  });

  Object.keys(leadFilter).forEach((key) => {
    if (datesField.includes(key.split('.')[1])) {
      if (leadFilter[key].length && leadFilter[key].length === 2) {
        leadFilter[key] = {
          $gte: moment(leadFilter[key][0]).utcOffset('+05:30').toDate(),
          $lte: moment(leadFilter[key][1]).utcOffset('+05:30').toDate(),
        };
      }
    } else if (booleanField.includes(key.split('.')[1])) {
      leadFilter[key].forEach((element, index) => {
        if (element === 'True' || element === true) {
          leadFilter[key] = true;
        } else if (element === 'False' || element === false) {
          leadFilter[key] = false;
        }
      });
    }
    else if (key.split('.')[1] === "reporting_to") {
      report = leadFilter[key];
      userQuery["reporting_to"] = { $in: report };
      cond = true;
      // delete filter[key];
    }else if (key.split('.')[1] === "branch") {
      branchName = leadFilter[key];
      userQuery["branch"] = { $in: branchName };
      cond = true;
      // delete filter[key];
    }else if (key.split('.')[1] === "team") {
      teamName = leadFilter[key];
      userQuery["team"] = { $in: teamName };
      cond = true;
      // delete filter[key];
    }
    else {
      leadFilter[key] = { $in: leadFilter[key] };
    }
  });

  if (missed === true) {
    taskFilter['next_follow_up_date_time'] = {
      $lt: moment().utcOffset('+05:30').toDate(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  searchString.split(',').forEach((string) => {
    search = string.trim();
    const re = new RegExp(search, 'i');
    if (search.match(/^[0-9]+$/) != null) {
      contact_list.push(re);
    } else if (search !== '') {
      customer_name_list.push(re);
    }
  });

  if (contact_list.length !== 0) {
    taskFilter['contact_no'] = { $in: contact_list };
  }
  if (customer_name_list.length !== 0) {
    taskFilter['customer_name'] = { $in: customer_name_list };
  }

  let resultUser = "";
  if(teamUids.length < 1){
    resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
       res.send({ error: 'User build error  Not Found' });
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
      from: 'contacts',
      localField: 'leadId',
      foreignField: 'Id',
      as: 'leads',
    },
  };

  let lookupand = [];

  // for getting data according to role
  const role = req.body.role;

  if (role === false) {
    try {
      let and;
      if(teamUids.length > 0){
        and = [{ uid:{$in:teamUids} }];
      }else{
        and = [{ uid }];
      }

      if (stage) {
        and.push(stage);
      }

      let tasks;

      Object.keys(taskFilter).forEach((key) => {
        if (key === 'status' &&
          taskFilter[key]['$in'].includes('Overdue') &&
          taskFilter[key]['$in'].includes('Pending')
        ) {

        }
        else if (
          key === 'status' &&
          taskFilter[key]['$in'].includes('Overdue')
        ) {
          taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
            (k) => k !== 'Overdue'
          );
          taskFilter[key]['$in'].push('Pending');
          and.push({
            due_date: { $lte: moment().utcOffset('+05:30').toDate() },
          });
        } else if (
          key === 'status' &&
          taskFilter[key]['$in'].includes('Pending')
        ) {
          and.push({
            due_date: { $gte: moment().utcOffset('+05:30').toDate() },
          });
        }
      });

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          and.push({ [`${key}`]: taskFilter[key] });
        });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          // lookupand.push({ [`${key}`]: leadFilter[key] });
          if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
            lookupand.push({ [`${key}`]: leadFilter[key] });
          }
        });

        tasks = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupand,
            },
          },
          sortQuery,
          skipQuery,
          limitQuery,
          { $project: { leads: 0 } },
        ]);
      } else {
        tasks = await taskModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          sortQuery,
          skipQuery,
          limitQuery,
        ]);
      }

       res.send(tasks);
    } catch (error) {
      // console.log(error);
       res.send({ error });
    }
  } else {
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        try {
          let and;
          if(!cond){
            and = [{ organization_id }];
          }else{
            and = [{ organization_id,uid: { $in: reportingUsers }}];
          }

          if (stage) {
            and.push(stage);
          }

          let tasks;
          Object.keys(taskFilter).forEach((key) => {
            if (key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue') &&
              taskFilter[key]['$in'].includes('Pending')
            ) {

            }
            else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue')
            ) {
              taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
                (k) => k !== 'Overdue'
              );
              taskFilter[key]['$in'].push('Pending');
              and.push({
                due_date: { $lte: moment().utcOffset('+05:30').toDate() },
              });
            } else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Pending')
            ) {
              and.push({
                due_date: { $gte: moment().utcOffset('+05:30').toDate() },
              });
            }
          });
          if (!isObjectEmpty(taskFilter)) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              and.push({ [`${key}`]: taskFilter[key] });
            });
          }
          if (!isObjectEmpty(leadFilter)) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
                lookupand.push({ [`${key}`]: leadFilter[key] });
              }
            });
            const query = [
              {
                $match: {
                  $and: and,
                },
              },
              lookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupand,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
              { $project: { leads: 0 } },
            ];
            console.log("queryquery", JSON.stringify(query));
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              lookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupand,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
              { $project: { leads: 0 } },
            ]); 
          } else {
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          }

           res.send(tasks);
        } catch (error) {
          // console.log(error);
           res.send({ error });
        }
      } else {
        let and;
        let usersList = await getBranchUsers(uid, organization_id, permission);
        try {
          const interesectionArray = usersList.filter(
            (value) => reportingUsers.includes(value)
          );
          if(!cond){
             and = [{ uid: { $in: usersList } }];
          }else{
            and = [{ uid: { $in: interesectionArray } }];
          }
          if (stage) {
            and.push(stage);
          }

          let tasks;

          Object.keys(taskFilter).forEach((key) => {
            if (key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue') &&
              taskFilter[key]['$in'].includes('Pending')
            ) {

            }
            else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Overdue')
            ) {
              taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
                (k) => k !== 'Overdue'
              );
              taskFilter[key]['$in'].push('Pending');
              and.push({
                due_date: { $lte: moment().utcOffset('+05:30').toDate() },
              });
            } else if (
              key === 'status' &&
              taskFilter[key]['$in'].includes('Pending')
            ) {
              and.push({
                due_date: { $gte: moment().utcOffset('+05:30').toDate() },
              });
            }
          });

          if (!isObjectEmpty(taskFilter)) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              and.push({ [`${key}`]: taskFilter[key] });
            });
          }

          if (!isObjectEmpty(leadFilter)) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
                lookupand.push({ [`${key}`]: leadFilter[key] });
              }
            });
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              lookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupand,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
              { $project: { leads: 0 } },
            ]);
          } else {
            tasks = await taskModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          }

           res.send(tasks);
        } catch (error) {
          // console.log(error);
           res.send({ error });
        }
      }
    } else if (profile.toLowerCase() == 'team lead') {
      let and;
      let usersList = await getTeamUsers(uid, organization_id);
      try {
        const interesectionArray = usersList.filter(
          (value) => reportingUsers.includes(value)
        );
        if(!cond){
           and = [{ uid: { $in: usersList } }];
        }else{
          and = [{ uid: { $in: interesectionArray } }];
        }

        if (stage) {
          and.push(stage);
        }

        let tasks;

        Object.keys(taskFilter).forEach((key) => {
          if (key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue') &&
            taskFilter[key]['$in'].includes('Pending')
          ) {

          }
          else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue')
          ) {
            taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
              (k) => k !== 'Overdue'
            );
            taskFilter[key]['$in'].push('Pending');
            and.push({
              due_date: { $lte: moment().utcOffset('+05:30').toDate() },
            });
          } else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Pending')
          ) {
            and.push({
              due_date: { $gte: moment().utcOffset('+05:30').toDate() },
            });
          }
        });

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
              lookupand.push({ [`${key}`]: leadFilter[key] });
            }
          });
          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupand,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
            { $project: { leads: 0 } },
          ]);
        } else {
          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        }

         res.send(tasks);
      } catch (error) {
        // console.log(error);
         res.send({ error });
      }
    } else {
      try {
        let and = [{ uid }];

        if (stage) {
          and.push(stage);
        }
        let tasks;
        Object.keys(taskFilter).forEach((key) => {
          if (key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue') &&
            taskFilter[key]['$in'].includes('Pending')
          ) {

          }
          else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Overdue')
          ) {
            taskFilter[key]['$in'] = taskFilter[key]['$in'].filter(
              (k) => k !== 'Overdue'
            );
            taskFilter[key]['$in'].push('Pending');
            and.push({
              due_date: { $lte: moment().utcOffset('+05:30').toDate() },
            });
          } else if (
            key === 'status' &&
            taskFilter[key]['$in'].includes('Pending')
          ) {
            and.push({
              due_date: { $gte: moment().utcOffset('+05:30').toDate() },
            });
          }
        });
        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            and.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            // lookupand.push({ [`${key}`]: leadFilter[key] });
            if (key.split('.')[1] !== "reporting_to" && key.split('.')[1] !== "team"  && key.split('.')[1] !== "branch"){
              lookupand.push({ [`${key}`]: leadFilter[key] });
            }
          });
          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupand,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
            { $project: { leads: 0 } },
          ]);
        } else {
          tasks = await taskModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        }

         res.send(tasks);
      } catch (error) {
        // console.log(error);
         res.send({ error });
      }
    }
  }
};

taskController.GetTasksOfOrg = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const organization_id = req.body.organization_id;
  const user_email = req.body.user_email;
  try {
    if (!user_email) {
      const data = await taskModel.find({ organization_id: organization_id });
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
      console.log(`api endpoint - /tasks/getTasksOfOrg, time taken for checking taskModel Query, ${timeTakenQuery1}`);

      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - /tasks/getTasksOfOrg, time taken overall, ${timeTakenOverall}`);
      return res.json(data)
    } else {

      const data = await taskModel.find({ organization_id: organization_id, $or: [{ reporting_to: user_email }, { contact_owner_email: user_email }] });
      let query1 = new Date();
      let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, query1);
      console.log(`api endpoint - /tasks/getTasksOfOrg, time taken for checking taskModel Query, ${timeTakenQuery1}`);


      let apiEnd = new Date();
      timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
      console.log(`api endpoint - /tasks/getTasksOfOrg, time taken overall, ${timeTakenOverall}`);
      return res.json(data)
    }
  } catch (err) {
    console.log("Error is there", err)
    return res.send({ error: err.message })
  }
};

taskController.GetMissedTasks = async (req, res) => {
  let data = req.body;
  if(data.uid){
    try{
      const missedQuery = {
        transfer_status:false,
        uid: data.uid,
        next_follow_up_date_time:{
          $lt: moment().utcOffset('+05:30').toDate(),
        }
      };
      const missedTotal = await taskModel.countDocuments(missedQuery);
      return res.status(200).json({"success": true,data:{
        missedTasks:missedTotal
      }});
    }catch(err){
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }

}

taskController.GetTaskById = async (req, res) => {
  const id =req.body.id
  try{
      const data = await taskModel.find({ leadId: id });
          res.json(data)
          
  }catch(err){
      console.log("Error is there",err)
  }
};

taskController.FixTaskUpdateIssue = async (req, res) => {

  const convertFirebaseTimestampToMongoDate = (timeStamp) => {
    // Convert Firebase timestamp to JavaScript Date object
    const jsDate = timeStamp.toDate();
  
    // Adjust the time by adding 5 hours and 30 minutes
    // jsDate.setHours(jsDate.getHours() + 5);
    // jsDate.setMinutes(jsDate.getMinutes() + 30);
  
    // Construct a new MongoDB ISODate string in the desired format
    const mongoDate = jsDate.toISOString();
  
    return mongoDate;
  }

  let data = req.body;
  if(data.organization_id && data.uid){
    try{
      const tasksDocs = await admin
      .firestore()
      .collection("tasks")
      .where("organization_id", "==", data.organization_id)
      .where("uid","==",data.uid)
      .where("contact_no","==","9643980116")
      .get();
      tasksDocs.docs.forEach((doc) => {
      let task = doc.data();
      // console.log("akakak",task)
      task.tasks.map(async (item)=>{
        //  console.log("akakak",item)
        let doc = await taskModel.find({leadId:item.leadId,created_at:{ $eq: convertFirebaseTimestampToMongoDate(item.created_at) }});
        console.log("akzkzkzkz",doc,item.created_at,convertFirebaseTimestampToMongoDate(item.created_at));
      })
      // return res.status(200).json({success:true});
    });
    }catch(err){
      return res.status(400).json({"success": false,"error":err});
    }
  }else{
    return res.status(400).json({"success": false,"error":"some fields are missing"});
  }

}

// Below this there is new code for migration purpose

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

taskController.CreateTaskNew = async (req, res) => {
  try{
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_change_lead_stage_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to change the stage of lead . Please contact your admin"});
    }
    let modifiedData = convertTimestampsToDate(req.body);
    let leadId = modifiedData.leadId ? modifiedData.leadId : "";
    let completed = modifiedData.completed;
    let leadData = modifiedData.leadData ? modifiedData.leadData : "";
    let modifiedLeadData = convertTimestampsToDate(leadData);
    let task = await taskModel.findOne({leadId:leadId, status: 'Pending'});

    if(task){
      
      const query = {
        leadId: leadId,
        status: 'Pending'
      };
      const leadsQuery = {
        Id: leadId,
      }
      const options = {
        new: true
      };
      if(completed === false){
        const update = {
          status: "Cancelled",
        };
        const updatedDocument = await taskModel.findOneAndUpdate(query, update,options);
      }else{
        const update = {
          status: "Completed",
          completed_at: new Date(),
        };
        const updatedDocument = await taskModel.findOneAndUpdate(query, update,options);
      }

      const newTask = new taskModel({
        leadId: modifiedData.leadId,
        call_back_reason: modifiedData.call_back_reason,
        created_by: modifiedData.created_by,
        created_at:modifiedData.created_at,
        type: modifiedData.type,
        due_date:modifiedData.due_date,
        completed_at:modifiedData.completed_at,
        status: modifiedData.status,
        uid: modifiedData.uid,
        organization_id: modifiedData.organization_id,
      });

      const updatedLead = await leadModel.findOneAndUpdate(leadsQuery, modifiedLeadData ,options);
      const result = await newTask.save();
      return res.status(200).json({"success": true,data:result});

    }else{

      const leadsQuery = {
        Id: leadId,
      }
      const options = {
        new: true
      };

      const newTask = new taskModel({
        leadId: modifiedData.leadId,
        call_back_reason: modifiedData.call_back_reason,
        created_by: modifiedData.created_by,
        created_at:modifiedData.created_at,
        type: modifiedData.type,
        due_date:modifiedData.due_date,
        completed_at:modifiedData.completed_at,
        status: modifiedData.status,
        uid: modifiedData.uid,
        organization_id: modifiedData.organization_id,
      });
      const updatedLead = await leadModel.findOneAndUpdate(leadsQuery, modifiedLeadData ,options);
      const result = await newTask.save();
      return res.status(200).json({"success": true,data:result});
    }
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

taskController.ChangeLeadStageNew = async (req, res) => {
  try{
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
          if(userPreference && userPreference.contact_change_lead_stage_approved === false){
              return res.status(400).json({ success: false, message: "You are not allowed to change the stage of lead . Please contact your admin"});
          }
    let leadId = req.body.leadId ? req.body.leadId : "";
    let leadData = req.body.leadData ? req.body.leadData : "";
    let modifiedLeadData = convertTimestampsToDate(leadData);
    let task = await taskModel.findOne({leadId:leadId, status: 'Pending'});

    if(task){
      
      const query = {
        leadId: leadId,
        status: 'Pending'
      };
      const leadsQuery = {
        Id: leadId,
      }
      const options = {
        new: true
      };
      const update = {
        status: "Completed",
        completed_at: new Date(),
      };
      const updatedDocument = await taskModel.findOneAndUpdate(query, update,options);
      const updatedLead = await leadModel.findOneAndUpdate(leadsQuery, modifiedLeadData ,options);

      console.log("rishabh modified data",modifiedLeadData)
      if(modifiedLeadData.stage==="WON"){
        console.log("leadId Risasndandjas",leadId)
        if(leadId){
          const check=await senNotificationWon(req.body.userAuthorizationId,leadId)
          if(check===false){
            console.log("error while sending notification")
          }
        }
      }
      return res.status(200).json({"success": true,data:updatedDocument});
    }else{
      const leadsQuery = {
        Id: leadId,
      }
      const options = {
        new: true
      };
      const updatedLead = await leadModel.findOneAndUpdate(leadsQuery, modifiedLeadData ,options);
      console.log("rishabh modified data",modifiedLeadData)
      if(modifiedLeadData.stage==="WON"){
        console.log("leadId Risasndandjas",leadId)
        if(leadId){
          const check=await senNotificationWon(req.body.userAuthorizationId,leadId)
          if(check===false){
            console.log("error while sending notification")
          }
        }
        
      }
      return res.status(200).json({"success": true,data:updatedLead});
    }
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

taskController.RescheduleTaskNew = async (req, res) => {
  try{
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
    if(userPreference && userPreference.contact_change_lead_stage_approved === false){
        return res.status(400).json({ success: false, message: "You are not allowed to change the stage of lead . Please contact your admin"});
    }
    let leadId = req.body.leadId ? req.body.leadId : "";
    let leadData = req.body.leadData ? req.body.leadData : "";
    let modifiedLeadData = convertTimestampsToDate(leadData);
    let task = await taskModel.findOne({leadId:leadId, status: 'Pending'});

    if(task){
      
      const query = {
        leadId: leadId,
        status: 'Pending'
      };
      const leadsQuery = {
        Id: leadId,
      }
      const options = {
        new: true
      };
      const update = {
        due_date:req.body.date
      };
      const updatedDocument = await taskModel.findOneAndUpdate(query, update,options);
      const updatedLead = await leadModel.findOneAndUpdate(leadsQuery, modifiedLeadData ,options);
      return res.status(200).json({"success": true,data:updatedDocument});
    }else{
      return res.status(400).json({"success": false,"error":"No data found to update"});
    }
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

taskController.FetchLeadTasksNew = async (req, res) => {
  try{
    let leadId = req.body.leadId ? req.body.leadId : "";
    let query = {
      leadId: leadId,
    };
    let tasks = await taskModel.find(query);
    let tasksData = tasks.reverse();
    return res.status(200).json({"success": true,data:tasksData});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

taskController.GetTodaysTasksData = async (req, res) => {
  const uid = req.body.uid;
  // let filter = req.body.filter;
  // let leadUserFilter = req.body.leadUserFilter;
  // const sort = req.body.sort;
  // const missed = req.body.missed;
  // const searchString = req.body.searchString ? req.body.searchString : '';
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);

  
  // if(filter){
  //   if ('employee_id' in filter || 'employee_name' in filter || 'contact_owner_email' in filter) {
  //     let mergedValues = [];
    
  //     if ('employee_id' in filter && 'employee_name' in filter) {
  //       mergedValues.push(...filter.employee_id, ...filter.employee_name);
  //     } else if ('employee_id' in filter) {
  //       mergedValues.push(...filter.employee_id);
  //     } else if ('employee_name' in filter) {
  //       mergedValues.push(...filter.employee_name);
  //     }
    
  //     if ('contact_owner_email' in filter) {
  //       mergedValues.push(...filter.contact_owner_email);
  //     }
    
  //     filter.contact_owner_email = [...new Set(mergedValues)];
      
  //     delete filter.employee_id;
  //     delete filter.employee_name;
  //   }
  // }

  // Object.keys(filter).forEach((key) => {
  //   if (datesField.includes(key)) {
  //     if (filter[key].length && filter[key].length === 2) {
  //       filter[key] = {
  //         $gte: moment(filter[key][0]).utcOffset('+05:30').toDate(),
  //         $lte: moment(filter[key][1]).utcOffset('+05:30').toDate(),
  //       };
  //     }
  //   } else if (booleanField.includes(key)) {
  //     filter[key].forEach((element, index) => {
  //       if (element === 'True') {
  //         filter[key][index] = true;
  //       } else if (element === 'False') {
  //         filter[key][index] = false;
  //       }
  //     });
  //   } else {
  //     filter[key] = { $in: filter[key] };
  //     if (key === 'status' && filter[key]['$in'].includes('Overdue')) {
  //       filter[key]['$in'] = filter[key]['$in'].filter((k) => k !== 'Overdue');
  //       if (!filter[key]['$in'].includes('Pending')) {
  //         filter[key]['$in'].push('Pending');
  //         filter['due_date'] = {
  //           $lte: moment().utcOffset('+05:30').toDate(),
  //         };
  //       }
  //     } else if (
  //       key === 'status' &&
  //       filter[key]['$in'].includes('Pending') &&
  //       !filter[key]['$in'].includes('Overdue')
  //     ) {
  //       filter['due_date'] = {
  //         $gt: moment().utcOffset('+05:30').toDate(),
  //       };
  //     }
  //   }
  // });

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

  // if (missed === true) {
  //   filter['next_follow_up_date_time'] = {
  //     $lt: moment().utcOffset('+05:30').toDate(),
  //   };
  // }

  // let customer_name_list = [];
  // let contact_list = [];

  // searchString.split(',').forEach((string) => {
  //   search = string.trim();
  //   const re = new RegExp(search, 'i');
  //   if (search.match(/^[0-9]+$/) != null) {
  //     contact_list.push(re);
  //   } else if (search !== '') {
  //     customer_name_list.push(re);
  //   }
  // });
  // if (contact_list.length !== 0) {
  //   filter['contact_no'] = { $in: contact_list };
  // }
  // if (customer_name_list.length !== 0) {
  //   filter['customer_name'] = { $in: customer_name_list };
  // }

  const resultUser = await userModel.find({ uid });
  // console.log("User record :" + resultUser);
  if (resultUser.length === 0) {
    return res.status(400).json({success:false,"error":"User Not Found"})
  }

  // Get the current date
    // let today = moment();

    // Set the time for startDate to 00:00:00
    let startDate = moment().utcOffset('+05:30').startOf('day');

    // Set the time for endDate to 23:59:59
    let endDate = moment().utcOffset('+05:30').endOf('day');

    // Now you can use these startDate and endDate values in your filter
    let filter = {};
    let currentDate = moment().utcOffset('+05:30').toDate();

    filter['due_date'] = {
      $gte: startDate.toDate(), // Convert Moment.js object to JavaScript Date object
      $lte: endDate.toDate(),   // Convert Moment.js object to JavaScript Date object
    };


  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  let usersData = await userModel.find({ organization_id });

  const uidToNameMap = {};
  usersData.forEach(item => {
    uidToNameMap[item.uid] = `${item.user_first_name} ${item.user_last_name}`;
  });

  let group = {
    _id: '$uid',
    uid: { $first: "$uid" },
    user_name: { $first: "$uid" },
    total_callback: {
      $sum: { $cond: [{ $eq: ["$type", "Call Back"] }, 1, 0] }
    },
    total_site_visit: {
      $sum: { $cond: [{ $eq: ["$type", "Site Visit"] }, 1, 0] }
    },
    total_meeting: {
      $sum: { $cond: [{ $eq: ["$type", "Meeting"] }, 1, 0] }
    },
    total: {
      $sum: {
        $cond: [
          { $or: [{ $eq: ["$type", "Meeting"] }, { $eq: ["$type", "Call Back"] },{$eq: ["$type","Site Visit"]}] },
          1,
          0
        ]
      }
    },
    // pending_meeting: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Meeting"] }, { $eq: ["$status", "Pending"] },{$gt: ["due_date",currentDate]}] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // pending_site_visit: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Site Visit"] }, { $eq: ["$status", "Pending"] },{$gt: ["due_date",currentDate]}] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // pending_callback: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Call Back"] }, { $eq: ["$status", "Pending"] },{$gt: ["due_date",currentDate]}] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // completed_meeting: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Meeting"] }, { $eq: ["$status", "Completed"] }] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // completed_site_visit: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Site Visit"] }, { $eq: ["$status", "Completed"] }] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // completed_callback: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Call Back"] }, { $eq: ["$status", "Completed"] }] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // overdue_meeting: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Meeting"] }, { $eq: ["$status", "Pending"] },{$lte: ["due_date",currentDate]}] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // overdue_site_visit: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Site Visit"] }, { $eq: ["$status", "Pending"] },{$lte:["due_date",currentDate]}] },
    //       1,
    //       0
    //     ]
    //   }
    // },
    // overdue_callback: {
    //   $sum: {
    //     $cond: [
    //       { $and: [{ $eq: ["$type", "Call Back"] }, { $eq: ["$status", "Pending"] },{$lte:["due_date",currentDate]}] },
    //       1,
    //       0
    //     ]
    //   }
    // }
  }
  
  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        // console.log("mobile no :" + searchString);
        // console.log("mobile no :" + typeof (searchString));
        let match = {
          organization_id,
          ...filter,
        }
        // if(!isObjectEmpty(leadUserFilter)){
        //   find = {
        //     organization_id,
        //     ...filter,
        //     uid: { $in: leadUserFilter.uid },
        //   };
        // }else{
        //   find = {
        //     organization_id,
        //     ...filter,
        //   };
        // }
        const teamTasksToday = await taskModel
          .aggregate(
            [
             {
              $match: match
             },
             {
              $group:group
             }
            ]
          )
          const userTasksToday = await taskModel
          .aggregate(
            [
             {
              $match: match
             }
            ]
          )
          // Replace uid in the first array with user_first_name
          teamTasksToday.forEach(item => {
            const userName = uidToNameMap[item.user_name];
            if (userName) {
              item.user_name = userName;
              // You can replace other properties as needed
            }
          });
          // .sort(sort)
          // .skip((page - 1) * pageSize)
          // .limit(pageSize);
        return res.status(200).json({success:true,data:{teamTasksToday:teamTasksToday,userTasksToday:userTasksToday}})
      } catch (error) {
        console.log("err",error)
        return res.status(400).json({success:false,"error":err})
      }
    } else {
      
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        let match = {
          uid: { $in: usersList },
          ...filter,
        }
        // if(!isObjectEmpty(leadUserFilter)){
        //   const interesectionArray = usersList.filter(
        //     (value) => leadUserFilter.uid.includes(value)
        //   );
        //   find = { uid: { $in: interesectionArray }, ...filter };
        // }else{
        //   find = { uid: { $in: usersList }, ...filter };
        // }
        const teamTasksToday = await taskModel
        .aggregate(
          [
           {
            $match: match
           },
           {
            $group:group
           }
          ]
        )
        const userTasksToday = await taskModel
        .aggregate(
          [
           {
            $match: match
           }
          ]
        )
        // Replace uid in the first array with user_first_name
        teamTasksToday.forEach(item => {
          const userName = uidToNameMap[item.user_name];
          if (userName) {
            item.user_name = userName;
            // You can replace other properties as needed
          }
        });
        // .sort(sort)
        // .skip((page - 1) * pageSize)
        // .limit(pageSize);
      return res.status(200).json({success:true,data:{teamTasksToday:teamTasksToday,userTasksToday:userTasksToday}})
      } catch (error) {
        // console.log(error);
        return res.status(400).json({success:false,"error":err})
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      // console.log("mobile no :" + searchString);
      // console.log("mobile no :" + typeof (searchString));
      // let find = { uid: { $in: usersList }, ...filter };
      let match = {
        uid: { $in: usersList },
        ...filter,
      }
      // if(!isObjectEmpty(leadUserFilter)){
      //   const interesectionArray = usersList.filter(
      //     (value) => leadUserFilter.uid.includes(value)
      //   );
      //   find = { uid: { $in: interesectionArray }, ...filter };
      // }else{
      //   find = { uid: { $in: usersList }, ...filter };
      // }
      const teamTasksToday = await taskModel
      .aggregate(
        [
         {
          $match: match
         },
         {
          $group:group
         }
        ]
      )
      const userTasksToday = await taskModel
      .aggregate(
        [
         {
          $match: match
         }
        ]
      )
      // Replace uid in the first array with user_first_name
      teamTasksToday.forEach(item => {
        const userName = uidToNameMap[item.user_name];
        if (userName) {
          item.user_name = userName;
          // You can replace other properties as needed
        }
      });
      // .sort(sort)
      // .skip((page - 1) * pageSize)
      // .limit(pageSize);
    return res.status(200).json({success:true,data:{teamTasksToday:teamTasksToday,userTasksToday:userTasksToday}})
    } catch (error) {
      return res.status(400).json({success:false,"error":err})
    }
  } else {
    try {
      // console.log("mobile no :" + searchString);
      // console.log("mobile no :" + typeof (searchString));
      // const tasks = await taskModel
      //   .find({ uid, ...filter }, { _id: 0, __v: 0 })
      //   .sort(sort)
      //   .skip((page - 1) * pageSize)
      //   .limit(pageSize);
      let match = {
        uid: uid,
        ...filter,
      }
      const teamTasksToday = await taskModel
      .aggregate(
        [
         {
          $match: match
         },
         {
          $group:group
         }
        ]
      )
      const userTasksToday = await taskModel
      .aggregate(
        [
         {
          $match: match
         }
        ]
      )
      // Replace uid in the first array with user_first_name
      teamTasksToday.forEach(item => {
        const userName = uidToNameMap[item.user_name];
        if (userName) {
          item.user_name = userName;
          // You can replace other properties as needed
        }
      });
      // .sort(sort)
      // .skip((page - 1) * pageSize)
      // .limit(pageSize);
    return res.status(200).json({success:true,data:{teamTasksToday:teamTasksToday,userTasksToday:userTasksToday}})
    } catch (error) {
      return res.status(400).json({success:false,"error":err})
    }
  }
};


taskController.GetFetchLeadTasksNew = async (req, res) => {
  try{
    let leadId = req.query.leadId ;
    if(!leadId){
     return res.status(400).json({
        "success":"false",
        "error":"leadId is required"
      })
    }
    let query = {
      leadId: leadId,
    };
    let tasks = await taskModel.find(query);
    let tasksData = tasks.reverse();
    return res.status(200).json({"success": true,data:tasksData});
  }catch(err){
    return res.status(400).json({"success": false,"error":err.message || "An error occured, please try again later"});
  }
};



taskController.createTaskNewAndApproval = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId }).session(session);
    if (userPreference && userPreference.contact_change_lead_stage_approved === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "You are not allowed to change the stage of lead. Please contact your admin" });
    }

    let modifiedData = convertTimestampsToDate(req.body);
    // console.log("modifiedData",JSON.stringify(modifiedData.verified_status))
    let leadId = modifiedData.leadId ? modifiedData.leadId : "";
    let completed = modifiedData.completed;
    let leadData = modifiedData.leadData ? modifiedData.leadData : "";
    let modifiedLeadData = convertTimestampsToDate(leadData);
    let user = modifiedData.user ? modifiedData.user : "";
    let reportingToUser = modifiedData.reportingToUser;
    let customer_name = modifiedData.customer_name ? modifiedData.customer_name : "";
    let task = await taskModel.findOne({ leadId: leadId, status: 'Pending' }).session(session);

    if (task) {
      const query = { leadId: leadId, status: 'Pending' };
      const leadsQuery = { Id: leadId };
      const options = { new: true, session };
  
      if (completed === false) {
        const update = { status: "Cancelled" };
        await taskModel.findOneAndUpdate(query, update, options);
      } else {
        if (user.is_approval_enabled === true && (task.type==="Site Visit" || task.type==="Meeting") && 
        (task.status==="Pending") ) {

          // console.log("jai mata dee")
          let newData = {
            verified_status: "Pending",
            verified_at: null,
            requested_at: new Date(),
            reporting_to: user.reporting_to
          }
          await taskModel.findOneAndUpdate(query, { $set: newData }, options);

          let description = `${user.user_first_name} ${user.user_last_name} is requesting to approve visit to Mr./Mrs. ${customer_name}`;
          let title = 'Verification Request';
          let data = {
            uid: reportingToUser.uid,
            organization_id: modifiedData.organization_id,
            message: description,
            screen: 'Request',
            approveAction: 'true',
            rejectAction: 'true'
          }
          const notification = {
            organization_id: modifiedData.organization_id,
            notifications: { [reportingToUser.uid]: description },
            title,
            data
          }
          await sendNotifications(notification);
          await session.commitTransaction();
          session.endSession();
          return res.status(200).json({ "success": true, data: {} ,message:"New Task cannot be created untill the previous task is approved by your reporting manager"});
        } else {
          const update = { status: "Completed", completed_at: new Date() };
          await taskModel.findOneAndUpdate(query, update, options);
        }
      }

      const newTask = {
        leadId: modifiedData.leadId,
        call_back_reason: modifiedData.call_back_reason,
        created_by: modifiedData.created_by,
        created_at: modifiedData.created_at,
        type: modifiedData.type,
        due_date: modifiedData.due_date,
        completed_at: modifiedData.completed_at,
        status: modifiedData.status,
        uid: modifiedData.uid,
        organization_id: modifiedData.organization_id,
      }

      await leadModel.findOneAndUpdate(leadsQuery, modifiedLeadData, options);
      const result = await new taskModel(newTask).save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ "success": true, data: result,message:"task created!"});
    } else {
      const leadsQuery = { Id: leadId };
      const options = { new: true, session };

      const newTask = {
        leadId: modifiedData.leadId,
        call_back_reason: modifiedData.call_back_reason,
        created_by: modifiedData.created_by,
        created_at: modifiedData.created_at,
        type: modifiedData.type,
        due_date: modifiedData.due_date,
        completed_at: modifiedData.completed_at,
        status: modifiedData.status,
        uid: modifiedData.uid,
        organization_id: modifiedData.organization_id,
      };

      await leadModel.findOneAndUpdate(leadsQuery, modifiedLeadData, options);
      const result = await new taskModel(newTask).save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ "success": true, data: result ,message:"task created!"});
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
};

taskController.UpdateVerificationWithApproval = async(req, res) => {
 try {
  const leadId = req.body.leadId;
  let {customer,type,user,organization_id,uid,...newData} = req.body;

  

  if(newData.verified_status==="Rejected"){
    let obj={
      ...newData,
      status: "Cancelled"
    }
    await taskModel
    .findOneAndUpdate({leadId:leadId,status: 'Pending'}, { $set: obj })
  }else if (newData.verified_status==="Approved"){
    let obj={
      ...newData,
      status: "Completed", 
      completed_at: new Date()
    }
    await taskModel
    .findOneAndUpdate({leadId:leadId,status: 'Pending'}, { $set: obj })

  }

  // console.log("fnvjurfv",newData.verified_status)

  let description = `${user.user_first_name} ${user.user_last_name} has ${newData.verified_status} your ${type} to Mr./Mrs. ${customer}`;
  let title = 'Verification Request';
  let data = {
    uid: uid,
    organization_id: organization_id,
    message: description,
    screen: 'Owner',
    approveAction: 'true',
    rejectAction: 'true'
  }
  const notification = {
    organization_id: organization_id,
    notifications: { [uid]: description },
    title,
    data
  }

  // console.log("BVFDSFDC",notification)
  await sendNotifications(notification);

  return res.status(200).json({
    success:true,
    message:"Updation DONE!"
  })
  
 } catch (error) {
  return res.status(400).json({
    success: false,
    message: MESSAGES.catchError,
    error: error.message,
  });
 }

 
    
};

taskController.AppFilterValues = async (req, res) => {
  const uid = req.body.uid;
  const stage = req.body.stage;
  const filters=req.body.filters;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  let stageFilter = stage ? { stage } : {};
  let missedFilter = {};
  let showFilterValue = req.body.showColumns
  data=TASK_FILTER_VALUES

//   const User = await userModel.find({ uid });
//   let organization_id
//   User.map((item)=>{
//     organization_id= item.organization_id
//  })
// //  console.log("User--User",CacheKey)
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

  if (stage === 'FOLLOWUP') {
    stageFilter = { stage: { $in: ['CALLBACK', 'INTERESTED'] } };
  }

  if (stage === 'MISSED') {
    stageFilter = {};
    missedFilter['next_follow_up_date_time'] = {
      $lt: moment().utcOffset('+05:30').toDate(),
    };
  }
  const finalFilters = { ...stageFilter, ...missedFilter,...filters};

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
      // contact_owner_email: {
      //   $addToSet: "$contact_owner_email",
      // },
      // created_by: { $addToSet: "$created_by" },
      // source: { $addToSet: "$source" },
      // location: { $addToSet: "$location" },
      // project: { $addToSet: "$project" },
      // property_stage: { $addToSet: "$property_stage" },
      // property_type: { $addToSet: "$property_type" },
      // stage: { $addToSet: "$stage" },
      // inventory_type: { $addToSet: "$inventory_type" },
      // type: { $addToSet: "$type" },
      // call_back_reason: { $addToSet: "$call_back_reason" },
      // branch: { $addToSet: "$branch" },
      // state: { $addToSet: "$state" },
    },
  };
}

  const role = req.body.role;

  if(role === false){
    try {
      let userFilters;
      let filters;
      if(teamUids.length > 0){
        userFilters = await userModel.aggregate([
        { $match: { uid:{$in:teamUids} } },
        group,
      ]);
      filters = await taskModel.aggregate([
        { $match: { uid:{$in:teamUids}, ...finalFilters } },
        group,
      ]);
      }else{
        userFilters = await userModel.aggregate([
        { $match: { uid } },
        group,
      ]);
      filters = await taskModel.aggregate([
        { $match: { uid, ...finalFilters } },
        group,
      ]);
      }
      if (filters.length > 0) {
        filters[0].branch =
          userFilters.length > 0
            ? userFilters[0].branch
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
      res.send(singleArray);

      // res.send(finalFilterSorted);
      // console.log("task model filter values:" + JSON.stringify(filters));
      // res.send(filters);
    } catch (error) {
      res.send({ error });
    }
  }else{
      if (profile.toLowerCase() == 'lead manager' || profile?.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        const filters = await taskModel.aggregate([
          { $match: { organization_id,transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
          group,
        ]);

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
        res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        res.send({ error });
      }
    } else {
      // let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        const users = await userModel.find({organization_id:organization_id,branch: { $in: permission }},{uid:1});
        let usersList = [];
        users.forEach(user => {
          usersList.push(user.uid);
        })
        const filters = await taskModel.aggregate([
          { $match: { uid: { $in: usersList },transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] },  ...finalFilters } },
          group,
        ]);

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
        res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        // console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    // let usersList = await getTeamUsers(uid, organization_id);
    try {
      const users = await userModel.find({organization_id,reporting_to:resultUser[0].user_email},{uid: 1});
      let usersList = [];
      users.forEach(user => {
        usersList.push(user.uid);
      })
      const filters = await taskModel.aggregate([
        { $match: { uid: { $in: usersList },transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
        group,
      ]);

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
      res.send(singleArray);
      // res.send(filters);
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      // const userFilters = await userModel.aggregate([
      //   { $match: { uid } },
      //   group,
      // ]);
      const filters = await taskModel.aggregate([
        { $match: { uid,transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
        group,
      ]);
      // if (filters.length > 0) {
      //   filters[0].branch =
      //     userFilters.length > 0
      //       ? userFilters[0].branch
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
      res.send(singleArray);

      // res.send(finalFilterSorted);
      // console.log("task model filter values:" + JSON.stringify(filters));
      // res.send(filters);
    } catch (error) {
      res.send({ error });
    }
  // }
  }}
};

module.exports = taskController;