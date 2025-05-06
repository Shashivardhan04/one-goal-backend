const countModel = require('../models/leadsSchema');

const countController = {};

countController.Count = async (req, res) => {
  const uid = req.body.uid;
  var intCount = 0;
  var nonintCount = 0;
  var callbackCount = 0;
  var wonCount = 0;
  var lostCount = 0;
  var freshCount = 0;
  const result = await countModel.find({ uid: uid });
  result.forEach((con) => {
    if (con.stage == 'INTERESTED') {
      intCount = intCount + 1;
    }
    if (con.stage == 'NOT INTERESTED') {
      nonintCount = nonintCount + 1;
    }
    if (con.stage == 'CALLBACK') {
      callbackCount = callbackCount + 1;
    }
    if (con.stage == 'WON') {
      wonCount = wonCount + 1;
    }
    if (con.stage == 'LOST') {
      lostCount = lostCount + 1;
    }
    if (con.stage == 'FRESH') {
      freshCount = freshCount + 1;
    }
  });
  res.send({
    INTERESTED: intCount,
    'NOT INTERESTED': nonintCount,
    CALLBACK: callbackCount,
    LOST: lostCount,
    FRESH: freshCount,
  });
};
module.exports = countController;
