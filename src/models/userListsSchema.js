const mongoose = require('mongoose');

const userListSchema = new mongoose.Schema({}, { strict: false });

const userListModel = mongoose.model('newuserList', userListSchema);

module.exports = userListModel;
