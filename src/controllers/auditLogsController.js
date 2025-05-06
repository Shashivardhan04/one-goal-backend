var ObjectId = require('mongoose').Types.ObjectId;
const auditLogsModel = require('../models/auditLogsSchema.js');
const admin = require("../../firebaseAdmin.js");

const auditLogsController = {};

auditLogsController.createExportLogs = async (req, res) => {
  try{
    let data = req.body;
    const newExportLog = await new auditLogsModel({
        uid:data.uid,
        user_email:data.user_email,
        user_first_name:data.user_first_name,
        user_last_name:data.user_last_name,
        created_at: Date.now(),
        total_count:data.total_count,
        type:data.type,
        organization_id:data.organization_id,
        operation_type:data.operation_type,
        description:data.description
    })
    await newExportLog.save()
    res.status(200).json({success:true,message:"Export Log Created"})
  }catch(err){
    console.log(err);
    res.status(400).json({success:false,message:"Failed To Create Export Log"});
  }
};

auditLogsController.fetchExportLogs = async (req, res) => {
    let data = req.body;
    if(data.organization_id){
      try{
        let query;
        if(data.operation_type){
           query = {
            organization_id: data.organization_id,
            operation_type: data.operation_type
          };
        }else{
          query = {
            organization_id: data.organization_id
          };
        }  
        const result = await auditLogsModel.find(query).sort({ created_at: -1 });
        return res.status(200).json({"success": true,data:result});
      }catch(err){
        return res.status(400).json({"success": false,"message":"Failed To Fetch Export Logs"});
      }
    }else{
      return res.status(400).json({"success": false,"message":"some fields are missing"});
    }
};

module.exports = auditLogsController;
