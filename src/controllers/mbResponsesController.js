const axios= require("axios");
const { v4: uuidv4 } = require('uuid');
const mbmobileutilityURL=process.env.MOBILE_UTILITY_URL
const {encryptautoLogin}=require("../constants/constants")
const {decryptautoLogin}=require("../constants/constants.js")
const leadModel = require("../models/leadsSchema");

const mbResponsesController={};

const genUUID=()=>{
    return uuidv4()
};

const getDateRange = (startDay, startMonthOffset, endDay, endMonthOffset) => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() + startMonthOffset, startDay, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth() + endMonthOffset, endDay, 23, 59, 59);
    return {
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    };
  };

mbResponsesController.responses=async(req,res)=>{
    try {
        const url=`${mbmobileutilityURL}/mmb/responses`

        // Define the hardcoded headers
        const headers = {
          'AppVersion': '518',
          'campCode': 'android',
          'X-Api-Client': 'mb_android_app',
          'autoId': genUUID(),
          'User-Agent': 'android',
          'Host': 'api.magicbricks.com',
          'Content-Type': 'application/json',
        };
    
        // Make the POST request
        const response = await axios.post(url, req.body, { headers });
       let data=response.data;
       if (data.responses){data.responses.forEach((val)=>{
        return val["mbLeadRfnum"]=encryptautoLogin(val.mbLeadRfnum)
       })}

        return res.status(200).send(data);
        
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occurred",
            error: error.message,
          });
    }
}



mbResponsesController.count = async (req, res) => {
    const now = new Date();
    try {
    const url=`${mbmobileutilityURL}/mmb/responses`
      const headers = {
        'AppVersion': '518',
        'campCode': 'android',
        'X-Api-Client': 'mb_android_app',
        'autoId': genUUID(),
        'User-Agent': 'android',
        'Host': 'api.magicbricks.com',
        'Content-Type': 'application/json',
      };
  
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonthIndex = now.getMonth();
      const currentYear = now.getFullYear();
      const currentDay = now.getDate();
  
      const getEpoch = (date) => new Date(date).getTime();
  
      // Define date ranges
      const dateRanges = [
        { // Current month
          startDate: getEpoch(new Date(currentYear, currentMonthIndex, 1)),
          endDate: now.getTime(),
        },
        { // Last month
          startDate: getEpoch(new Date(currentYear, currentMonthIndex - 1, 1)),
          endDate: getEpoch(new Date(currentYear, currentMonthIndex, 0, 23, 59, 59, 999)),
        },
        { // Two months ago
          startDate: getEpoch(new Date(currentYear, currentMonthIndex - 2, 1)),
          endDate: getEpoch(new Date(currentYear, currentMonthIndex - 1, 0, 23, 59, 59, 999)),
        },
        { // Three months ago (starting from today's date if valid)
          startDate: getEpoch(new Date(currentYear, currentMonthIndex - 3, currentDay)),
          endDate: getEpoch(new Date(currentYear, currentMonthIndex - 3 + 1, 0, 23, 59, 59, 999)),
        },
      ];
  
      // Calculate corresponding month names
      const monthNames = [
        months[currentMonthIndex], // Current month
        months[(currentMonthIndex - 1 + 12) % 12], // Last month
        months[(currentMonthIndex - 2 + 12) % 12], // Two months ago
        months[(currentMonthIndex - 3 + 12) % 12], // Three months ago
      ];
  
      // Fetch data for each date range
      const counts = await Promise.all(
        dateRanges.map(async (range, index) => {
          const requestBody = {
            page: "0",
            pagesize: "20",
            uids: req.body.uids || [], // Defaulting to empty array if not provided
            userType: req.body.userType || "A", // Defaulting to "A" if not provided
            startDate: range.startDate,
            endDate: range.endDate,
          };
  
          const response = await axios.post(url, requestBody, { headers });
          const totalCount = response.data.totalCount || 0;
  
          return { [monthNames[index]]: totalCount };
        })
      );
  
      // Combine the results into a single object
      const result = Object.assign({}, ...counts);
  
      return res.status(200).send(result);
  
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "An error occurred",
        error: error.message,
      });
    }
  };



mbResponsesController.propresponses=async(req,res)=>{
    try {
        const url=`${mbmobileutilityURL}/mmb/properties/responses`

        // Define the hardcoded headers
        const headers = {
          'AppVersion': '518',
          'campCode': 'android',
          'X-Api-Client': 'mb_android_app',
          'autoId': genUUID(),
          'User-Agent': 'android',
          'Host': 'api.magicbricks.com',
          'Content-Type': 'application/json',
        };
    
        // Make the POST request
        const response = await axios.post(url, req.body, { headers });
      let data=response.data;
    if (data.responses){data.responses.forEach((val)=>{
        val.propRes.forEach((value)=>{
            return value["mbLeadRfnum"]=encryptautoLogin(value.mbLeadRfnum)
           })
       })}
        return res.status(200).send(data);
        
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occurred",
            error: error.message,
          });
    }
}

mbResponsesController.companyresponses=async(req,res)=>{
    try {
        const url=`${mbmobileutilityURL}/mmb/responses/others`

        // Define the hardcoded headers
        const headers = {
          'AppVersion': '518',
          'campCode': 'android',
          'X-Api-Client': 'mb_android_app',
          'autoId': genUUID(),
          'User-Agent': 'android',
          'Host': 'api.magicbricks.com',
          'Content-Type': 'application/json',
        };
    
        // Make the POST request
        const response = await axios.post(url, req.body, { headers });
      let data=response.data;
    if (data.responses){data.responses.forEach((val)=>{
        return val["mbLeadRfnum"]=encryptautoLogin(val.mbLeadRfnum)
       })}
        return res.status(200).send(data);
        
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occurred",
            error: error.message,
          });
    }
}

mbResponsesController.subuserresponses=async(req,res)=>{
    try {
        const url=`${mbmobileutilityURL}/mmb/subusers`

        // Define the hardcoded headers
        const headers = {
          'AppVersion': '518',
          'campCode': 'android',
          'X-Api-Client': 'mb_android_app',
          'autoId': genUUID(),
          'User-Agent': 'android',
          'Host': 'api.magicbricks.com',
          'Content-Type': 'application/json',
        };
    
        // console.log("req.body",req.body)
        // Make the POST request
        const response = await axios.post(url, req.body, { headers });
    //   console.log("response5555",response.data)
        return res.status(200).send(response.data);
        
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occurred",
            error: error.message,
          });
    }
}

mbResponsesController.fetchLeadByMB = async (req, res) => {
    const Id = req.query.contact_id;
    const owner = req.query.uid
    // console.log("req.query.contact_id",Id)
    // console.log("req.query.owner",owner)
    if(Id){
      try{
        
        const decryptContId=decryptautoLogin(Id);
        // console.log("decryptContId",decryptContId)
        const result = await leadModel.findOne({ mb_contact_id: decryptContId,uid:owner,transfer_status:false })
        let msg
        let ress
        if(result){
            ress= result
        }else{
            ress = await leadModel.findOne({ mb_contact_id: decryptContId,uid:owner,transfer_status:true })
        }
        return res.status(200).json({"success": true,data:ress});
      }catch(err){
        console.log("lead fetching error",err)
        return res.status(200).json({"success": false,"error":err.message});
      }
    }else{
        return res.status(200).json({"success": false,"error":"contact_not found"});
    }
  };
  

module.exports = mbResponsesController