const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
       organization_id: { type: String, default: '', required: true },
       created_at: { type: Date, default: Date.now },
       modified_at: { type: Date, default: Date.now },
       created_by: { type: String, default: ''},
       modified_by: { type: String, default: '' },
       question: { type: String, default: '', required: true },
       answer: { type: String, default: '', required: true },
});

const FAQ = new mongoose.model('faq', faqSchema);

module.exports = FAQ;
