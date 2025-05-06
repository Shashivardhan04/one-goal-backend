var ObjectId = require('mongoose').Types.ObjectId;
const faqModel = require('../models/faqSchema');

const faqController = {};

faqController.Create = async (req, res) => {
  try {
    const { organization_id, question,answer, created_by, modified_by } = req.body;
    if (!organization_id || !question || !answer || !created_by || !modified_by) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const faq = await faqModel.create({
      organization_id,
      question,
      answer,
      created_by,
      modified_by
    });
    // res.status(201).json(apiToken);
    return res.status(201).json({
      success: true,
      message: "FAQ created successfully"
    });
  } catch (error) {
    // res.status(400).json({ error: error.message });
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
}

faqController.FetchAll = async (req, res) => {
  try {
    const { organization_id} = req.query;
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        error: "Missing required parameters",
      });
    }

    let sort = {created_at:-1}
    const faqData = await faqModel.find({ organization_id: organization_id }, { __v: 0 }).lean()
      .sort(sort)
    return res.status(200).json({
      success: true,
      message: "FAQs fetched successfully",
      data: faqData
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

faqController.Update = async (req, res) => {
  try {

    const updateData = req.body.data;
    updateData.modified_at = new Date();
    const id = req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const faq = await faqModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};

faqController.Delete = async (req, res) => {
  try {
    // console.log("req",req.params)
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    const deletedFAQ = await faqModel.findByIdAndDelete(id);
    if (!deletedFAQ) {
      return res.status(400).json({
        success: false,
        message: "FAQ not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occured, Please try again",
      error: error.message,
    });
  }
};


module.exports = faqController;
