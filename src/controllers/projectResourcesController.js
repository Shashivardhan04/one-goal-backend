var ObjectId = require('mongoose').Types.ObjectId;

const projectResoucesModel = require('../models/projectResourcesSchema');
const userAuthorizationModel = require('../models/userAuthorizationSchema.js');

module.exports = {

  AddAttachment: async (req, res) => {
    try {
      const { project_id, organization_id, attachment, resource_type } = req.body;
      let update;
      if (resource_type === "images") {
        update = {
          $push: {
            images: {
              ...attachment,
              created_at: new Date()
            }
          },
        };
      }
      else if (resource_type === "videos") {
        update = {
          $push: {
            videos: {
              ...attachment,
              created_at: new Date()
            }
          },
        };
      }
      else if (resource_type === "brochures") {
        update = {
          $push: {
            brochures: {
              ...attachment,
              created_at: new Date()
            }
          },
        };
      }
      else if (resource_type === "pricelists") {
        update = {
          $push: {
            pricelists: {
              ...attachment,
              created_at: new Date()
            }
          },
        };
      }
      else if (resource_type === "layouts") {
        update = {
          $push: {
            layouts: {
              ...attachment,
              created_at: new Date()
            }
          },
        };
      }
      else if (resource_type === "forms") {
        update = {
          $push: {
            forms: {
              ...attachment,
              created_at: new Date()
            }
          },
        };
      }
      const query = {
        organization_id,
        project_id,
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      await projectResoucesModel.findOneAndUpdate(query, update, options);
      return res.status(200).json({
        success: true,
        message: "Project resource added",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "An error occured, Please try again",
        error: error.message,
      });
    }
  },
  RemoveAttachment: async (req, res) => {
    try {
      const { project_id, organization_id, attachment, resource_type } = req.body;
      const query = {
        organization_id,
        project_id,
      };
      let attachments = await projectResoucesModel.findOne(query);
      let updatedAttachments = attachments[resource_type].filter((item) => {
        return item.link !== attachment.link;
      })
      let update;
      if (resource_type === "images") {
        update = {
          images: updatedAttachments
        };
      }
      else if (resource_type === "videos") {
        update = {
          videos: updatedAttachments
        };
      }
      else if (resource_type === "brochures") {
        update = {
          brochures: updatedAttachments
        };
      }
      else if (resource_type === "pricelists") {
        update = {
          pricelists: updatedAttachments
        };
      }
      else if (resource_type === "layouts") {
        update = {
          layouts: updatedAttachments
        };
      }
      else if (resource_type === "forms") {
        update = {
          forms: updatedAttachments
        };
      }
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      await projectResoucesModel.findOneAndUpdate(query, update, options);
      return res.status(200).json({
        success: true,
        message: "Project resource deleted",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "An error occured, Please try again",
        error: error.message,
      });
    }
  },

  Update: async (req, res) => {
    try {
      const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
      if (userPreference && userPreference.project_attachments_create_approved === false) {
        return res.status(400).json({ success: false, message: "You are not allowed to add attachment . Please contact your admin" });
      }
      const { organization_id, project_id } = req.body;

      if (!organization_id || !project_id) {
        return res.status(400).json({
          success: false,
          error: "Some fields are missing"
        });
      }
      const query = {
        organization_id: organization_id,
        project_id: project_id
      }

      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const project = await projectResoucesModel.findOne(query);

      if (project) {
        let obj = { ...req.body };

        delete obj.project_id;
        const update = {
          $set: obj
        }

        const updatedProject = await projectResoucesModel.findOneAndUpdate(query, update, options);

        return res.status(200).json({
          success: true,
          message: "Project resource added",
          data: updatedProject
        });
      } else {

        const project = await projectResoucesModel.create(req.body);
        return res.status(200).json({
          success: true,
          message: "Project resource added",
          data: project
        });

      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "An error occured, Please try again",
        error: error.message,
      });
    }
  },
  Delete: async (req, res) => {
    try {
      const userPreference = await userAuthorizationModel.findOne({ uid: req.body.userAuthorizationId });
      if (userPreference && userPreference.project_attachments_delete_approved === false) {
        return res.status(400).json({ success: false, message: "You are not allowed to delete attachment . Please contact your admin" });
      }
      const { project_id } = req.body;
      if (!project_id) {
        return res.status(400).json({
          success: false,
          error: "Some fields are missing"
        });
      }

      let obj = { ...req.body };


      delete obj.project_id;
      //  console.log(obj);



      const project = await projectResoucesModel.findOneAndUpdate({ project_id: project_id }, { $unset: obj });



      return res.status(200).json({ success: true, data: project });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error
      })
    }
  },

  GetData: async (req, res) => {
    try {
      const { project_id, organization_id } = req.body;

      if (!project_id || !organization_id) {
        return res.status(400).json({
          success: false,
          error: "Some fields are missing"
        });
      }

      let query = {
        organization_id,
        project_id
      }
      const project = await projectResoucesModel.findOne(query);
      return res.status(200).json({
        success: true,
        message: "Project resources fetched successfully",
        data: project
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "An error occured, Please try again",
        error: error.message,
      });
    }
  }


}
