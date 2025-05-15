const mongoose = require("mongoose");

const organResourcesSchema = new mongoose.Schema(
  {
    organization_id: { type: String },

    resource_type: {
      type: String,
      enum: [
        "custom_templates",
        "budgets",
        "carousel",
        "comTypes",
        "leadSources",
        "locations",
        "permission",
        "industrialTypes",
        "institutionalTypes",
        "states",
        "resTypes",
        "apiForms",
        "transferReasons",
        "businessVertical",
      ],
      default: "permission",
    },

    custom_templates: [
      {
        template_name: { type: String, default: "" },
        template_data: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    budgets: [
      {
        budget: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    carousel: [
      {
        imageType: { type: String, enum: ["IMAGE", "LOGO"], default: "IMAGE" },
        url: { type: String, default: "" },
        imageName: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    comTypes: [
      {
        comType: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    leadSources: [
      {
        leadSource: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    locations: [
      {
        location: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    permission: { type: Object, default: {} },

    industrialTypes: [
      {
        industrialType: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    institutionalTypes: [
      {
        institutionalType: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    states: [
      {
        state: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    resTypes: [
      {
        resType: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    apiForms: [
      {
        apiForm: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    transferReasons: [
      {
        transferReason: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],

    businessVertical: [
      {
        businessVertical: { type: String, default: "" },
        modified_by: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp naming
  }
);

// Middleware to remove irrelevant fields before saving
organResourcesSchema.pre("save", function (next) {
  const resourceTypes = [
    "custom_templates",
    "budgets",
    "carousel",
    "comTypes",
    "leadSources",
    "locations",
    "permission",
    "industrialTypes",
    "institutionalTypes",
    "states",
    "resTypes",
    "apiForms",
    "transferReasons",
    "businessVertical",
  ];

  resourceTypes.forEach((type) => {
    if (this.resource_type !== type) {
      this[type] = undefined;
    }
  });

  next();
});

const neworganResources = mongoose.model(
  "organizationresources",
  organResourcesSchema
);

module.exports = neworganResources;
