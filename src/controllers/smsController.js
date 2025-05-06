const axios = require('axios');
const smsModel = require('../models/smsModel');

const smsController = {};

// to add sms service - can be sms, whats app or email
smsController.addSmsServiceData = async (req, res) => {
  try {
    const sms = req.body;
    const newSms = new smsModel(sms);

    await newSms.save();

    res.send('Saved organization Sms Service Data');
  } catch (error) {
    console.log(error);
    res.send({ error });
  }
};

// triggered using firebase bridges -
smsController.triggerSMS = async (req, res) => {
  try {
    const { organization_id, phone } = req.body;
    const sms = await smsModel.findOne({ organization_id });

    if (!sms) {
      return res.send('No SMS service found for this organization');
    }

    if (sms.sms.url) {
      let { parameters, url, url_type, headers, description } = sms.sms;
      if (url_type === 'post') {
        let temp;

        parameters.forEach((p) => {
          temp[p.key] = p.value;
        });

        temp.map((para, index) => {
          if (temp[index] === '$phone') {
            temp[index] = phone;
          } else if (temp[index] === '$description' && description !== '') {
            temp[index] = description;
          }
        });

        let result;

        if (headers) result = await axios.post(url, temp, headers);
        else result = await axios.post(url, temp);
      } else if (url_type === 'get') {
        url = url.replace('$phone', phone);
        if (description !== '') url = url.replace('$description', description);
        await axios.get(url);
      }
    }

    if (sms.whatsApp.url) {
      let { parameters, url, url_type, headers, description } = sms.whatsApp;
      if (url_type === 'post') {
        let temp;

        parameters.forEach((p) => {
          temp[p.key] = p.value;
        });

        temp.map((para, index) => {
          if (temp[index] === '$phone') {
            temp[index] = phone;
          } else if (temp[index] === '$description' && description !== '') {
            temp[index] = description;
          }
        });

        let result;

        if (headers) result = await axios.post(url, temp, headers);
        else result = await axios.post(url, temp);
      } else if (url_type === 'get') {
        url = url.replace('$phone', phone);
        if (description !== '') url = url.replace('$description', description);
        await axios.get(url);
      }
      res.send('Message Sent');
    }
  } catch (err) {
    console.log(err);
    res.send({ err });
  }
};

// to get the sms services of an organization
smsController.getOrganizationSms = async (req, res) => {
  try {
    const { organization_id } = req.body;
    const sms = await smsModel.findOne({ organization_id });

    if (!sms) {
      return res.send('No SMS service found for this organization');
    }

    res.send({ sms: sms.sms, whatsApp: sms.whatsApp, email: sms.email });
  } catch (error) {
    console.log(error);
    res.send({ error });
  }
};

module.exports = smsController;
