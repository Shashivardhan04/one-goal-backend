const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  news: { type: Array, default: [] },
  organization_id: { type: String, required: true },
});

const newsModel = mongoose.model('news', newsSchema);

module.exports = newsModel;
