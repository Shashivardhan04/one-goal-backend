var ObjectId = require("mongoose").Types.ObjectId;
const leadModel = require("../models/leadsSchema");
const userModel = require("../models/userSchema");
const taskModel = require("../models/taskSchema");
const callLogModel = require("../models/callLogsSchema");
const smsController = require("./smsController");
const smsModel = require("../models/smsModel");
const moment = require("moment");
const app = require("firebase");
const csv = require('fast-csv');
const fs = require('fs');
const { Parser } = require("json2csv");
const createNote = require("../models/contactResourceSchema");
const timestamp = app.firestore.Timestamp;

const leadsTransferController = {};


leadsTransferController.TransferLeads = async (req, res) => {
    // let arrData = req.body.leadsData;
    // var uid = req.body.owner.uid;
    var uid = req.body.login_uid;
    console.log("Uid printed :", uid);
    const resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
        res.send({ error: "User Not Found" });
    }
    const user = resultUser[0];
    const profile = user.profile;
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "team lead" || profile.toLowerCase() == "admin") {
        let arrData = req.body.leadsData;
        let fresh = req.body.options.fresh;
        let notes = req.body.options.notes;
        let attachments = req.body.options.attachments;
        let optionTask = req.body.options.task;
        let contactDetails = req.body.options.contactDetails;
        let email = req.body.owner.email;
        let ownerUid = req.body.owner.uid;
        let organization_id = req.body.owner.organization_id;
        let reason = req.body.reason;

        let genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        // console.log("New id created", genRanHex(20));
        let createNewLeadId = genRanHex(20);

        if (email === undefined || uid === undefined || organization_id === undefined) {
            res.send({ error: "Owner not found" });
        } else {
            console.log("Printed modules else condition...");
            for (let i = 0; i < arrData.length; i++) {
                const leadData = arrData[i];
                let Id = leadData.contactId;
                let leadId = leadData.contactId;
                let resId = leadData.contactId;
                // console.log("print contact ID:", leadData["contactId"]);
                // delete leadData["contactId"];
                let newData = {};
                let oldData = { ...leadData }
                let associate_status = true;
                let new_source_status = false;
                let old_source_status = leadData.source_status;
                if (
                    leadData.stage === "FRESH" ||
                    leadData.stage === "INTERESTED" ||
                    leadData.stage === "CALLBACK"
                ) {
                    associate_status = false;
                    old_source_status = false;
                    new_source_status = true;
                } else {
                    if (old_source_status) {
                        new_source_status = false;
                        old_source_status = true;
                    } else {
                        new_source_status = false;
                        old_source_status = false;
                    }
                }
                newData = {
                    ...leadData,
                    Id: createNewLeadId,
                    transfer_status: false,
                    associate_status: true,
                    source_status: new_source_status,
                    uid: ownerUid,
                    contact_owner_email: email,
                    created_at:
                        typeof leadData.created_at == 'object'
                            ? new timestamp(
                                leadData.created_at._seconds,
                                leadData.created_at._nanoseconds
                            ).toDate()
                            : new Date(),
                    modified_at: new Date(),
                    stage_change_at: new Date(),
                    lead_assign_time: new Date(),
                    next_follow_up_date_time:
                        typeof leadData.next_follow_up_date_time == "object"
                            ? new timestamp(
                                leadData.next_follow_up_date_time._seconds,
                                leadData.next_follow_up_date_time._nanoseconds
                            ).toDate()
                            : "",
                    // next_follow_up_date_time:
                    //     leadData.next_follow_up_date_time === ""
                    //         ? ""
                    //         : firestore.Timestamp.fromDate(
                    //             moment(leadData.next_follow_up_date_time).toDate()
                    //         ),
                    previous_owner_1: leadData.previous_owner_2
                        ? leadData.previous_owner_2
                        : "",
                    previous_owner_2: leadData.contact_owner_email
                        ? leadData.contact_owner_email
                        : "",
                    transfer_by_1: leadData.transfer_by_2 ? leadData.transfer_by_2 : "",
                    transfer_by_2: resultUser.email,
                    previous_stage_1: leadData.previous_stage_2
                        ? leadData.previous_stage_2
                        : "",
                    previous_stage_2: leadData.stage,
                    organization_id: leadData.organization_id,
                };
                oldData = {
                    transfer_status: true,
                    associate_status,
                    source_status: old_source_status,
                    transfer_reason: reason,
                    // modified_at: firestore.Timestamp.now(),
                };
                delete oldData.created_at;
                delete oldData.stage_change_at;
                delete oldData.lead_assign_time;
                delete oldData.next_follow_up_date_time;
                if (fresh === true) {
                    if (contactDetails === true) {
                        newData = {
                            ...newData,
                            stage: "FRESH",
                            next_follow_up_type: "",
                            next_follow_up_date_time: "",
                            not_int_reason: "",
                            lost_reason: "",
                            other_not_int_reason: "",
                            other_lost_reason: "",
                        };
                    } else {
                        newData = {
                            ...newData,
                            stage: "FRESH",
                            next_follow_up_type: "",
                            next_follow_up_date_time: "",
                            not_int_reason: "",
                            lost_reason: "",
                            other_not_int_reason: "",
                            other_lost_reason: "",
                            project: "",
                            property_stage: "",
                            property_type: "",
                            budget: "",
                            location: "",
                            property_sub_type: "",
                            call_back_reason: "",
                        };
                    }
                }
                let oldDocRef = await leadModel.findOneAndUpdate({ Id }, oldData);
                console.log("Updated oldDocRef", oldDocRef);
                const data = new leadModel(newData);
                data.save(async function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("DONE LEADS INSERTION");
                    }
                });

                //Notes works Started...
                if (attachments === true || notes === true) {
                    const oldresourceData = await createNote.findOne({ resId });
                    if(oldresourceData===null){
                        console.log("No resource Found...");
                    }else{
                        let createNewResourceNote = {};
                        oldResData = {
                            transfer_status: true,
                            // modified_at: firestore.Timestamp.now(),
                        };
                        console.log("Old Data :",oldResData);
                        let oldResDoc = await createNote.findOneAndUpdate({ resId }, oldResData);
                        console.log("Updated oldResDoc", oldResDoc);
                        
                        createNewResourceNote = {
                            transfer_status: false,
                            uid:ownerUid,
                            resId:createNewLeadId,
                            budget: oldresourceData.budget,
                            contact_no: oldresourceData.contact_no,
                            contact_owner_email: email,
                            customer_name: oldresourceData.customer_name,
                            inventory_type: oldresourceData.inventory_type,
                            location: oldresourceData.location,
                            organization_id: oldresourceData.organization_id,
                            project: oldresourceData.project,
                            source: oldresourceData.source,
                            stage: oldresourceData.stage,
                        }
    
                        if(attachments===true){
                            createNewResourceNote={
                                ...createNewResourceNote,
                                attachments: oldresourceData.attachments
                            }
                        }
                        if(notes===true){
                            createNewResourceNote={
                                ...createNewResourceNote,
                                notes: oldresourceData.notes
                            }
                        }
    
                    const finalresdata = new createNote(createNewResourceNote);
                    finalresdata.save(async function (err, result) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("DONE LEADS INSERTION");
                        }
                    });
                    }
                   
                }

                //Task Part Started...
                if(optionTask){
                    const taskData = await taskModel.find({ leadId });
                if(taskData===null){
                    console.log("Task Not found...");
                }else{
                    oldTaskData = {
                        transfer_status: true,
                        status:"Completed",
                    };
                    let oldTaskDoc = await taskModel.findOneAndUpdate({ leadId }, oldTaskData);
                    console.log("Updated oldResDoc", oldTaskDoc);
                    let createNewTaskData = {};
                    createNewTaskData = {
                        leadId:createNewLeadId,
                        contact_owner_email: email,
                        transfer_status: false,
                        status:"Pending",
                        customer_name:oldTaskDoc.customer_name,
                        contact_no:oldTaskDoc.contact_no,
                        stage:oldTaskDoc.stage,
                        call_back_reason:oldTaskDoc.call_back_reason,
                        location:oldTaskDoc.location,
                        project:oldTaskDoc.project,
                        budget:oldTaskDoc.budget,
                        created_by:oldTaskDoc.created_by,
                        created_at:oldTaskDoc.created_at,
                        type:oldTaskDoc.type,
                        inventory_type:oldTaskDoc.inventory_type,
                        source:oldTaskDoc.source,
                        due_date:oldTaskDoc.due_date,
                        completed_at:oldTaskDoc.completed_at,
                        uid:oldTaskDoc.uid,
                        organization_id:oldTaskDoc.organization_id,
                    };
    
                    const finalTasksdata = new taskModel(createNewTaskData);
                    finalTasksdata.save(async function (err, result) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("DONE LEADS INSERTION");
                        }
                    });
                }
                }else{
                    console.log('No task transfer...');
                }
                
                
            }
        }
    }
    res.send(`Lead Transfered`);
};

leadsTransferController.CreateNotes = async (req, res) => {

    const data = new createNote({
        budget: req.body.budget,
        callLogs: req.body.callLogs,
        attachments: req.body.attachments,
        contact_no: req.body.contact_no,
        contact_owner_email: req.body.contact_owner_email,
        customer_name: req.body.customer_name,
        inventory_type: req.body.inventory_type,
        location: req.body.location,
        notes: req.body.notes,
        organization_id: req.body.organization_id,
        project: req.body.project,
        source: req.body.source,
        stage: req.body.stage,
        transfer_status: req.body.transfer_status,
        uid: req.body.uid,
    });
    console.log("Data after modal...", JSON.stringify(data));
    data.save(async function (err, result) {
        if (err) {
            console.log(err);
        } else {
            console.log("result", result);
        }
    });
    res.send("Notes saved successful...");
};

leadsTransferController.UpdateNotes = async (req, res) => {
    let resId = req.body.contactId;
    let arrNotes = [req.body.notes];
    const oldresourceData = await createNote.findOne({ resId });
    if( oldresourceData === null ){
        const data = new createNote({
            resId,
            notes:arrNotes,
        });
        console.log("Data after modal...", JSON.stringify(data));
        data.save(async function (err, result) {
            if (err) {
                console.log(err);
            } else {
                console.log("result", result);
            }
        });
        res.send("Notes saved successful...");
    }else{
        const oldnotes = oldresourceData.notes;
        const newNotes = req.body.notes;
        const finalNotes = [...oldnotes,newNotes];
        const updatedNoted = {
            notes:finalNotes
        };
        let oldResDoc = await createNote.findOneAndUpdate({ resId }, updatedNoted);
        console.log("Updated oldResDoc", oldResDoc);
        res.send(`Notes Updated...`);
    }
    

};

leadsTransferController.UpdateCallLogs = async (req, res) => {
    let resId = req.body.contactId;
    let newCallLogs = req.body.callLogs;
    const oldresourceData = await createNote.findOne({ resId });
    const oldcallLogs = oldresourceData.callLogs;
    const finalCallLogs = [...oldcallLogs,newCallLogs];
    const updatedCallLogs = {
        callLogs:finalCallLogs
    };
    let oldResDoc = await createNote.findOneAndUpdate({ resId }, updatedCallLogs);
    console.log("Updated oldResDoc", oldResDoc);
    res.send(`CallLogs Updated...`);    
}

leadsTransferController.UpdateAttachment = async (req, res) => {
    let resId = req.body.contactId;
    let newAttachment = req.body.attachments;
    let arrAttachment = [req.body.attachments];
    const oldresourceData = await createNote.findOne({ resId });
    if( oldresourceData === null ){
        const data = new createNote({
            resId,
            attachments:arrAttachment,
        });
        console.log("Data after modal...", JSON.stringify(data));
        data.save(async function (err, result) {
            if (err) {
                console.log(err);
            } else {
                console.log("result", result);
            }
        });
        res.send("Notes saved successful...");
    }else{
        const oldAttachments = oldresourceData.attachments;
        const finalAttachments = [...oldAttachments,newAttachment];
        const updatedAttachments = {
            attachments:finalAttachments,
        };
    let oldResDoc = await createNote.findOneAndUpdate({ resId }, updatedAttachments);
    console.log("Updated oldResDoc", oldResDoc);
    res.send(`Attachment Updated...`);
    }
        
}

leadsTransferController.GetContactResource = async (req, res) => {
    let resId = req.body.contactId;
    const oldresourceData = await createNote.findOne({ resId });
    if(oldresourceData===null){
        res.send("No Record");
    }else{
        res.send(oldresourceData);    
    }

}

module.exports = leadsTransferController;