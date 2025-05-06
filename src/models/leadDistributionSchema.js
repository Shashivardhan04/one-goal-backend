const mongoose = require("mongoose");

const LeadDistributionSchema = new mongoose.Schema({
    organization_id: {
        type: String,
        required: true,
    },
    budget: {
        type: [String],
        default: [],
    },
    created_at: {
        type: Date,
        default:  Date.now,
    },
    location: {
        type: [String],
        default: [],
    },
    modified_at: {
        type: Date,
        default:  Date.now,
    },
    project: {
        type: [String],
        default: [],
    },
    property_type: {
        type: [String],
        default: [],
    },
    source: {
        type: [String],
        default: [],
    },
    users: {
        type: [String],
        required: true
    }
    ,
    api_forms: {
        type: [String],
        default: [],
    },
    current_index: {
        type: Number,
        default: 0
    },
    autoRotationEnabled:{
        type:String,
        enum:["ON","OFF"],
        default:"OFF"
    },
    autoRotationTime:{
        type:Number
    },
    returnLeadTo:{
        type:String,
        
    },
    requirement_type: {
        type: [String],
        default: [],
    },

});


const LeadDistributionModel = mongoose.model('LeadDistribution', LeadDistributionSchema);

module.exports = LeadDistributionModel;
