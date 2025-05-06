const leadModel = require("../models/leadsSchema");
const admin = require("../../firebaseAdmin.js");
const projectResoucesModel = require('../models/projectResourcesSchema');
const organResourcesModel = require('../models/organizationResourcesSchema'); 
const userModel = require("../models/userSchema");
const moment = require("moment");
const projectsModel = require('../models/projectsSchema.js');

module.exports = {

  createMessageTemplate: async (req,res) => {
    
      try {
                const {leadId,project_id,template_id} = req.body;
                let projectsObj;

                const formatDateTime = (dateTimeString) => {
                  if (dateTimeString) {
                    const options = { year: 'numeric', month: 'short', day: 'numeric' };
                    
                    // Parse input date-time string using moment.js and convert to IST
                    const date = moment.utc(dateTimeString).utcOffset('+05:30');
                    
                    const formattedDate = date.format('ll'); // Using moment.js for formatting date
                    const formattedTime = date.format('hh:mm A'); // Using moment.js for formatting time
                
                    return `${formattedDate} at ${formattedTime}`;
                  } else {
                    return "";
                  }
                };

        if (!leadId || !template_id) {
            return res.status(400).json({
              success:false,
              error:"Some Fields are missing"
            });
        } 
        // else if (template_name = "" || (template_name = null)) {
        //     return res.send("template is not define");
        // }
        // finding lead from lead id 
        const lead = await leadModel.findOne({ Id: leadId }).lean();

        if (!lead) {
          return res.status(400).json({
            success:false,
            error:"lead data not found"
          });
          }
    
       const project= await projectResoucesModel.findOne({project_id:project_id}).lean();

      //  if (!project) {
      //   return res.status(400).json({
      //     success:false,
      //     error:"project not found"
      //   });
      // }
       // finding organization resource

       const organization= await organResourcesModel.findOne({organization_id:lead.organization_id,resource_type:"custom_templates"});

      //   if(!organization){
      //         return res.status(400).json({
      //           success:false,
      //           error:"organization not found"
      //         });
      // }
      
      const userData = await userModel.findOne({user_email:lead.contact_owner_email}).lean();
      const projectsData = await projectsModel.find({ organization_id: lead.organization_id }).lean();
      // console.log("projects",projectsData);
      projectsData.map(item => {
        if(item.project_id == project_id){
          projectsObj = item;
        }
      })

      let map={
        "Customer Name":"customer_name",
        "Project Name":"project_name",
        "Follow Up Time":"next_follow_up_date_time",
        "Project Map Link":"project_map_url",
        "Lead Owner Email": "contact_owner_email",
        "Lead Number": "lead_number",
        "Project Details": "project_description",
        "Lead Owner Name": "user_name",
        "Lead Owner Number": "user_number",
        "Project Address":"address",
      }
       
      let custom_template_array=organization.custom_templates;

      let template=custom_template_array.find((obj)=>{
               return obj._id==template_id;
      })

      let template_data=template.template_data;
      let leadDataObj = {
        ...lead,
        lead_number: lead.contact_no
      }
      let userDataObj = {};
      if(userData){
        userDataObj = {
          ...userData,
          user_name:`${userData.user_first_name} ${userData.user_last_name}`,
          user_number: userData.contact_no
        }
      }
      let obj={...leadDataObj,...project,...userDataObj,...projectsObj,next_follow_up_date_time:formatDateTime(lead.next_follow_up_date_time)};

      const replacedText = template_data.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const replacement =obj[map[key]] ? obj[map[key]] : "Not Mentioned"; // Trim the key to remove potential spaces
        return replacement !== undefined ? replacement : match;
    });

//       let resulted_array=[];
// custom_template_array.forEach((val)=>{
//          const replacedText=val.template_data.replace(/\{\{([^}]+)\}\}/g,(match,key)=>{
//               const replacement = obj[key];
//   return replacement !== undefined ? replacement : match;
//          });
         
//          resulted_array.push(replacedText);
// })
// const replacedText = template_data.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
//   return content; // Extracted content without the curly braces
// });
   return  res.status(200).json({
        success:true,
        data:replacedText
        
      })
 } catch (error) {
          return res.status(400).json({
         status:false,
           error:error.message
          })
        }
    },
    fetchTemplates: async (req,res) => {
      try {
        const {organization_id} = req.body;
        const extractFields = (arr) => {
          return arr.map(item => {
              return {
                  label: item.template_name,
                  value: item._id
              };
          });
      }
        if (!organization_id) {
            return res.status(400).json({
              success:false,
              error:"Some fields are missing"
            });
        } 
       const organizationResourceData = await organResourcesModel.findOne({organization_id:organization_id,resource_type:"custom_templates"});

        if(!organizationResourceData){
              return res.status(400).json({
                success:false,
                error:"No data found"
              });
        }
        let templatesArray = organizationResourceData.custom_templates ? organizationResourceData.custom_templates : [];
        let modifiedTemplateOptions = extractFields(templatesArray);
      return  res.status(200).json({
        success:true,
        data:modifiedTemplateOptions

      })
 } catch (error) {
          return res.status(400).json({
            success:false,
            error:error
          })
        }
    }
}