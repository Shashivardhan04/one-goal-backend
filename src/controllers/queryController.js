const Query = require('../models/querySchema');

const queryController = {};

queryController.getQueries = async (req, res) => {
  const { user_id } = req.body;
  try {
    const queries = await Query.find({ user_id });
    if (!queries) {
      throw new Error('Please enter valid Id, No Document found');
    } else {
      return res.status(200).json({
        isValidExecution: true,
        query: queries,
      });
    }
  } catch (error) {
    return res.status(400).json({
      isValidExecution: false,
      error: error.message,
    });
  }
};

queryController.addQuery = async (req, res) => {
  const {
    mobile_no,
    organization_name,
    customer_name,
    customer_email_id,
    type_of_query,
    attachment,
    description,
    user_id,
  } = req.body;

  let queryObj;

  if (
    mobile_no &&
    organization_name &&
    customer_name &&
    customer_email_id &&
    type_of_query &&
    attachment &&
    description &&
    user_id
  ) {
    queryObj = new Query({
      user_id,
      mobile_no,
      organization_name,
      customer_name,
      customer_email_id,
      type_of_query,
      attachment,
      description,
      ticket_no: 0,
    });
  } else {
    return res.json({ message: 'All Fields are required' });
  }

  try {
    let size;
    await Query.countDocuments(async (err, count) => {
      if (err) {
        console.log(err);
        res.send({ err });
      } else {
        size = count;
        queryObj.ticket_no = size + 1;
        const savedObj = await queryObj.save();
        if (!savedObj) throw new Error('can not save object into db');

        return res.json({
          isValidExecution: true,
          query: savedObj,
        });
      }
    });
  } catch (error) {
    return res.json({
      isValidExecution: false,
      error: error.message,
    });
  }
};

module.exports = queryController;
