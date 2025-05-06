const { CALLLOG_FILTER_VALUES } = require('../constants/constants');
const callLogModel = require('../models/callLogsSchema');
const userModel = require('../models/userSchema');
const app = require('firebase');
const moment = require('moment');
const PriorityQueue = require('priorityqueuejs');
const NodeCache = require('node-cache');
const cache = new NodeCache();
const MAX_CACHE_SIZE = 5000;
const accessTimes = new Map();
const lruQueue = new PriorityQueue((a, b) => accessTimes.get(a) - accessTimes.get(b));
const {getTimeDifferenceInSeconds}=require("../constants/constants.js")
// setting time offset while using moment because our aws server is in a different timezone than our mongo server

const callLogController = {};

const timestamp = app.firestore.Timestamp;

const datesField = [
  'created_at',
  'next_follow_up_date_time',
  'stage_change_at',
  'modified_at',
  'lead_assign_time',
  'completed_at',
  'due_date',
];

const isObjectEmpty = (object) => {
  var isEmpty = true;
  for (keys in object) {
    isEmpty = false;
    break; // exiting since we found that the object is not empty
  }
  return isEmpty;
};

const getCachedData = (data) => {
  const CacheKey = JSON.stringify(data);
  const cachedData = cache.get(CacheKey);
  return {cachedData,CacheKey};
}

const booleanField = ['associate_status', 'source_status', 'transfer_status'];

// for lead manager profile having branches
const getBranchUsers = async (uid, organization_id, permission) => {
  const users = await userModel.find({
    organization_id,
    branch: { $in: permission },
  });
  let usersList = [uid];
  users.forEach((user) => usersList.push(user.uid));
  return usersList;
};

// to get all the users under a certain user
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

const mapSeconds = (time) => {
  var a = time.split(':');
  var seconds = 0;
  if (a.length === 3) {
    seconds = 3600 * Number(a[0]) + 60 * Number(a[1]) + Number(a[2]);
  } else {
    seconds = 60 * Number(a[0]) + Number(a[1]);
  }
  return seconds;
};

callLogController.Create = async (req, res) => {
  const user = await userModel.findOne({ uid: req.body.uid });
  let created_by = '';
  if (user) {
    created_by = user.user_name;
  }
  const data = new callLogModel({
    leadId: req.body.leadId,
    customer_name: req.body.customer_name,
    contact_no: req.body.contact_no,
    stage: req.body.stage,
    contact_owner_email: req.body.contact_owner_email,
    location: req.body.location,
    project: req.body.project,
    budget: req.body.budget,
    transfer_status: req.body.transfer_status,
    created_by,
    source: req.body.source,
    created_at:
      typeof req.body.created_at == 'object'
        ? new timestamp(
          req.body.created_at._seconds,
          req.body.created_at._nanoseconds
        ).toDate()
        : new Date(),
    type: req.body.type,
    inventory_type: req.body.inventory_type,
    duration: mapSeconds(req.body.callTime),
    uid: req.body.uid,
    organization_id: req.body.organization_id,
  });
  data.save();
  res.send('Task Created');
};

callLogController.Update = (req, res) => {
  const leadId = req.body.leadId;
  callLogModel
    .updateMany({ leadId }, { $set: req.body })
    .exec(function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send('Updation DONE!');
      }
    });
};
callLogController.DeleteCallLogs = (req, res) => {
  const leadId = req.body.leadId;
  callLogModel.findOneAndDelete({ leadId: leadId })
    .exec(function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send("Deletion DONE!");
      }
    })
}
callLogController.fetch = async (req, res) => {
  const uid = typeof req.body.uid == 'undefined' ? '' : req.body.uid;
  const lead_id = typeof req.body.leadId == 'undefined' ? '' : req.body.leadId;
  const status_state = req.body.status_state;
  if (!(uid == '')) {
    const resultuser = await userModel.find({ uid: req.body.uid });
    const profile = resultuser[0].profile;
    if (profile.toLowerCase() == 'sales') {
      callLogModel.find({ uid: uid }, (err, results) => {
        if (err) {
          res.send(err);
        } else {
          res.send(results);
        }
      });
    } else if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
      callLogModel.find(
        { organization_id: resultuser[0].organization_id },
        (err, results) => {
          if (err) {
            res.send(err);
          } else {
            var callFilteredResults = [];
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
    callLogModel.find({ leadId: lead_id }, (err, results) => {
      if (err) {
        res.send(err);
      } else {
        //res.send(results)
        res.send(results);
      }
    });
  } else {
    res.send('Search not found');
  }
};

callLogController.Search = async (req, res) => {
  const uid = req.body.uid;
  let filter = req.body.filter;
  let leadUserFilter = req.body.leadUserFilter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString ? req.body.searchString : '';
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);

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
        if (element === 'True') {
          filter[key][index] = true;
        } else if (element === 'False') {
          filter[key][index] = false;
        }
      });
    } else {
      filter[key] = { $in: filter[key] };
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
    filter['next_follow_up_date_time'] = { $lt: new Date() };
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
        let find = { organization_id, ...filter };
        // if(!isObjectEmpty(leadUserFilter)){
        //   find = {
        //     organization_id,
        //     ...filter,
        //     uid: { $in: leadUserFilter.uid },
        //   };
        // }else{
        //   find = { organization_id, ...filter }
        // }
        const callLogs = await callLogModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        res.send(callLogs);
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        let find = { uid: { $in: usersList }, ...filter };;
        // if(!isObjectEmpty(leadUserFilter)){
        //   const interesectionArray = usersList.filter(
        //     (value) => leadUserFilter.uid.includes(value)
        //   );
        //   find = { uid: { $in: interesectionArray }, ...filter };
        // }else{
        //   find = { uid: { $in: usersList }, ...filter };
        // }
        const callLogs = await callLogModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);

        res.send(callLogs);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      let   find = { uid: { $in: usersList }, ...filter };
      // if(!isObjectEmpty(leadUserFilter)){
      //   const interesectionArray = usersList.filter(
      //     (value) => leadUserFilter.uid.includes(value)
      //   );
      //   find = { uid: { $in: interesectionArray }, ...filter };
      // }else{
      //   find = { uid: { $in: usersList }, ...filter };
      // }
      const callLogs = await callLogModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      res.send(callLogs);
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      const callLogs = await callLogModel
        .find({ uid, ...filter }, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      res.send(callLogs);
    } catch (error) {
      res.send({ error });
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
         { $set: { last_updated_at_calllog_panel: formattedDate } },
         { new: true }
       );
      }
    }
    }
}

function enforceLRUPolicy() {
  while (cache.keys().length > MAX_CACHE_SIZE) {
    const keyToRemove = lruQueue.deq();
    cache.del(keyToRemove);
    accessTimes.delete(keyToRemove);
    console.log('LRU eviction:', keyToRemove);
  }
}
// to get filter values for different fields
callLogController.FilterValues = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  const stage = req.body.stage;
  const filters=req.body.filters;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  let stageFilter = stage ? { stage } : {};
  let missedFilter = {};
  let showFilterValue = req.body.showColumns
  data=CALLLOG_FILTER_VALUES
 
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
    missedFilter['next_follow_up_date_time'] = { $lt: new Date() };
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
      budget: { $addToSet: '$budget' },
      contact_owner_email: { $addToSet: '$contact_owner_email' },
      created_by: { $addToSet: '$created_by' },
      lead_source: { $addToSet: '$lead_source' },
      location: { $addToSet: '$location' },
      project: { $addToSet: '$project' },
      stage: { $addToSet: '$stage' },
      inventory_type: { $addToSet: '$inventory_type' },
      duration: { $addToSet: '$duration' },
      state: { $addToSet: "$state" },
    },
  };
}

  // const group = {
  //   $group: {
  //     _id: 0,
  //     budget: { $addToSet: '$budget' },
  //     contact_owner_email: { $addToSet: '$contact_owner_email' },
  //     created_by: { $addToSet: '$created_by' },
  //     lead_source: { $addToSet: '$lead_source' },
  //     location: { $addToSet: '$location' },
  //     project: { $addToSet: '$project' },
  //     stage: { $addToSet: '$stage' },
  //     inventory_type: { $addToSet: '$inventory_type' },
  //     duration: { $addToSet: '$duration' },
  //     state: { $addToSet: "$state" },
  //   },
  // };

  const role = req.body.role;

  // if (profile.toLowerCase() == 'lead manager') {
  //   const permission = user.branchPermission;
  //   if (
  //     permission === undefined ||
  //     (permission && permission.length === 0) ||
  //     (permission && permission.includes('All'))
  //   ) {
  //     try {
  //       const filters = await callLogModel.aggregate([
  //         { $match: { organization_id, ...finalFilters } },
  //         group,
  //       ]);

  //       let singleArray = [];
  //       let finalFilterSorted = {};

  //       Object.keys(filters[0]).forEach((key) => {
  //         if (key != "_id") {
  //           const val = filters[0][key].sort();
  //           finalFilterSorted[key] = val;

  //         }
  //       });
  //       singleArray.push(finalFilterSorted);
  //       res.send(singleArray);
  //       // res.send(filters);
  //     } catch (error) {
  //       console.log(error);
  //       res.send({ error });
  //     }
  //   } else {
  //     let usersList = await getBranchUsers(uid, organization_id, permission);
  //     try {
  //       const filters = await callLogModel.aggregate([
  //         { $match: { uid: { $in: usersList }, ...finalFilters } },
  //         group,
  //       ]);

  //       let singleArray = [];
  //       let finalFilterSorted = {};

  //       Object.keys(filters[0]).forEach((key) => {
  //         if (key != "_id") {
  //           const val = filters[0][key].sort();
  //           finalFilterSorted[key] = val;

  //         }
  //       });
  //       singleArray.push(finalFilterSorted);
  //       res.send(singleArray);
  //       // res.send(filters);
  //     } catch (error) {
  //       console.log(error);
  //       res.send({ error });
  //     }
  //   }
  // } else if (profile.toLowerCase() == 'team lead') {
  //   let usersList = await getTeamUsers(uid, organization_id);
  //   try {
  //     const filters = await callLogModel.aggregate([
  //       { $match: { uid: { $in: usersList }, ...finalFilters } },
  //       group,
  //     ]);

  //     let singleArray = [];
  //     let finalFilterSorted = {};

  //     Object.keys(filters[0]).forEach((key) => {
  //       if (key != "_id") {
  //         const val = filters[0][key].sort();
  //         finalFilterSorted[key] = val;

  //       }
  //     });
  //     singleArray.push(finalFilterSorted);
  //     res.send(singleArray);
  //     // res.send(filters);
  //   } catch (error) {
  //     console.log(error);
  //     res.send({ error });
  //   }
  // } else {
  //   try {
  //     const filters = await callLogModel.aggregate([
  //       { $match: { uid, ...finalFilters } },
  //       group,
  //     ]);

  //     let singleArray = [];
  //     let finalFilterSorted = {};

  //     Object.keys(filters[0]).forEach((key) => {
  //       if (key != "_id") {
  //         const val = filters[0][key].sort();
  //         finalFilterSorted[key] = val;

  //       }
  //     });
  //     singleArray.push(finalFilterSorted);
  //     res.send(singleArray);
  //     // res.send(filters);
  //   } catch (error) {
  //     console.log(error);
  //     res.send({ error });
  //   }
  // }
  
  if(role === false){
    try {
       let filters;
      if(teamUids.length > 0){
        filters = await callLogModel.aggregate([
          { $match: { uid:{$in:teamUids}, ...finalFilters } },
          group,
        ]);
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
      }else{
        filters = await callLogModel.aggregate([
          { $match: { uid, ...finalFilters } },
          group,
        ]);
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
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
      console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
      // res.send(filters);
    } catch (error) {
      console.log(error);
      return res.send({ error });
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
          const filters = await callLogModel.aggregate([
            { $match: { organization_id, ...finalFilters } },
            group,
          ]);
          let query1 = new Date();
          let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
          console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
  
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
          console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
          return res.send(singleArray);
          // res.send(filters);
        } catch (error) {
          console.log(error);
          return res.send({ error });
        }
      } else {
        let usersList = await getBranchUsers(uid, organization_id, permission);
        try {
          const filters = await callLogModel.aggregate([
            { $match: { uid: { $in: usersList }, ...finalFilters } },
            group,
          ]);

          let query1 = new Date();
          let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
          console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
  
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
          console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
          return res.send(singleArray);
          // res.send(filters);
        } catch (error) {
          console.log(error);
          return res.send({ error });
        }
      }
    } else if (profile.toLowerCase() == 'team lead') {
      let usersList = await getTeamUsers(uid, organization_id);
      try {
        const filters = await callLogModel.aggregate([
          { $match: { uid: { $in: usersList }, ...finalFilters } },
          group,
        ]);

        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
  
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
        console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    } else {
      try {
        const filters = await callLogModel.aggregate([
          { $match: { uid, ...finalFilters } },
          group,
        ]);
        
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
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
        console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    // }
  }}
};

callLogController.CallLogCount = async (req, res) => {
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

  console.log("leadFilter", JSON.stringify(leadFilter))
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
        console.log("callLogs", JSON.stringify(query));

        const count = await callLogModel.aggregate([
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
    else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        const and = [{ uid: { $in: usersList } }];
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
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
        const count = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          { $count: "total" },
        ]);
        res.send(count[0]);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      const and = [{ uid: { $in: usersList } }];
      if (!isObjectEmpty(leadFilter)) {
        Object.keys(leadFilter).forEach((key) => {
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
      const count = await callLogModel.aggregate([
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
          if (!datesField.includes(key)) {
            and.push({ [key]: { $in: leadFilter[key] } });
          }
          else {
            and.push({ [key]: leadFilter[key] });
          }
        })
      }
      const count = await callLogModel.aggregate([
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

callLogController.CallingTrend = async (req, res) => {
  const uid = req.body.uid;

  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: 'User Not Found' });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  const group = {
    $group: {
      _id: {
        $dateToString: {
          format: '%d-%m-%Y',
          date: '$created_at',
          timezone: '+05:30',
        },
      },
      Count: {
        $sum: 1,
      },
    },
  };

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        const count = await callLogModel.aggregate([
          { $match: { $and: [{ organization_id }] } },
          group,
        ]);
        res.send(count);
      } catch (error) {
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        const count = await callLogModel.aggregate([
          {
            $match: {
              $and: [{ uid: { $in: usersList } }],
            },
          },
          group,
        ]);

        res.send(count);
      } catch (error) {
        console.log(error);
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      const count = await callLogModel.aggregate([
        {
          $match: { $and: [{ uid: { $in: usersList } }] },
        },
        group,
      ]);
      res.send(count);
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      const count = await callLogModel.aggregate([
        { $match: { $and: [{ uid }] } },
        group,
      ]);
      res.send(count);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  }
};

callLogController.CallingReport = async (req, res) => {
  const uid = req.body.uid;
  const callFilter = req.body.callFilter;
  const leadFilter = req.body.leadFilter;
  const taskFilter = req.body.taskFilter;
  const leadUserFilter = req.body.leadUserFilter;
  const userEmail=callFilter?.contact_owner_email;
  const resultUserId = await userModel.find({ user_email : { $in : userEmail }},{_id:0, uid:1})
  const uidArrData=resultUserId?.map(list=>list?.uid)
 
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
  //  return res.send({callLogReport:resultCacheData.cachedData,cachedData:"cachedData"})
  return res.send(resultCacheData.cachedData)
 }else{
  // for date filters - condition on which the date filter is set
  const date_parameter = 'created_at';

  // for date filters in analytics
  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    console.log(req.body.start_date);
    start_date = moment(req.body.start_date)
      .utcOffset('+05:30')
      .startOf('day')
      .toDate();
  }

  console.log('req', start_date);

  if (req.body.end_date) {
    console.log(req.body.end_date);

    end_date = moment(req.body.end_date)
      .utcOffset('+05:30')
      .endOf('day')
      .toDate();
  }
  console.log('req', end_date);

  if (req.body.start_date && req.body.end_date) {
    date_condition = {
      [`${date_parameter}`]: {
        $gte: start_date,
        $lte: end_date,
      },
    };
  }

  // for LM and TL, we need to send data group on the basis of owner
  const groupByOwner = {
    $group: {
      _id: {
        owner: '$uid',
        duration: {
          $let: {
            vars: {
              duration: '$duration',
            },
            in: {
              $switch: {
                branches: [
                  { case: { $eq: ['$$duration', 0] }, then: 0 },
                  { case: { $lte: ['$$duration', 30] }, then: 30 },
                  { case: { $lte: ['$$duration', 60] }, then: 60 },
                  { case: { $lte: ['$$duration', 120] }, then: 120 },
                  { case: { $gt: ['$$duration', 120] }, then: 'Other' },
                ],
              },
            },
          },
        },
      },
      num: { $sum: 1 },
    },
  };

  // for sales, we need to send data group on the basis of dates
  const groupByDate = {
    $group: {
      _id: {
        created_at: {
          $dateToString: {
            date: '$created_at',
            format: '%d-%m-%Y',
            timezone: '+05:30',
          },
        },
        duration: {
          $let: {
            vars: {
              duration: '$duration',
            },

            in: {
              $switch: {
                branches: [
                  { case: { $eq: ['$$duration', 0] }, then: 0 },
                  { case: { $lte: ['$$duration', 30] }, then: 30 },
                  { case: { $lte: ['$$duration', 60] }, then: 60 },
                  { case: { $lte: ['$$duration', 120] }, then: 120 },
                  { case: { $gt: ['$$duration', 120] }, then: 'Other' },
                ],
              },
            },
          },
        },
      },
      num: { $sum: 1 },
    },
  };

  // helper group for sales
  const groupByDuration = {
    $group: {
      _id: '$_id.created_at',
      duration: { $push: { duration: '$_id.duration', count: '$num' } },
    },
  };

  // helper group for owner
  const groupByOwnerGroup = {
    $group: {
      _id: '$_id.owner',
      duration: { $push: { duration: '$_id.duration', count: '$num' } },
    },
  };

  // project query for sales
  const projectByDate = {
    $project: {
      created_at: '$_id',
      _id: false,
      duration: 1,
      total: {
        $sum: '$duration.count',
      },
    },
  };

  // project query for TL, LM
  const projectByOwner = {
    $project: {
      owner: '$_id',
      _id: false,
      duration: 1,
      total: {
        $sum: '$duration.count',
      },
    },
  };

  // we have filters such that filter field can be present in lead, task or call module, so we are using lookup mongo aggregate function to apply those filters


  let uidKeys = [];
  let isReportingTo = false;
  let isBranchTo = false;
  let isTeamTo = false;

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


  !isObjectEmpty(callFilter) &&
    Object.keys(callFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (callFilter[key].length && callFilter[key].length === 2) {
          callFilter[key] = {
            $gte: new Date(callFilter[key][0]),
            $lte: new Date(callFilter[key][1]),
          };
        }
      } else {
        callFilter[key] = { $in: callFilter[key] };
      }
    });

  !isObjectEmpty(leadFilter) &&
    Object.keys(leadFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (leadFilter[key].length && leadFilter[key].length === 2) {
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
        else if (key == "branch") {
          isBranchTo = true;
        }
        else if (key == "team") {
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
        if (taskFilter[key].length && taskFilter[key].length === 2) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  // chart data count
  let ChartCount = {};

  // total chart data count
  let Total = 0;

  // for reformatting reportChart value which we get after querying in the required format
  const countHelpDate = (arr) => {
    arr.forEach((element) => {
      var cr = element['created_at'];
      var makeKey = element['duration'];
      makeKey.forEach((c) => {
        var key = c['duration'];
        if (!ChartCount[cr]) {
          ChartCount[cr] = c.count;
          Total += c.count;
        } else {
          ChartCount[cr] += c.count;
          Total += c.count;
        }
      });
    });
  };

  
  // lookup aggregate query
  const leadLookup = {
    $lookup: {
      from: 'contacts',
      localField: 'leadId',
      foreignField: 'Id',
      as: 'leads',
    },
  };

  const taskLookup = {
    $lookup: {
      from: 'tasks',
      localField: 'leadId',
      foreignField: 'leadId',
      as: 'tasks',
    },
  };

  // if date filter is there, we send data count between those dates, else we send data of last 30 days
  const dateArrayFormat = (countArr, start, end) => {
    const res = [];
    if (start === '') {
      start = moment().utcOffset('+05:30').subtract(30, 'days').startOf('day');
      end = moment().utcOffset('+05:30').endOf('day').toDate();

      for (let m = start; m.isBefore(end); m.add(1, 'days')) {
        if (!countArr.hasOwnProperty(m.format('DD-MM-YYYY'))) {
          res.push({ [`${m.format('DD-MM-YYYY')}`]: 0 });
        } else {
          res.push({
            [`${m.format('DD-MM-YYYY')}`]: countArr[m.format('DD-MM-YYYY')],
          });
        }
      }
    } else {
      // let endDate = moment(end);
      console.log('start', start.toDate());
      console.log('end', end.toDate());
      for (
        let m = moment(start).utcOffset('+05:30').startOf('day');
        m.isBefore(end);
        m.add(1, 'days')
      ) {
        if (!countArr.hasOwnProperty(m.format('DD-MM-YYYY'))) {
          res.push({ [`${m.format('DD-MM-YYYY')}`]: 0 });
        } else {
          res.push({
            [`${m.format('DD-MM-YYYY')}`]: countArr[m.format('DD-MM-YYYY')],
          });
        }
      }
    }
    return res;
  };

  // if our count and chartCount came out to be zero, we need to send the same above date format with 0 value against each date
  const emptyDateArray = (start, end) => {
    const res = [];
    if (start === '') {
      start = moment().utcOffset('+05:30').subtract(30, 'days').startOf('day');
      end = moment().utcOffset('+05:30').endOf('day').toDate();

      for (let m = start; m.isBefore(end); m.add(1, 'days')) {
        res.push({ [`${m.format('DD-MM-YYYY')}`]: 0 });
      }
    } else {
      // let endDate = moment(end);
      console.log('start', start.toDate());
      console.log('end', end.toDate());
      for (
        let m = moment(start).utcOffset('+05:30').startOf('day');
        m.isBefore(end);
        m.add(1, 'days')
      ) {
        res.push({ [`${m.format('DD-MM-YYYY')}`]: 0 });
      }
    }
    return res;
  };

  if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes('All'))
    ) {
      try {
        // and query for match function
        let and = [{ organization_id }];

        // report - table for analytics graph, reportChart - analytics graph data
        let report, reportChart;

        if (date_condition) {
          and.push(date_condition);
        }
        if (!isObjectEmpty(callFilter)) {
          const keys = Object.keys(callFilter);
          keys.forEach((key, index) => {
            if(key==="contact_owner_email")
            {
              and.push({"uid": {$in:uidArrData}});
            }
            else
            {
              and.push({ [`${key}`]: callFilter[key] });
            }
          });
        }
        // match function and in case lookup is required
        let lookupandLead = [];
        let lookupandTask = [];

        // checking if lookup is required, only then applying it to improve efficiency
        let leadCheck = !isObjectEmpty(leadFilter);
        let taskCheck = !isObjectEmpty(taskFilter);

        if (leadCheck) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            if (key == "reporting_to") {
              lookupandLead.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            }
            else if (key == "branch") {
              lookupandLead.push({ [`${key == "branch" ? "uid" : key}`]: key == "branch" ? { $in: uidKeys } : leadFilter[key] });
            }
            else if (key == "team") {
              lookupandLead.push({ [`${key == "team" ? "uid" : key}`]: key == "team" ? { $in: uidKeys } : leadFilter[key] });
            }
            else {
              lookupandLead.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
            }
          });
        }
        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        if (taskCheck) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupandTask.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!leadCheck && !taskCheck) {
          const query = [
            { $match: { $and: and } },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ];
          // console.log("Calllog Query 1:-" + JSON.stringify(query));
          const query1 = [
            {
              $match: { $and: and },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ];
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        } else if (!leadCheck && taskCheck) {
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        } else if (leadCheck && !taskCheck) {
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        } else {
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        }

        countHelpDate(reportChart);

        if (reportChart.length > 0) {
          ChartCount = dateArrayFormat(
            ChartCount,
            start_date ? moment(start_date) : '',
            end_date ? moment(end_date) : ''
          );
        } else {
          ChartCount = emptyDateArray(
            start_date ? moment(start_date) : '',
            end_date ? moment(end_date) : ''
          );
        }

        //////////////////////Non performing user functionality ////////////////////////////

        if (leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id, status: "ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          let existingOwners = report.map(item => item.owner);

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, duration: [], total: 0 };
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
      let usersList = await getBranchUsers(uid, organization_id, permission);
      try {
        let and = [{ uid: { $in: usersList } }];

        let report, reportChart;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(callFilter)) {
          const keys = Object.keys(callFilter);
          keys.forEach((key, index) => {
            if(key==="contact_owner_email")
            {
              and.push({"uid": {$in:uidArrData}});
            }
            else
            {
              and.push({ [`${key}`]: callFilter[key] });
            }
          });
        }

        let lookupandLead = [];
        let lookupandTask = [];

        let leadCheck = !isObjectEmpty(leadFilter);
        let taskCheck = !isObjectEmpty(taskFilter);

        if (leadCheck) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            lookupandLead.push({ [`${key}`]: leadFilter[key] });
          });
        }

        if (taskCheck) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupandTask.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!leadCheck && !taskCheck) {
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        } else if (!leadCheck && taskCheck) {
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        } else if (leadCheck && !taskCheck) {
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        } else {
          report = await callLogModel.aggregate([
            { $match: { $and: and } },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByOwner,
            groupByOwnerGroup,
            projectByOwner,
          ]);

          reportChart = await callLogModel.aggregate([
            {
              $match: { $and: and },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            groupByDate,
            groupByDuration,
            projectByDate,
          ]);
        }

        countHelpDate(reportChart);

        if (reportChart.length > 0) {
          ChartCount = dateArrayFormat(
            ChartCount,
            start_date ? moment(start_date) : '',
            end_date ? moment(end_date) : ''
          );
        } else {
          ChartCount = emptyDateArray(
            start_date ? moment(start_date) : '',
            end_date ? moment(end_date) : ''
          );
        }

        //////////////////////Non performing user functionality ////////////////////////////
        if (leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
          let mapper = await userModel
            .find(
              { organization_id: organization_id, status: "ACTIVE", profile: { $nin: ["Admin", "CEO", "Operation Manager"] }, branch: { $in: permission } },
              { uid: 1, _id: 0 }
            )
            .lean();

          const uids = mapper.map((val) => val.uid);

          const existingOwners = report.map(item => item.owner);

          const deletedOwner = existingOwners.filter((elem) => !uids.includes(elem));

          report = report.filter((val) => !deletedOwner.includes(val.owner));

          let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

          // filterArr=[... new Set(filterArr)]
          const arr = filterArr.map((val) => {
            return { owner: val, duration: [], total: 0 };
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
  } else if (profile.toLowerCase() == 'team lead') {
    let usersList = await getTeamUsers(uid, organization_id);
    try {
      let and = [{ uid: { $in: usersList } }];

      let report, reportChart;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(callFilter)) {
        const keys = Object.keys(callFilter);
        keys.forEach((key, index) => {
          if(key==="contact_owner_email")
            {
              and.push({"uid": {$in:uidArrData}});
            }
            else
            {
              and.push({ [`${key}`]: callFilter[key] });
            }
        });
      }
      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      let lookupandLead = [];
      let lookupandTask = [];

      let leadCheck = !isObjectEmpty(leadFilter);
      let taskCheck = !isObjectEmpty(taskFilter);

      if (leadCheck) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          if (key == "reporting_to") {
            lookupandLead.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
          else if (key == "branch") {
            lookupandLead.push({ [`${key == "branch" ? "uid" : key}`]: key == "branch" ? { $in: uidKeys } : leadFilter[key] });
          }
          else {
            lookupandLead.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          }
          // lookupandLead.push({ [`${key}`]: leadFilter[key] });
        });

      }

      if (taskCheck) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupandTask.push({ [`${key}`]: taskFilter[key] });
        });
      }

      if (!leadCheck && !taskCheck) {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          groupByOwner,
          groupByOwnerGroup,
          projectByOwner,
        ]);

        reportChart = await callLogModel.aggregate([
          {
            $match: { $and: and },
          },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      } else if (!leadCheck && taskCheck) {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          groupByOwner,
          groupByOwnerGroup,
          projectByOwner,
        ]);

        reportChart = await callLogModel.aggregate([
          {
            $match: { $and: and },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      } else if (leadCheck && !taskCheck) {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          groupByOwner,
          groupByOwnerGroup,
          projectByOwner,
        ]);

        reportChart = await callLogModel.aggregate([
          {
            $match: { $and: and },
          },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      } else {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          groupByOwner,
          groupByOwnerGroup,
          projectByOwner,
        ]);

        reportChart = await callLogModel.aggregate([
          {
            $match: { $and: and },
          },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      }

      countHelpDate(reportChart);

      if (reportChart.length > 0) {
        ChartCount = dateArrayFormat(
          ChartCount,
          start_date ? moment(start_date) : '',
          end_date ? moment(end_date) : ''
        );
      } else {
        ChartCount = emptyDateArray(
          start_date ? moment(start_date) : '',
          end_date ? moment(end_date) : ''
        );
      }

      //////////////////////Non performing user functionality ////////////////////////////
      if (leadFilter && !leadFilter.contact_owner_email && Object.keys(leadUserFilter).length === 0) {
        const uids = await getTeamUsersForNonPerforming(uid, organization_id)

        const existingOwners = report.map(item => item.owner);

        const deletedOwner = existingOwners.filter((elem) => !uids.includes(elem));

        report = report.filter((val) => !deletedOwner.includes(val.owner));

        let filterArr = uids.filter((elem) => !existingOwners.includes(elem));

        // filterArr=[... new Set(filterArr)]
        const arr = filterArr.map((val) => {
          return { owner: val, duration: [], total: 0 };
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
    try {
      let and = [{ uid }];

      let report;

      if (date_condition) {
        and.push(date_condition);
      } 
      // else {
      //   date_condition = {
      //     [`${date_parameter}`]: {
      //       $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      //       $lte: new Date(),
      //     },
      //   };
      //   and.push(date_condition);
      // }

      if (!isObjectEmpty(callFilter)) {
        const keys = Object.keys(callFilter);
        keys.forEach((key, index) => {
          if(key==="contact_owner_email")
            {
              and.push({"uid": {$in:uidArrData}});
            }
            else
            {
              and.push({ [`${key}`]: callFilter[key] });
            }
        });
      }

      let lookupandLead = [];
      let lookupandTask = [];

      let leadCheck = !isObjectEmpty(leadFilter);
      let taskCheck = !isObjectEmpty(taskFilter);

      if (leadCheck) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          lookupandLead.push({ [`${key}`]: leadFilter[key] });
        });
      }

      if (taskCheck) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupandTask.push({ [`${key}`]: taskFilter[key] });
        });
      }

      if (!leadCheck && !taskCheck) {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      } else if (!leadCheck && taskCheck) {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      } else if (leadCheck && !taskCheck) {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      } else {
        report = await callLogModel.aggregate([
          { $match: { $and: and } },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          groupByDate,
          groupByDuration,
          projectByDate,
        ]);
      }
      countHelpDate(report);

      if (report.length > 0) {
        ChartCount = dateArrayFormat(
          ChartCount,
          start_date ? moment(start_date) : '',
          end_date ? moment(end_date) : ''
        );
      } else {
        ChartCount = emptyDateArray(
          start_date ? moment(start_date) : '',
          end_date ? moment(end_date) : ''
        );
      }
      checkFilterExist(resultCacheData.CacheKey,req.body,{ report, ChartCount, Total })
      
      res.send({ report, ChartCount, Total });
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  }
}
};

// drill down functionality in our analytics - same as search function above, just querying is changes into aggregate pipeline as to apply lookup functionality for filters based on task and leads models
callLogController.DrillDownSearch = async (req, res) => {
  const uid = req.body.uid;
  let callFilter = req.body.callFilter;
  let taskFilter = req.body.taskFilter;
  let leadFilter = req.body.leadFilter;
  const sort = req.body.sort;
  const missed = req.body.missed;
  const searchString = req.body.searchString ? req.body.searchString : '';
  const page = Number(req.body.page);
  const pageSize = Number(req.body.pageSize);
  let teamUids = req.body.teamUids ? req.body.teamUids : [];

  if(callFilter){
    if ('employee_id' in callFilter || 'employee_name' in callFilter || 'contact_owner_email' in callFilter) {
      let mergedValues = [];
    
      if ('employee_id' in callFilter && 'employee_name' in callFilter) {
        mergedValues.push(...callFilter.employee_id, ...callFilter.employee_name);
      } else if ('employee_id' in callFilter) {
        mergedValues.push(...callFilter.employee_id);
      } else if ('employee_name' in callFilter) {
        mergedValues.push(...callFilter.employee_name);
      }
    
      if ('contact_owner_email' in callFilter) {
        mergedValues.push(...callFilter.contact_owner_email);
      }
    
      callFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete callFilter.employee_id;
      delete callFilter.employee_name;
    }
  }
let userFilter=callFilter?.leadUserFilter;

let userQuery={};

if(userFilter){
  Object.keys(userFilter).forEach((key)=>{
    if(key.split(".")[1]==="team"){
      userQuery["team"]={$in:userFilter[key]}
    }else if (key.split(".")[1]==="reporting_to"){
      userQuery["reporting_to"]={$in:userFilter[key]}
    }else if (key.split(".")[1]==="branch"){
      userQuery["branch"]={$in:userFilter[key]}
    }
    
  })
}

  
console.log("userQuery",userQuery);

  const resultUserId = await userModel.find(userQuery,{_id:0, uid:1})
  const uidArrData=resultUserId?.map(list=>list?.uid)
console.log("uidArray",uidArrData);

// return res.send("how are you")
  Object.keys(callFilter).forEach((key) => {
    if (datesField.includes(key)) {
      if (callFilter[key].length && callFilter[key].length === 2) {
        callFilter[key] = {
          $gte: new Date(callFilter[key][0]),
          $lte: new Date(callFilter[key][1]),
        };
      }
    } else if (booleanField.includes(key)) {
      callFilter[key].forEach((element, index) => {
        if (element === 'True'|| element === true) {
          callFilter[key] = true;
        } else if (element === 'False' || element === false) {
          callFilter[key] = false;
          console.log('here');
        }
      });
    } else if (key === 'duration') {
      if (callFilter[key].includes(0)) callFilter[key] = { $lte: 0, $gte: 0 };
      else if (callFilter[key].includes(30))
        callFilter[key] = { $gt: 0, $lte: 30 };
      else if (callFilter[key].includes(60))
        callFilter[key] = { $gt: 30, $lte: 60 };
      else if (callFilter[key].includes(120))
        callFilter[key] = { $gt: 60, $lte: 120 };
      else if (callFilter[key].includes(121)) callFilter[key] = { $gt: 120 };
    } else if(!callFilter["leadUserFilter"]) {
      callFilter[key] = { $in: callFilter[key] };
    }
  });

  Object.keys(taskFilter).forEach((key) => {
    if (datesField.includes(key.split('.')[1])) {
      if (taskFilter[key].length && taskFilter[key].length === 2) {
        taskFilter[key] = {
          $gte: new Date(taskFilter[key][0]),
          $lte: new Date(taskFilter[key][1]),
        };
      }
    } else if (booleanField.includes(key.split('.')[1])) {
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
          $gte: new Date(leadFilter[key][0]),
          $lte: new Date(leadFilter[key][1]),
        };
      }
    } else if (booleanField.includes(key.split('.')[1])) {
      leadFilter[key].forEach((element, index) => {
        if (element === 'True'|| element === true) {
          leadFilter[key] = true;
        } else if (element === 'False' || element === false) {
          leadFilter[key] = false;
        }
      });
    } else {
      leadFilter[key] = { $in: leadFilter[key] };
    }
  });

  if (missed === true) {
    callFilter['next_follow_up_date_time'] = { $lt: new Date() };
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
    callFilter['contact_no'] = { $in: contact_list };
  }
  if (customer_name_list.length !== 0) {
    callFilter['customer_name'] = { $in: customer_name_list };
  }

  let resultUser = "";
  if(teamUids.length < 1){
    resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
       return res.send({ error: 'User build error  Not Found' });
    }
  }

  const user = resultUser && resultUser[0];
  const profile = user && user.profile;
  const organization_id = user && user.organization_id;

  const leadLookup = {
    $lookup: {
      from: 'contacts',
      localField: 'leadId',
      foreignField: 'Id',
      as: 'leads',
    },
  };

  const taskLookup = {
    $lookup: {
      from: 'tasks',
      localField: 'leadId',
      foreignField: 'leadId',
      as: 'tasks',
    },
  };

  // for sort query to be modified accordingly for our aggregate piepline
  let sortModified = {};

  // from frontend, -1 or 1 is coming as a string, so handling that
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

  // for getting data according to role - used in case of grand total in analytics or KPI
  const role = req.body.role;
  if (role === false) {
    try {
      let and;
      if(teamUids.length > 0){
        and = [{ uid:{$in:teamUids} }];
      }else{
        and = [{ uid }];
      }

      let callLogs;

      if (!isObjectEmpty(callFilter)) {
        const keys = Object.keys(callFilter);
        keys.forEach((key, index) => {
          if(key==="leadUserFilter")
          {
            and.push({"uid": {$in:uidArrData}});
            delete callFilter["leadUserFilter"]
          }
          else
          {
            and.push({ [`${key}`]: callFilter[key] });
          }
        });
      }

      let lookupandLead = [];
      let lookupandTask = [];

      let leadCheck = !isObjectEmpty(leadFilter);
      let taskCheck = !isObjectEmpty(taskFilter);

      if (leadCheck) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          lookupandLead.push({ [`${key}`]: leadFilter[key] });
        });
      }

      if (taskCheck) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupandTask.push({ [`${key}`]: taskFilter[key] });
        });
      }
      if (!leadCheck && !taskCheck) {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          sortQuery,
          skipQuery,
          limitQuery,
        ]);
      } else if (leadCheck && !taskCheck) {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          sortQuery,
          skipQuery,
          limitQuery,
        ]);
      } else if (!leadCheck && taskCheck) {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          sortQuery,
          skipQuery,
          limitQuery,
        ]);
      } else {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },

          sortQuery,
          skipQuery,
          limitQuery,
        ]);
      }

      return res.send(callLogs);
    } catch (error) {
      console.log(error);
      return res.send({ error });
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
          let and = [{ organization_id }];

          let callLogs;

          if (!isObjectEmpty(callFilter)) {
            const keys = Object.keys(callFilter);
            keys.forEach((key, index) => {
              if(key==="leadUserFilter")
          {
            and.push({"uid": {$in:uidArrData}});
            delete callFilter["leadUserFilter"]
          }
              else
              {
                and.push({ [`${key}`]: callFilter[key] });
              }
            });
          }

          let lookupandLead = [];
          let lookupandTask = [];

          let leadCheck = !isObjectEmpty(leadFilter);
          let taskCheck = !isObjectEmpty(taskFilter);

          if (leadCheck) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              
              lookupandLead.push({ [`${key}`]: leadFilter[key] });
            });
          }

          if (taskCheck) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              lookupandTask.push({ [`${key}`]: taskFilter[key] });
            });
          }
          const query = [
            {
              $match: {
                $and: and,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]
          console.log("calldrilldownSearch", JSON.stringify(query));
          if (!leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          } else if (leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          } else if (!leadCheck && taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          } else {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },

              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          }
          return res.send(callLogs);
        } catch (error) {
          console.log(error);
          return res.send({ error });
        }
      } else {
        let usersList = await getBranchUsers(uid, organization_id, permission);
        try {
          let and = [{ uid: { $in: usersList } }];

          let callLogs;

          if (!isObjectEmpty(callFilter)) {
            const keys = Object.keys(callFilter);
            keys.forEach((key, index) => {
              if(key==="leadUserFilter")
              {
                and.push({"uid": {$in:uidArrData}});
                delete callFilter["leadUserFilter"]
              }
              else
              {
                and.push({ [`${key}`]: callFilter[key] });
              }
            });
          }

          let lookupandLead = [];
          let lookupandTask = [];

          let leadCheck = !isObjectEmpty(leadFilter);
          let taskCheck = !isObjectEmpty(taskFilter);

          if (leadCheck) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              lookupandLead.push({ [`${key}`]: leadFilter[key] });
            });
          }

          if (taskCheck) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              lookupandTask.push({ [`${key}`]: taskFilter[key] });
            });
          }

          if (!leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          } else if (leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          } else if (!leadCheck && taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },
              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          } else {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },

              sortQuery,
              skipQuery,
              limitQuery,
            ]);
          }

          return res.send(callLogs);
        } catch (error) {
          console.log(error);
          return res.send({ error });
        }
      }
    } else if (profile.toLowerCase() == 'team lead') {
      let usersList = await getTeamUsers(uid, organization_id);
      try {
        let and = [{ uid: { $in: usersList } }];

        let callLogs;

        if (!isObjectEmpty(callFilter)) {
          const keys = Object.keys(callFilter);
          keys.forEach((key, index) => {
            if(key==="leadUserFilter")
            {
              and.push({"uid": {$in:uidArrData}});
              delete callFilter["leadUserFilter"]
            }
            else
            {
              and.push({ [`${key}`]: callFilter[key] });
            }
          });
        }

        let lookupandLead = [];
        let lookupandTask = [];

        let leadCheck = !isObjectEmpty(leadFilter);
        let taskCheck = !isObjectEmpty(taskFilter);

        if (leadCheck) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            lookupandLead.push({ [`${key}`]: leadFilter[key] });
          });
        }

        if (taskCheck) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupandTask.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        } else if (leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        } else if (!leadCheck && taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        } else {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },

            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        }

        return res.send(callLogs);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    } else {
      try {
        let and = [{ uid }];

        let callLogs;

        if (!isObjectEmpty(callFilter)) {
          const keys = Object.keys(callFilter);
          keys.forEach((key, index) => {
            if(key==="leadUserFilter")
            {
              and.push({"uid": {$in:uidArrData}});
              delete callFilter["leadUserFilter"]
            }
            else
            {
              and.push({ [`${key}`]: callFilter[key] });
            }
          });
        }

        let lookupandLead = [];
        let lookupandTask = [];

        let leadCheck = !isObjectEmpty(leadFilter);
        let taskCheck = !isObjectEmpty(taskFilter);

        if (leadCheck) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            lookupandLead.push({ [`${key}`]: leadFilter[key] });
          });
        }

        if (taskCheck) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupandTask.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        } else if (leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        } else if (!leadCheck && taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        } else {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },

            sortQuery,
            skipQuery,
            limitQuery,
          ]);
        }

        return res.send(callLogs);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    }
  }
};

//////////////////////////////////////////////////////////////
// Author: Anuj Chauhan
// Date: 30/05/2022
// Comment: Added this API to get total drill down count for
// call logs analytics (associate & source ).
///////////////////////////////////////////
callLogController.CallLogsDrillDownCount = async (req, res) => {
  const uid = req.body.uid;
  let callFilter = req.body.callFilter;
  let taskFilter = req.body.taskFilter;
  let leadFilter = req.body.leadFilter;
  const missed = req.body.missed;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];

  if(callFilter){
    if ('employee_id' in callFilter || 'employee_name' in callFilter || 'contact_owner_email' in callFilter) {
      let mergedValues = [];
    
      if ('employee_id' in callFilter && 'employee_name' in callFilter) {
        mergedValues.push(...callFilter.employee_id, ...callFilter.employee_name);
      } else if ('employee_id' in callFilter) {
        mergedValues.push(...callFilter.employee_id);
      } else if ('employee_name' in callFilter) {
        mergedValues.push(...callFilter.employee_name);
      }
    
      if ('contact_owner_email' in callFilter) {
        mergedValues.push(...callFilter.contact_owner_email);
      }
    
      callFilter.contact_owner_email = [...new Set(mergedValues)];
      
      delete callFilter.employee_id;
      delete callFilter.employee_name;
    }
  }

  // const userEmail=callFilter?.contact_owner_email;

  let userFilter=callFilter?.leadUserFilter;

let userQuery={};

if(userFilter){
  Object.keys(userFilter).forEach((key)=>{
    if(key.split(".")[1]==="team"){
      userQuery["team"]={$in:userFilter[key]}
    }else if (key.split(".")[1]==="reporting_to"){
      userQuery["reporting_to"]={$in:userFilter[key]}
    }else if (key.split(".")[1]==="branch"){
      userQuery["branch"]={$in:userFilter[key]}
    }
  })
}
  const resultUserId = await userModel.find(userQuery,{_id:0, uid:1})
  const uidArrData=resultUserId?.map(list=>list?.uid)

  Object.keys(callFilter).forEach((key) => {
    if (datesField.includes(key)) {
      if (callFilter[key].length && callFilter[key].length === 2) {
        callFilter[key] = {
          $gte: new Date(callFilter[key][0]),
          $lte: new Date(callFilter[key][1]),
        };
      }
    } else if (booleanField.includes(key)) {
      callFilter[key].forEach((element, index) => {
        if (element === 'True' || element === true) {
          callFilter[key] = true;
        } else if (element === 'False' || element === false) {
          callFilter[key] = false;
          console.log('here');
        }
      });
    } else if (key === 'duration') {
      if (callFilter[key].includes(0)) callFilter[key] = { $lte: 0, $gte: 0 };
      else if (callFilter[key].includes(30))
        callFilter[key] = { $gt: 0, $lte: 30 };
      else if (callFilter[key].includes(60))
        callFilter[key] = { $gt: 30, $lte: 60 };
      else if (callFilter[key].includes(120))
        callFilter[key] = { $gt: 60, $lte: 120 };
      else if (callFilter[key].includes(121)) callFilter[key] = { $gt: 120 };
    } else if(!callFilter["leadUserFilter"]) {
      callFilter[key] = { $in: callFilter[key] };
    }
  });

  Object.keys(taskFilter).forEach((key) => {
    if (datesField.includes(key.split('.')[1])) {
      if (taskFilter[key].length && taskFilter[key].length === 2) {
        taskFilter[key] = {
          $gte: new Date(taskFilter[key][0]),
          $lte: new Date(taskFilter[key][1]),
        };
      }
    } else if (booleanField.includes(key.split('.')[1])) {
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
          $gte: new Date(leadFilter[key][0]),
          $lte: new Date(leadFilter[key][1]),
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
    } else {
      leadFilter[key] = { $in: leadFilter[key] };
    }
  });

  if (missed === true) {
    callFilter['next_follow_up_date_time'] = { $lt: new Date() };
  }

  let customer_name_list = [];
  let contact_list = [];

  if (contact_list.length !== 0) {
    callFilter['contact_no'] = { $in: contact_list };
  }
  if (customer_name_list.length !== 0) {
    callFilter['customer_name'] = { $in: customer_name_list };
  }

  let resultUser = "";
  if(teamUids.length < 1){
     resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
       return res.send({ error: 'User Not Found' });
    }
  }
  const user = resultUser && resultUser[0];
  const profile = user && user.profile;
  const organization_id = user && user.organization_id;

  const leadLookup = {
    $lookup: {
      from: 'contacts',
      localField: 'leadId',
      foreignField: 'Id',
      as: 'leads',
    },
  };

  const taskLookup = {
    $lookup: {
      from: 'tasks',
      localField: 'leadId',
      foreignField: 'leadId',
      as: 'tasks',
    },
  };

  // for sort query to be modified accordingly for our aggregate piepline
  // let sortModified = {};

  // from frontend, -1 or 1 is coming as a string, so handling that
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

  // for getting data according to role - used in case of grand total in analytics or KPI
  const role = req.body.role;

  if (role === false) {
    try {
      let and;
      if(teamUids.length > 0){
        and = [{ uid:{$in:teamUids} }];
      }else{
        and = [{ uid }];
      }

      let callLogs;

      if (!isObjectEmpty(callFilter)) {
        const keys = Object.keys(callFilter);

        keys.forEach((key, index) => {
          if(key==="leadUserFilter")
          {
            and.push({"uid": {$in:uidArrData}});
            delete callFilter["leadUserFilter"]
          }else{
          and.push({ [`${key}`]: callFilter[key] });
          }
        });
      }

      let lookupandLead = [];
      let lookupandTask = [];

      let leadCheck = !isObjectEmpty(leadFilter);
      let taskCheck = !isObjectEmpty(taskFilter);

      if (leadCheck) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key, index) => {
          lookupandLead.push({ [`${key}`]: leadFilter[key] });
        });
      }

      if (taskCheck) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key, index) => {
          lookupandTask.push({ [`${key}`]: taskFilter[key] });
        });
      }

      if (!leadCheck && !taskCheck) {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          {
            "$count": "total"
          }
        ]);
      } else if (leadCheck && !taskCheck) {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          {
            "$count": "total"
          }
        ]);
      } else if (!leadCheck && taskCheck) {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          {
            "$count": "total"
          }
        ]);
      } else {
        callLogs = await callLogModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          leadLookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupandLead,
            },
          },
          taskLookup,
          { $unwind: '$tasks' },
          {
            $match: {
              $and: lookupandTask,
            },
          },
          {
            "$count": "total"
          }
        ]);
      }

      return res.send(callLogs);
    } catch (error) {
      console.log(error);
      return res.send({ error });
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
          let and = [{ organization_id }];

          let callLogs;
          if (!isObjectEmpty(callFilter)) {
            const keys = Object.keys(callFilter);
            keys.forEach((key, index) => {
              if(key==="leadUserFilter")
              {
                and.push({"uid": {$in:uidArrData}});
                delete callFilter["leadUserFilter"]
              }
              else
              {
                and.push({ [`${key}`]: callFilter[key] });
              }
            });
          }
          let lookupandLead = [];
          let lookupandTask = [];

          let leadCheck = !isObjectEmpty(leadFilter);
          let taskCheck = !isObjectEmpty(taskFilter);

          if (leadCheck) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              lookupandLead.push({ [`${key}`]: leadFilter[key] });
            });
          }

          if (taskCheck) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              lookupandTask.push({ [`${key}`]: taskFilter[key] });
            });
          }
          const query = [
            {
              $match: {
                $and: and,
              },
            },
            {
              "$count": "total"
            }
          ]
          if (!leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else if (leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else if (!leadCheck && taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },
              {
                "$count": "total"
              }
            ]);
          }
          return res.send(callLogs);
        } catch (error) {
          console.log(error);
          return res.send({ error });
        }
      } else {
        let usersList = await getBranchUsers(uid, organization_id, permission);
        try {
          let and = [{ uid: { $in: usersList } }];

          let callLogs;

          if (!isObjectEmpty(callFilter)) {
            const keys = Object.keys(callFilter);
            keys.forEach((key, index) => {
              if(key==="leadUserFilter")
              {
                and.push({"uid": {$in:uidArrData}});
                delete callFilter["leadUserFilter"]
              }
              else
              {
                and.push({ [`${key}`]: callFilter[key] });
              }
            });
          }

          let lookupandLead = [];
          let lookupandTask = [];

          let leadCheck = !isObjectEmpty(leadFilter);
          let taskCheck = !isObjectEmpty(taskFilter);

          if (leadCheck) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key, index) => {
              lookupandLead.push({ [`${key}`]: leadFilter[key] });
            });
          }

          if (taskCheck) {
            const keys = Object.keys(taskFilter);
            keys.forEach((key, index) => {
              lookupandTask.push({ [`${key}`]: taskFilter[key] });
            });
          }

          if (!leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else if (leadCheck && !taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else if (!leadCheck && taskCheck) {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },
              {
                "$count": "total"
              }
            ]);
          } else {
            callLogs = await callLogModel.aggregate([
              {
                $match: {
                  $and: and,
                },
              },
              leadLookup,
              { $unwind: '$leads' },
              {
                $match: {
                  $and: lookupandLead,
                },
              },
              taskLookup,
              { $unwind: '$tasks' },
              {
                $match: {
                  $and: lookupandTask,
                },
              },
              {
                "$count": "total"
              }
            ]);
          }

          return res.send(callLogs);
        } catch (error) {
          console.log(error);
          return res.send({ error });
        }
      }
    } else if (profile.toLowerCase() == 'team lead') {
      let usersList = await getTeamUsers(uid, organization_id);
      try {
        let and = [{ uid: { $in: usersList } }];

        let callLogs;

        if (!isObjectEmpty(callFilter)) {
          const keys = Object.keys(callFilter);
          keys.forEach((key, index) => {
            if(key==="leadUserFilter")
            {
              and.push({"uid": {$in:uidArrData}});
              delete callFilter["leadUserFilter"]
            }
              else
              {
                and.push({ [`${key}`]: callFilter[key] });
              }
          });
        }

        let lookupandLead = [];
        let lookupandTask = [];

        let leadCheck = !isObjectEmpty(leadFilter);
        let taskCheck = !isObjectEmpty(taskFilter);

        if (leadCheck) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            lookupandLead.push({ [`${key}`]: leadFilter[key] });
          });
        }

        if (taskCheck) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupandTask.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else if (leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else if (!leadCheck && taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            {
              "$count": "total"
            }
          ]);
        }

        return res.send(callLogs);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    } else {
      try {
        let and = [{ uid }];

        let callLogs;

        if (!isObjectEmpty(callFilter)) {
          const keys = Object.keys(callFilter);
          keys.forEach((key, index) => {
            if(key==="leadUserFilter")
            {
              and.push({"uid": {$in:uidArrData}});
              delete callFilter["leadUserFilter"]
            }
              else
              {
                and.push({ [`${key}`]: callFilter[key] });
              }
          });
        }

        let lookupandLead = [];
        let lookupandTask = [];

        let leadCheck = !isObjectEmpty(leadFilter);
        let taskCheck = !isObjectEmpty(taskFilter);

        if (leadCheck) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key, index) => {
            lookupandLead.push({ [`${key}`]: leadFilter[key] });
          });
        }

        if (taskCheck) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key, index) => {
            lookupandTask.push({ [`${key}`]: taskFilter[key] });
          });
        }

        if (!leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else if (leadCheck && !taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else if (!leadCheck && taskCheck) {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            {
              "$count": "total"
            }
          ]);
        } else {
          callLogs = await callLogModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            leadLookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupandLead,
              },
            },
            taskLookup,
            { $unwind: '$tasks' },
            {
              $match: {
                $and: lookupandTask,
              },
            },
            {
              "$count": "total"
            }
          ]);
        }

        return res.send(callLogs);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    }
  }
};

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


callLogController.CreateCallLogsNew = async (req, res) => {
  try{
    let modifiedData = convertTimestampsToDate(req.body);
    // const user = await userModel.findOne({ uid: modifiedData.uid });
    // let created_by = '';
    // if (user) {
    //   created_by = user.user_name;
    // }
    const data = new callLogModel({
      leadId: modifiedData.leadId,
      created_at: modifiedData.created_at,
      duration: mapSeconds(modifiedData.callTime),
      uid: modifiedData.uid,
      organization_id: modifiedData.organization_id,
    });
    let result = await data.save();
    return res.status(200).json({"success": true,data:result});
  }catch(error){
    return res.status(400).json({"success": false,"error":err});
  }
};

callLogController.FetchCallLogsNew = async (req, res) => {
  try{
    let leadId = req.body.leadId ? req.body.leadId : "";
    let query = {
      leadId: leadId,
    };
    let callLogs = await callLogModel.find(query);
    return res.status(200).json({"success": true,data:callLogs});
  }catch(err){
    return res.status(400).json({"success": false,"error":err});
  }
};

callLogController.UpdateCallLogsNew = async (req, res) => {
  try{
    let modifiedData = convertTimestampsToDate(req.body);
    const leadId = modifiedData.leadId;

    const latestCallLog = await callLogModel.find({leadId}).sort({ created_at: -1 })

    if (latestCallLog.length < 1) {
      const data = new callLogModel({
        leadId: modifiedData.leadId,
        created_at: modifiedData.created_at,
        duration: mapSeconds(modifiedData.callTime),
        uid: modifiedData.uid,
        organization_id: modifiedData.organization_id,
      });
      let result = await data.save();
      return res.status(200).json({"success": true,data:result});
    }else{
      let callLog = latestCallLog[0];
      let result = await callLogModel.updateOne({ _id: callLog._id }, {
        $set: {
          // created_at: modifiedData.created_at,
          duration: mapSeconds(modifiedData.callTime),
          call_recording_url:req.body.call_recording_url
        }
      });
      
      return res.status(200).json({"success": true,data:result});
    }

  }catch(err){
    console.log("err",err)
    return res.status(400).json({"success": false,"error":err});
  }
};

callLogController.GetFetchCallLogsNew = async (req, res) => {
  try {
    const leadId = req.query.leadId;

    // Check if leadId is provided
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: "leadId is required",
      });
    }

    const query = { leadId: leadId };
    const callLogs = await callLogModel.find(query);

    return res.status(200).json({
      success: true,
      data: callLogs,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || "An error occured, please try again later",
    });
  }
};

callLogController.CheckNumberBeforeUpdatingCall = async (req, res) => {
  try{
    let phoneNumber = req.query.phoneNumber ? req.query.phoneNumber : "";
    let logPhoneNumber = req.query.logPhoneNumber ? req.query.logPhoneNumber : "";
    if(!phoneNumber || !logPhoneNumber){
      return res.status(400).json({"success": false,"error":"Parameters missing"});
    }
    if(phoneNumber == logPhoneNumber){
      return res.status(200).json({"success": true,data:{
        isEqual: true
      }}); 
    }else{
      return res.status(200).json({"success": true,data:{
        isEqual: false
      }});
    }
  }catch(err){
    console.log("err",err)
    return res.status(400).json({"success": false,"error":err});
  }
};

callLogController.AppFilterValues = async (req, res) => {
  let apiStart = new Date();
  let timeTakenOverall;
  const uid = req.body.uid;
  const stage = req.body.stage;
  const filters=req.body.filters;
  let teamUids = req.body.teamUids ? req.body.teamUids : [];
  let stageFilter = stage ? { stage } : {};
  let missedFilter = {};
  let showFilterValue = req.body.showColumns
  data=CALLLOG_FILTER_VALUES
 
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
    missedFilter['next_follow_up_date_time'] = { $lt: new Date() };
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
    },
  };
}

  // const group = {
  //   $group: {
  //     _id: 0,
  //     budget: { $addToSet: '$budget' },
  //     contact_owner_email: { $addToSet: '$contact_owner_email' },
  //     created_by: { $addToSet: '$created_by' },
  //     lead_source: { $addToSet: '$lead_source' },
  //     location: { $addToSet: '$location' },
  //     project: { $addToSet: '$project' },
  //     stage: { $addToSet: '$stage' },
  //     inventory_type: { $addToSet: '$inventory_type' },
  //     duration: { $addToSet: '$duration' },
  //     state: { $addToSet: "$state" },
  //   },
  // };

  const role = req.body.role;

  // if (profile.toLowerCase() == 'lead manager') {
  //   const permission = user.branchPermission;
  //   if (
  //     permission === undefined ||
  //     (permission && permission.length === 0) ||
  //     (permission && permission.includes('All'))
  //   ) {
  //     try {
  //       const filters = await callLogModel.aggregate([
  //         { $match: { organization_id, ...finalFilters } },
  //         group,
  //       ]);

  //       let singleArray = [];
  //       let finalFilterSorted = {};

  //       Object.keys(filters[0]).forEach((key) => {
  //         if (key != "_id") {
  //           const val = filters[0][key].sort();
  //           finalFilterSorted[key] = val;

  //         }
  //       });
  //       singleArray.push(finalFilterSorted);
  //       res.send(singleArray);
  //       // res.send(filters);
  //     } catch (error) {
  //       console.log(error);
  //       res.send({ error });
  //     }
  //   } else {
  //     let usersList = await getBranchUsers(uid, organization_id, permission);
  //     try {
  //       const filters = await callLogModel.aggregate([
  //         { $match: { uid: { $in: usersList }, ...finalFilters } },
  //         group,
  //       ]);

  //       let singleArray = [];
  //       let finalFilterSorted = {};

  //       Object.keys(filters[0]).forEach((key) => {
  //         if (key != "_id") {
  //           const val = filters[0][key].sort();
  //           finalFilterSorted[key] = val;

  //         }
  //       });
  //       singleArray.push(finalFilterSorted);
  //       res.send(singleArray);
  //       // res.send(filters);
  //     } catch (error) {
  //       console.log(error);
  //       res.send({ error });
  //     }
  //   }
  // } else if (profile.toLowerCase() == 'team lead') {
  //   let usersList = await getTeamUsers(uid, organization_id);
  //   try {
  //     const filters = await callLogModel.aggregate([
  //       { $match: { uid: { $in: usersList }, ...finalFilters } },
  //       group,
  //     ]);

  //     let singleArray = [];
  //     let finalFilterSorted = {};

  //     Object.keys(filters[0]).forEach((key) => {
  //       if (key != "_id") {
  //         const val = filters[0][key].sort();
  //         finalFilterSorted[key] = val;

  //       }
  //     });
  //     singleArray.push(finalFilterSorted);
  //     res.send(singleArray);
  //     // res.send(filters);
  //   } catch (error) {
  //     console.log(error);
  //     res.send({ error });
  //   }
  // } else {
  //   try {
  //     const filters = await callLogModel.aggregate([
  //       { $match: { uid, ...finalFilters } },
  //       group,
  //     ]);

  //     let singleArray = [];
  //     let finalFilterSorted = {};

  //     Object.keys(filters[0]).forEach((key) => {
  //       if (key != "_id") {
  //         const val = filters[0][key].sort();
  //         finalFilterSorted[key] = val;

  //       }
  //     });
  //     singleArray.push(finalFilterSorted);
  //     res.send(singleArray);
  //     // res.send(filters);
  //   } catch (error) {
  //     console.log(error);
  //     res.send({ error });
  //   }
  // }
  
  if(role === false){
    try {
       let filters;
      if(teamUids.length > 0){
        filters = await callLogModel.aggregate([
          { $match: { uid:{$in:teamUids}, ...finalFilters } },
          group,
        ]);
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
      }else{
        filters = await callLogModel.aggregate([
          { $match: { uid, ...finalFilters } },
          group,
        ]);
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
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
      console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
      return res.send(singleArray);
      // res.send(filters);
    } catch (error) {
      console.log(error);
      return res.send({ error });
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
          const filters = await callLogModel.aggregate([
            { $match: { organization_id,transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
            group,
          ]);
          let query1 = new Date();
          let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
          console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
  
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
          console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
          return res.send(singleArray);
          // res.send(filters);
        } catch (error) {
          console.log(error);
          return res.send({ error });
        }
      } else {
        // let usersList = await getBranchUsers(uid, organization_id, permission);
        const users = await userModel.find({organization_id:organization_id,branch: { $in: permission }},{uid:1});
        let usersList = [];
        users.forEach(user => {
          usersList.push(user.uid);
        })
        try {
          const filters = await callLogModel.aggregate([
            { $match: { uid: { $in: usersList },transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
            group,
          ]);

          let query1 = new Date();
          let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
          console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
  
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
          console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
          return res.send(singleArray);
          // res.send(filters);
        } catch (error) {
          console.log(error);
          return res.send({ error });
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
        const filters = await callLogModel.aggregate([
          { $match: { uid: { $in: usersList },transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
          group,
        ]);

        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
  
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
        console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    } else {
      try {
        const filters = await callLogModel.aggregate([
          { $match: { uid,transfer_status:false,"stage": { $nin: ["LOST", "NOT INTERESTED"] }, ...finalFilters } },
          group,
        ]);
        
        let query1 = new Date();
        let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
        console.log(`api endpoint - /callLogs/filterValues, time taken for aggregate, ${timeTakenQuery1}`);
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
        console.log(`api endpoint - /callLogs/filterValues, time taken overall, ${timeTakenOverall}`);
        return res.send(singleArray);
        // res.send(filters);
      } catch (error) {
        console.log(error);
        return res.send({ error });
      }
    // }
  }}
};

module.exports = callLogController;
