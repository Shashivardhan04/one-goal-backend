var ObjectId = require('mongoose').Types.ObjectId;
const newsModel = require('../models/newsSchema');

const newsController = {};

newsController.Insert = async (req, res) => {
  try{
      const { organization_id, name, link } = req.body;
      const query = {
        organization_id: organization_id,
      };

      let newsData = {
        name,
        link,
        created_at: new Date(),
      }

      const update = {
        $push: { news:  newsData},
      };
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const updatedDocument = await newsModel.findOneAndUpdate(query, update, options);
      return res.status(200).json({"success": true,data:updatedDocument,message:"News link added successfully"});
    }catch(err){
      console.log("aman err",err);
      return res.status(400).json({"success": false,"error":err,message:"News link couldn't be added"});
    }
};

newsController.Update = async (req, res) => {
  try{
      const { organization_id, news } = req.body;
      const query = {
        organization_id: organization_id,
      };
      
      const update = { news:  news ? news : []}
      
      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      };
      const updatedNewsData = await newsModel.findOneAndUpdate(query, update, options);
      return res.status(200).json({"success": true,data:updatedNewsData});
    }catch(err){
      console.log("error",err)
      return res.status(400).json({"success": false,"error":err});
    }
};

newsController.FetchAll = async (req, res) => {
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid Parameters",
        error: "Organization Required",
      });
    }

    const data = await newsModel
      .findOne({ organization_id: organization_id })

    return res.status(200).json({
      success: true,
      message: "Fetched All News",
      data: data ? data : [],
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.catchError,
      error: error.message,
    });
  }
};

module.exports = newsController;
