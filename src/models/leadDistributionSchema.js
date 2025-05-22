const mongoose = require("mongoose");

/**
 * 📊 Lead Distribution Schema
 * Defines the structure for managing lead distribution with validation and indexing.
 */
const LeadDistributionSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, trim: true },
    budget: { type: [String], default: [] },
    created_at: { type: Date, default: Date.now, immutable: true }, // Ensures created_at is immutable
    location: { type: [String], default: [] },
    modified_at: { type: Date, default: Date.now },
    project: { type: [String], default: [] },
    property_type: { type: [String], default: [] },
    source: { type: [String], default: [] },
    users: { type: [String], required: true },
    api_forms: { type: [String], default: [] },
    current_index: { type: Number, default: 0, min: 0 }, // Ensures non-negative index
    autoRotationEnabled: { type: String, enum: ["ON", "OFF"], default: "OFF" },
    autoRotationTime: { type: Number, min: 0 }, // Ensures time is positive
    returnLeadTo: { type: String, trim: true },
    requirement_type: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "modified_at" }, // Standardized timestamp naming
  }
);

/** 🚀 Indexing for efficient querying */
LeadDistributionSchema.index({ organization_id: 1 });

const LeadDistributionModel = mongoose.model(
  "LeadDistribution",
  LeadDistributionSchema
);

module.exports = LeadDistributionModel;
