const branchModel = require('../models/branchSchema');

const branchController = {};

branchController.Insert = async (req, res) => {
  const newbranch = new branchModel({
    organization_id: req.body.organization_id,
    branch_name: req.body.branch_name,
  });
  const result = await newbranch.save();
  console.log('inserted new branch');
  return result._id;
};

module.exports = branchController;
