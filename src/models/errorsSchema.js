const mongoose = require('mongoose');

const errorsSchema = new mongoose.Schema(
  {
    api: { type: 'String', default: '' },
    error: Object,
  },
  { timestamps: true }
);

const newError = mongoose.model('errors', errorsSchema);

module.exports = newError;
