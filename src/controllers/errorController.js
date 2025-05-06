const errorModel = require('../models/errorsSchema');

const errorController = {};

errorController.Insert = (object) => {
  const data = new errorModel({
    api: object.api,
    error: object.error,
  });
  data.save();
};

module.exports = errorController;
