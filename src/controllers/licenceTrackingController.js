var ObjectId = require("mongoose").Types.ObjectId;
const licenceTrackingModel = require("../models/licenceTrackingSchema");
const licenceTrackingController = {};

//get data in licenceTracking

licenceTrackingController.Get = async (req, res) => {
    let orgData = [];
    let orgData1 = [];
    try{
        const data = await licenceTrackingModel.find({});
        data.map((obj)=>{
                obj.data.map((count)=>{
                    orgData.push(count)
                })
            })
            const final = orgData.reduce((a,c)=>{
                if(!a[c.date]){
                    a[c.date]=0;
                }a[c.date] += Number(c.count);
                // orgData1.push(a)
                return a
            },{});
            orgData1.push(final)
            res.json(orgData1)
    }catch(err){
        console.log("Error is there",err)
    }
};

licenceTrackingController.Getorg = async (req, res) => {
    const organization_id =req.body.organization_id
    let orgData = [];
    let a =0;
    try{
        const data = await licenceTrackingModel.find({});
        data.map((obj)=>{
            if(organization_id===obj.organization_id){
                obj.data.map((count)=>{
                    a=+a + +count.count
                })
                orgData.push({'organization_id':obj.organization_id,'data':obj.data,"Total":a})
            }
            })
            res.json(orgData)
            
    }catch(err){
        console.log("Error is there",err)
    }
};


//update data in licenceTracking

licenceTrackingController.Update = async (req, res) => {
    let data = req.body;
      try {
        let todayDate = new Date();
        let tomorrowDate = new Date(todayDate);
      tomorrowDate.setDate(todayDate.getDate() - 1);
        const query = {
          organization_id: data.organization_id,
        };
        const update = {
          $push: { data:{count:data.data[0].count,date:todayDate}},
        };
        const options = {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        };
        const updatedDocument = await licenceTrackingModel.findOneAndUpdate(query, update, options);
        return res.status(200).json({"success": true,data:updatedDocument});
      } catch (err) {
        return res.status(400).json({"success": false,"error":err});
      }
    }

module.exports = licenceTrackingController;