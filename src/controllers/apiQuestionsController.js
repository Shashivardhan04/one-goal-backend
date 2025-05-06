var ObjectId = require('mongoose').Types.ObjectId;
const apiQuestionsModel = require('../models/apiQuestionsSchema.js');

const apiQuestionsController = {};

apiQuestionsController.addApiQuestions = async (req, res) => {
  try{
    const data = new apiQuestionsModel(req.body);
    await data.save();
    res.send('api questions inserted');
  }catch(err){
    console.log(err);
    res.send({ err });
  }
};

apiQuestionsController.getApiQuestions = async (req, res) => {
  const id =req.body.id
  try{
      const data = await apiQuestionsModel.find({ leadId: id });
          res.json(data)
          
  }catch(err){
      console.log("Error is there",err)
  }
};

module.exports = apiQuestionsController;
