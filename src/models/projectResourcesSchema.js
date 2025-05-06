const mongoose = require('mongoose');

const projectResourcesSchema = new mongoose.Schema({

  organization_id: {
    type: String,
    default: "",
    required: true
  },
  project_id: {
    type: String,
    default: "",
    required: true
  },
  project_name: {
    type: String,
    default: ""
  },
  images: {
    type: Array,
    default: []
  },
  videos: {
    type: Array,
    default: []
  },
  brochures: {
    type: Array,
    default: []
  },
  pricelists: {
    type: Array,
    default: []
  },
  layouts: {
    type: Array,
    default: []
  },
  forms: {
    type: Array,
    default: []
  },
  project_description: {
    type: String,
    default: ""
  },
  project_map_url: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
})

const projectResoModel = mongoose.model(
  'projectResources',
  projectResourcesSchema
);

module.exports = projectResoModel;
