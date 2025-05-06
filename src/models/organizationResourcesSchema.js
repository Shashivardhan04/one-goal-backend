const mongoose = require('mongoose');

const organResourcesSchema = new mongoose.Schema({
  organization_id: {
    type: String,
    // required: true
  },
  resource_type: {
    type: String,
    enum: [
      "custom_templates", "budgets", "carousel", "comTypes", "leadSources",
      "locations", "permission", "industrialTypes", "institutionalTypes", "states",
      "resTypes", "apiForms", "transferReasons", "businessVertical"
    ],
    default: "permission"
  },
  custom_templates: [{
    template_name: { type: String, default: "" },
    template_data: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  budgets: [{
    budget: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  carousel: [{
    imageType: { type: String, enum: ["IMAGE", "LOGO"], default: "IMAGE" },
    url: { type: String, default: "" },
    imageName: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  comTypes: [{
    comType: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  leadSources: [{
    leadSource: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  locations: [{
    location: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  permission: {
    type: Object,
    default: {}
  },
  industrialTypes: [{
    industrialType: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  institutionalTypes: [{
    institutionalType: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  states: [{
    state: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  resTypes: [{
    resType: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  apiForms: [{
    apiForm: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  transferReasons: [{
    transferReason: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }],
  businessVertical: [{
    businessVertical: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
  }]
});

// Middleware to remove irrelevant fields before saving
organResourcesSchema.pre('save', function (next) {
  const resourceTypes = [
    "custom_templates", "budgets", "carousel", "comTypes", "leadSources",
    "locations", "permission", "industrialTypes", "institutionalTypes", "states",
    "resTypes", "apiForms", "transferReasons", "businessVertical"
  ];

  resourceTypes.forEach(type => {
    if (this.resource_type !== type) {
      this[type] = undefined;
    }
  });

  next();
});


const neworganResources = mongoose.model(
  'organizationresources',
  organResourcesSchema
);

module.exports = neworganResources;
