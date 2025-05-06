const mongoose = require('mongoose');

const fcmSchema = new mongoose.Schema({}, { strict: false });

const newfcm = mongoose.model('newfcmTokens', fcmSchema);

module.exports = newfcm;
