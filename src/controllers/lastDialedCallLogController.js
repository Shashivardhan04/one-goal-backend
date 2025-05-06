const lastDialedCallLogModel= require("../models/lastDialedCallLogSchema");
const leadModel= require("../models/leadsSchema")

const lastDialedCallLogController={};



  lastDialedCallLogController.create= async(req,res)=>{
       
   try {
    const leadId=req.body.leadId?req.body.leadId:'';
    const contact_no=req.body.contact_no?req.body.contact_no:'';
    const uid=req.body.uid?req.body.uid:'';
    const contact_owner_email=req.body.contact_owner_email?req.body.contact_owner_email:'';
    const organization_id=req.body.organization_id?req.body.organization_id:'';

    const check=await lastDialedCallLogModel.findOne({uid:uid});

    if(check){
        await lastDialedCallLogModel.deleteOne({uid:uid});
    }
   
    let obj={
        leadId:leadId,
        contact_no:contact_no,
        uid:uid,
        organization_id:organization_id,
        contact_owner_email:contact_owner_email
    }

    let data = await lastDialedCallLogModel.create(obj);


    return res.status(200).json({
        success:true,
        data:data
    })
   } catch (error) {
    return res.status(400).json({
        "success": false,
        "error":error
    });
   }

}

lastDialedCallLogController.fetchAndVerify=async(req,res)=>{
    try {
        const uid=req.body.uid?req.body.uid:"";
        let data = await lastDialedCallLogModel.findOne({uid:uid});

        if(!data){
            return  res.status(200).json({
                success:true,
                data:{
                    isLeadInFresh:false,
                    leadData:{}
                }
               });
        }

        const leadId=data.leadId;

       
        const lead= await leadModel.findOne({Id:leadId,transfer_status:false});

        if(!lead){
            return  res.status(200).json({
                success:true,
                data:{
                    isLeadInFresh:false,
                    leadData:{}
                }
               });
        }

        if(lead.stage.toLowerCase() == "fresh"){
            return res.status(200).json({
                success:true,
                data: {
                    isLeadInFresh:true,
                    leadData: lead
                }
            })
        }else{
            return res.status(200).json({
                success:true,
                data: {
                    isLeadInFresh:false,
                    leadData: lead
                }
            })
        }

        
    } catch (error) {
        return res.status(400).json({
            "success": false,
            "error":error
        });
        
    }
}


module.exports=lastDialedCallLogController;

