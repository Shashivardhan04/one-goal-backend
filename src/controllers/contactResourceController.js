var ObjectId = require('mongoose').Types.ObjectId;
const contactResourcesModel = require('../models/contactResourcesSchema');

const contactResourceController = {};

contactResourceController.Insert = (req, res) => {
  const data = new contactResourcesModel(req.body);
  data.save();
  res.send('api Data inserted');
};

contactResourceController.Update = (req, res) => {
  //const result = await leadModel.find({ id: req.body.id });
  if (ObjectId.isValid(req.body.id)) {
    //res.send("true");
    const data = JSON.parse(JSON.stringify(req.body));
    const id = data.id;
    delete data.id;
    //const updateData=JSON.parse(JSON.stringify(req.body.data))
    contactResourcesModel
      .findOneAndUpdate({ _id: id }, { $set: data })
      .exec(function (err, result) {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send('Updation DONE!');
        }
      });
  } else {
    const data = JSON.parse(JSON.stringify(req.body));
    const id = data.id;
    delete data.id;
    //const updateData=JSON.parse(JSON.stringify(req.body.data))
    contactResourcesModel
      .findOneAndUpdate({ id: id }, { $set: data })
      .exec(function (err, result) {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send('Updation DONE!');
        }
      });
  }
};

module.exports = contactResourceController;
