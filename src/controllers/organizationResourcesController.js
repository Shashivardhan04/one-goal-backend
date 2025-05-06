const organResourcesModel = require('../models/organizationResourcesSchema');
const organizationModel=require("../models/organizationSchema")
const { MESSAGES, ORG_RESOURCE } = require("../constants/constants");
const organizationController = require('./organizationController');
// const errorModel = require('../models/errorsSchema');
var ObjectId = require("mongoose").Types.ObjectId;
const {getTimeDifferenceInSeconds}=require("../constants/constants.js")

const organResourcesController = {};

// organResourcesController.Insert = (req, res) => {
//   const data = new organResourcesModel({
//     budgets: req.body.budgets,
//     carousel: req.body.carousel,
//     comTypes: req.body.comTypes,
//     leadSources: req.body.leadSources,
//     locations: req.body.locations,
//     permission: req.body.permission,
//     projects: req.body.projects,
//     organization_id: req.body.organization_id,
//   });
//   data.save(function (err, doc) {
//     if (err) {
//       errorModel.Insert({ api: 'organization Resources/Create', error: err });
//       res.send(err);
//     } else {
//       console.log('Document inserted succussfully!');
//       res.send('organization resources created');
//     }
//   });
//   //res.send("in organ resou insert")
// };

// organResourcesController.Update = (req, res) => {
//   const updateData = req.body;
//   organResourcesModel
//     .findOneAndUpdate(
//       { organization_id: updateData.organization_id },
//       { $set: updateData }
//     )
//     .exec(function (err, result) {
//       if (err) {
//         errorModel.Insert({
//           api: 'organizationResources/updateData',
//           error: err,
//         });
//         console.log(err);
//         res.status(500).send(err);
//       } else {
//         res.status(200).send('Updation DONE!');
//       }
//     });
//   //res.send("in update orga reso")
// };

organResourcesController.Insert = async (req, res) => {
  try {
    let organization_id = req.body.organization_id;
    let custom_template = req.body.custom_template;
    if (!organization_id || !custom_template) {
      return res.status(400).json({ "success": false, "error": "Some fields are missing" });
    }
    // const organizationResource = new organResourcesModel({
    //   custom_templates: req.body.custom_templates,
    //   organization_id: req.body.organization_id,
    // });
    // const data = await organizationResource.save()
    // return res.status(200).json({"success": true,data:data});
    const query = {
      organization_id: organization_id,
    };

    const organizationResources = await organResourcesModel.findOne(query);
    if (organizationResources) {
      let custom_templates = organizationResources.custom_templates ? organizationResources.custom_templates : [];
      let templateNameExists = false;
      custom_templates.map(item => {
        if (item.template_name == custom_template.template_name) {
          templateNameExists = true;
        }
      })
      if (templateNameExists) {
        return res.status(400).json({ "success": false, "error": "Template with the same name already exists" });
      }
    }

    let newId = new ObjectId().toString()
    custom_template_with_id = {
      ...custom_template,
      Id: newId
    }

    const update = {
      $push: { custom_templates: custom_template_with_id },
    };
    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    };
    const updatedDocument = await organResourcesModel.findOneAndUpdate(query, update, options);
    return res.status(200).json({ "success": true, data: updatedDocument });
  } catch (err) {
    return res.status(400).json({ "success": false, "error": err });
  }
};

organResourcesController.Update = async (req, res) => {
  try {
    let organization_id = req.body.organization_id;
    let custom_template = req.body.custom_template;
    let modified_custom_templates;
    if (!organization_id || !custom_template) {
      return res.status(400).json({ "success": false, "error": "Some fields are missing" });
    }
    // const organizationResource = new organResourcesModel({
    //   custom_templates: req.body.custom_templates,
    //   organization_id: req.body.organization_id,
    // });
    // const data = await organizationResource.save()
    // return res.status(200).json({"success": true,data:data});
    const query = {
      organization_id: organization_id,
    };

    const organizationResources = await organResourcesModel.findOne(query);
    if (organizationResources) {
      let custom_templates = organizationResources.custom_templates ? organizationResources.custom_templates : [];
      // let templateExists = false;
      modified_custom_templates = custom_templates.map((item) => {
        if (item.Id == custom_template.Id) {
          return item = custom_template
        }
        return item;
      })
      // if(templateExists){
      //   return res.status(400).json({"success": false,"error":"Template with the same name already exists"});
      // }
    }

    const update = {
      custom_templates: modified_custom_templates,
    };
    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    };
    const updatedDocument = await organResourcesModel.findOneAndUpdate(query, update, options);
    return res.status(200).json({ "success": true, data: updatedDocument });
  } catch (err) {
    return res.status(400).json({ "success": false, "error": err });
  }
};

organResourcesController.Get = async (req, res) => {
  try {
    let organization_id = req.body.organization_id;
    if (!organization_id) {
      return res.status(400).json({ "success": false, "error": "Some fields are missing" });
    }
    let query = {
      organization_id: organization_id,
    };
    let organizationResources = await organResourcesModel.findOne(query);
    return res.status(200).json({ "success": true, data: organizationResources });
  } catch (err) {
    return res.status(400).json({ "success": false, "error": err });
  }
};

organResourcesController.Delete = async (req, res) => {
  try {
    let organization_id = req.body.organization_id;
    let custom_template = req.body.custom_template;
    if (!organization_id || !custom_template) {
      return res.status(400).json({ "success": false, "error": "Some fields are missing" });
    }
    const query = {
      organization_id: organization_id,
    };
    let organizationResources = await organResourcesModel.findOne(query);
    let customTemplatesArray = organizationResources.custom_templates ? organizationResources.custom_templates : [];
    let updatedCustomTemplates = customTemplatesArray.filter((item) => {
      return item.Id !== custom_template.Id;
    })
    const update = { custom_templates: updatedCustomTemplates }

    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    };
    const updatedDocument = await organResourcesModel.findOneAndUpdate(query, update, options);
    return res.status(200).json({ "success": true, data: updatedDocument });
  } catch (err) {
    console.log("error", err)
    return res.status(400).json({ "success": false, "error": err });
  }
};

//////////////////////organization resources collection migration from firebase to mongodb /////////////////////////

organResourcesController.createResource = async (req, res) => {
  try {
    const { organization_id, resource_type } = req.body;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        error: "organization_id required"
      });
    }

    if (!ORG_RESOURCE.includes(resource_type)) {
      return res.status(400).json({
        success: false,
        message: "invalid resource",
        error: "invalid resource"
      });
    }

    if (resource_type == "leadSources") {
      let isExists = false;
      const resource = await organResourcesModel.findOne({
        organization_id: organization_id,
        resource_type: resource_type
      });
      if(resource && resource.leadSources.length > 0){
        resource.leadSources.map(leadSource => {
          if(leadSource.leadSource == req.body.leadSources[0].leadSource){
            isExists = true;
          }
        })
      }
      if(isExists){
        return res.status(400).json({
          success: false,
          message: "Lead source exists already",
          error: "Lead source exists already",
        });
      }
    }

    // return res.send("ehufrqen");

    const check = await organResourcesModel.findOne({
      $and: [
        { organization_id: organization_id },
        { resource_type: resource_type }
      ]
    });

    if (check) {
      let data = req.body
      // return res.send(data[resource_type][0]);
      const updateObject = {};
      updateObject[resource_type] = data[resource_type][0];
      // return res.send(updateObject)
      const result = await organResourcesModel.findByIdAndUpdate({ _id: check._id }, { $push: updateObject }, { new: true })
    } else {

      let data = req.body;

      const result = await organResourcesModel.create(data);
    }



    return res.status(201).json({
      success: true,
      message: `${resource_type} created successfully`
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
}


organResourcesController.updateOrg= async(req,res)=>{
  try {

    const { organization_id, resource_type ,Id} = req.body;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        error: "organization_id required"
      });
    }

    if (resource_type == "leadSources") {
      let isExists = false;
      const resource = await organResourcesModel.findOne({
        organization_id: organization_id,
        resource_type: resource_type
      });
      if(resource && resource.leadSources.length > 0){
        resource.leadSources.map(leadSource => {
          if(leadSource.leadSource == req.body.leadSources[0].leadSource){
            isExists = true;
          }
        })
      }
      if(isExists){
        return res.status(400).json({
          success: false,
          message: "Lead source exists already",
          error: "Lead source exists already",
        });
      }
    }

    if(resource_type==="permission"){
       let obj={[`${resource_type}`]:req.body[`${resource_type}`]};

       let updateOrg= await organResourcesModel.findOneAndUpdate({  $and: [
        { organization_id: organization_id },
        { resource_type: resource_type }
      ]},{$set:obj})

      return res.status(200).json({
        success:true,
        message:`${resource_type} updated successfully`,
      })
    }

    if (!Id) {
      return res.status(400).json({
        success: false,
        message: "Id required",
        error: "Id required"
      });
    }

    if (!ORG_RESOURCE.includes(resource_type)) {
      return res.status(400).json({
        success: false,
        message: "invalid resource",
        error: "invalid resource"
      });
    }

    const check = await organResourcesModel.findOne({
      $and: [
        { organization_id: organization_id },
        { resource_type: resource_type }
      ]
    });

    if(!check){
      return res.status(400).json({
        success: false,
        message: `${resource_type} dosent exist`,
        error:  `${resource_type} dosent exist`
      });
    }

    const data=req.body;
 
    const updateQuery = {
      [`${resource_type}._id`]: Id,
      _id:check._id
    };

    const updateObject = {}; 
 
    Object.keys(data[resource_type][0]).forEach((val)=>{
         updateObject[`${resource_type}.$.${val}`]=data[resource_type][0][val]
    })

    // return res.json({
    //   data:updateObject,
    //   query:updateQuery
    // })

    const updateOrg= await organResourcesModel.updateOne(updateQuery,updateObject,{new:true})


    return res.status(200).json({
      success:true,
      message:`${resource_type} updated successfully`,
    })

  
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
}


organResourcesController.fetchAll=async(req,res)=>{
  try {
    let apiStart = new Date();
    let timeTakenOverall;
    const { organization_id} = req.query;

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "organization_id required",
      error: "organization_id required"
    });
  }

  const check= await  organizationModel.findOne({organization_id:organization_id},{organization_id: 1})
  let query1 = new Date();
  let timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart,query1);
  console.log(`api endpoint - /organizationResources/fetchAll, time taken for checking organizationCollection Query, ${timeTakenQuery1}`);

  if(!check){
    return res.status(400).json({
      success: false,
      message: "organization dosent exist",
      error:  "orgnaization dosent exist"
    });
  }

  const result= await organResourcesModel.find({organization_id:organization_id});
  let query2 = new Date();
  let timeTakenQuery2 = getTimeDifferenceInSeconds(apiStart,query2);
  console.log(`api endpoint - /organizationResources/fetchAll, time taken for organizationResource collection, ${timeTakenQuery2}`);


  let apiEnd = new Date();
  timeTakenOverall = getTimeDifferenceInSeconds(apiStart,apiEnd);
  console.log(`api endpoint - /organizationResources/fetchAll, time taken overall, ${timeTakenOverall}`);

  return res.status(200).json({
    success:true,
    message:"organization resources fetched successfully",
    data:result
  })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
}


organResourcesController.deleteResource=async(req,res)=>{
try {
  const { organization_id,resource_type,Id} = req.body;

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "organization_id required",
      error: "organization_id required"
    });
  }

  const check = await organResourcesModel.findOne({
    $and: [
      { organization_id: organization_id },
      { resource_type: resource_type }
    ]
  });

    if(!check){
      return res.status(400).json({
        success: false,
        message: "resource dosent exist",
        error:  "resource dosent exist"
      });
    }

    let updateObj={[resource_type]:{_id:Id}};

    const deleteRes= await organResourcesModel.findByIdAndUpdate({
      _id:check._id
    },
   {
     $pull:updateObj
   }
  )
  
  return res.status(200).json({
    success: true,
    message: `${resource_type} deleted successfully`
  });

} catch (error) {
  return res.status(400).json({
    success: false,
    message: MESSAGES.catchError,
    error: error.message,
  });
}
}



module.exports = organResourcesController;
