const teamModel = require('../models/teamSchema');

const teamController = {};

teamController.Insert = async (req, res) => {
  const newteam = new teamModel({
    organization_id: req.body.organization_id,
    team_name: req.body.team_name,
  });
  const result = await newteam.save();
  console.log('inserted new team');
  return result._id;
};

module.exports = teamController;
