const qs = require("qs");
const axios = require("axios");

const ivrContoller = {};

ivrContoller.soilSearchIvrInsert = async (req, res) => {
  try{
    const splittedUrl = req.url.split("?");
    reqDataWithToken = qs.parse(splittedUrl[1]);
    reqDataWithData = qs.parse(splittedUrl[2]);
    let token = reqDataWithToken.token;
    let contact_no = reqDataWithData.SourceNumber;
    let associate_contact = reqDataWithData.DialWhomNumber;
    let duration = reqDataWithData.CallDuration;
    let voice_url = reqDataWithData.CallRecordingUrl;
    const bodyData = {
     contact_no,
     associate_contact,
     duration,
     voice_url,
     customer_name:"IVR",
     token
    };
    let data = await axios.post('https://api.read-pro.com/createContacts', bodyData)
    return res.status(200).json({"success": true,message:data.data.message});
  }catch(err){
    console.log(err);
    return res.status(400).json({"success": false,error:err.message,message:"IVR lead couldn't be created"});
  }
};

module.exports = ivrContoller;
