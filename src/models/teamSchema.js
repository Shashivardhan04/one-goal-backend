const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema(
  {
    team_name: { type: String, default: '' },
    organization_id: { type: String, default: '' },
  },
  { timestamps: true }
);

const newteam = mongoose.model('teams', TeamSchema);
module.exports = newteam;
