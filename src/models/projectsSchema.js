const mongoose = require('mongoose');

const projectsSchema = new mongoose.Schema(
    {
        address: { type: String, default: '' },
        business_vertical: { type: String, default: '' },
        organization_id: { type: String, default: '', required: true },
        created_at: { type: Date, default: Date.now },
        modified_at: { type: Date, default: Date.now },
        created_by: { type: String, default: '', required: true  },
        modified_by: { type: String, default: '', required: true },
        developer_name: { type: String, default: '' },
        project_id: { type: String, default: '', required: true  },
        project_name: { type: String, default: '' },
        project_status: { type: String, default: '' },
        property_stage: { type: String, default: '' },
        property_type: { type: String, default: '' },
        rera_link: { type: String, default: '' },
        walkthrough_link: { type: String, default: '' },
        owner_name:{ type: String, default: '' },
        owner_contact_no:{ type: Number, default: '' },
        type : { type: String,enum:["NEW PROJECT","RENTAL","RESALE"], default: 'NEW PROJECT'},
        price :  { type: Number, default: 0 },
        unit_no :  { type: String, default: '' },
        project_image :  { type: String, default: '' },
        description : { type: String, default: '' },
        notify2:{type:Boolean,default:true}
    }
);

const projectsModel = new mongoose.model('projects', projectsSchema);

module.exports = projectsModel;
