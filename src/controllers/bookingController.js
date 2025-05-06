var ObjectId = require("mongoose").Types.ObjectId;
const bookingModel = require("../models/bookingSchema");
const userModel = require("../models/userSchema");
const bookingController = {};
const CryptoJS = require('crypto-js');
require("dotenv").config();

// Function to decrypt PAN
const decryptPAN = (encryptedPAN) => {
  const secretKey = process.env.REACT_APP_SECRET_KEY; // Must match the key used in React
//   console.log("efnuernferfjenrfjnerj",secretKey
//   )
  const bytes = CryptoJS.AES.decrypt(encryptedPAN, secretKey);
  const decryptedPAN = bytes.toString(CryptoJS.enc.Utf8);
  return decryptedPAN;
};

const validatePAN=(pan) =>{
    const panPattern = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/;
    if (typeof pan !== 'string') {
      return false;
    }
    return panPattern.test(pan.toUpperCase());
  }

const datesField = [
    "created_at",
    "next_follow_up_date_time",
    "stage_change_at",
    "modified_at",
    "lead_assign_time",
];
const booleanField = [
    "associate_status",
    "source_status",
    "transfer_status",
];
//post data in booking
// created_at: { type: Date, default: new Date() },
bookingController.Create = async (req, res) => {
    
  try {
   
    const validate=validatePAN(req.body.booking_details?.pan_card);
   let panValue="";

    if(!validate){
     panValue=decryptPAN(req.body.booking_details?.pan_card);
    }

    const uid = req.body.uid;
    const resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
        res.send({ error: "User Not Found" });
    }
    const user = resultUser[0];
    const profile = user?.profile;
    const user_email = user?.user_email;

    const data = new bookingModel({
        organization_id: req.body.organization_id,
        uid: req.body.uid,
        reporting_to: req.body.reporting_to,
        branch: req.body.branch,
        team: req.body.team,
        location: req.body.location,
        project: req.body.project,
        contact_no: req.body.contact_no,
        contactDetails: req.body.contact_details,
        notes: req.body.notes,
        attachments: req.body.attachments,
        callLogs: req.body.call_logs,
        bookingDetails: [{
            booking_id: req.body.booking_details?.booking_id,
            date_booking: new Date(req.body.booking_details?.date_booking),
            developer_name: req.body.booking_details?.developer_name,
            declaration: req.body.booking_details?.declaration,
            project_name: req.body.booking_details?.project_name,
            area: req.body.booking_details?.area,
            area_type: req.body.booking_details?.area_type,
            unit_no: req.body.booking_details?.unit_no,
            source_fund: req.body.booking_details?.source_fund,
            scheme: req.body.booking_details?.scheme,
            pan_card: panValue,
            booking_attachmentS3: req.body.booking_details?.booking_attachmentS3,
            Kyc_attachmentS3: req.body.booking_details?.Kyc_attachmentS3,
            video_kyc: req.body.booking_details?.video_kyc,
            status: req.body.booking_details?.status,
            created_at: new Date(),
            profile,
            user_email
        }
        ],
        created_at: new Date()
    });
    data.save(async function (err, result) {
        if (err) {
            console.log(err);
        } else {
            console.log("DONE BOOKING INSERTION");
        }
    });
    res.send("inserted data");
  } catch (error) {
      return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};
//update data in booking
bookingController.Update = async (req, res) => {
    // let bookingDetailsArr=[];
    const organization_id = req.body.organization_id;
    const uid = req.body.uid;
    const contact_no = req.body.contact_no;

    const reqBookingObj = req.body.booking_details;
    const resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
        res.send({ error: "User Not Found" });
    }

    const user = resultUser[0];
    const profile = user.profile;
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin" ) {
        const { date_booking, ...reqObj } = reqBookingObj;
        const bookingObj = {
            ...reqObj,
            date_booking: new Date(date_booking)
        };
        const getData = await bookingModel.find({
            organization_id,
            uid,
            contact_no
        });
        const { bookingDetails, ...objData } = getData[0]?._doc;
        const bookingDetailsArr = [...bookingDetails, bookingObj];
        try {
            await bookingModel.findOneAndUpdate({ uid, organization_id, contact_no }, { "bookingDetails": bookingDetailsArr })
            res.send('updated data');
        }
        catch (error) {
            console.log(error);
            res.send({ error });
        }

    } else if (profile.toLowerCase() == "team lead") {
        const { date_booking, ...reqObj } = reqBookingObj;
        const bookingObj = {
            ...reqObj,
            date_booking: new Date(date_booking)
        };
        const getData = await bookingModel.find({
            organization_id,
            uid,
            contact_no
        });
        const { bookingDetails, ...objData } = getData[0]?._doc;
        const bookingDetailsArr = [...bookingDetails, bookingObj];
        try {
            await bookingModel.findOneAndUpdate({ uid, organization_id, contact_no }, { "bookingDetails": bookingDetailsArr })
            res.send('updated data');
        }
        catch (error) {
            console.log(error);
            res.send({ error });
        }

    } else if (profile.toLowerCase() == "operation manager") {
        try {
            let find;
            let booking_id = req.body.booking_details.booking_id;
            let applicant_details = req.body.booking_details.applicant_details;
            let property_details_BSP = req.body.booking_details.property_details_BSP;
            let additional_charges = req.body.booking_details.additional_charges;
            let consolidated_costing = req.body.booking_details.consolidated_costing;
            let payment_plan = req.body.booking_details.payment_plan;
            let source_of_fund = req.body.booking_details.source_of_fund;
            let attachments = req.body.booking_details.attachments;
            let employee_details = req.body.booking_details.employee_details;
            find = {
                organization_id,
                contact_no,
            }
            const booking = await bookingModel.find(find);
            const filterBookingData = booking[0]?._doc?.bookingDetails?.filter(list => list.booking_id === booking_id)
            const OmUpdateData = {
                ...filterBookingData[0],
                status: req.body.booking_details.status,
                added_by: req.body.booking_details.added_by,
                modified_by: req.body.booking_details.modified_by,
                modified_time: req.body.booking_details.modified_time,
                date_booking: req.body.booking_details.date_booking,
                developer_name: req.body.booking_details.developer_name,
                declaration: req.body.booking_details?.declaration,
                project_name: req.body.booking_details.project_name,
                area: req.body.booking_details.area,
                unit_no: req.body.booking_details.unit_no,
                source_fund: req.body.booking_details.source_fund,
                scheme: req.body.booking_details.scheme,
                area_type: req.body.booking_details.area_type,
                booking_attachmentS3: req.body.booking_details.booking_attachmentS3,
                Kyc_attachmentS3: req.body.booking_details.Kyc_attachmentS3,
                pan_card: req.body.booking_details.pan_card,
                applicant_details,
                property_details_BSP,
                additional_charges,
                consolidated_costing,
                payment_plan,
                source_of_fund,
                attachments,
                employee_details,
            }
            let AllDataArr = booking[0]?._doc?.bookingDetails;
            const removeobjData = AllDataArr?.findIndex((obj) => obj.booking_id === booking_id);
            AllDataArr.splice(removeobjData, 1);

            let updatedArray = [OmUpdateData, ...AllDataArr];

            const updation = await bookingModel.findOneAndUpdate({ organization_id, contact_no }, { "bookingDetails": updatedArray })

            res.send("value updated");


        }
        catch (error) {
            res.send({ error });
        }


    } else {
        const { date_booking, ...reqObj } = reqBookingObj;
        const bookingObj = {
            ...reqObj,
            date_booking: new Date(date_booking)
        };
        const getData = await bookingModel.find({
            organization_id,
            uid,
            contact_no
        });
        const { bookingDetails, ...objData } = getData[0]?._doc;
        const bookingDetailsArr = [...bookingDetails, bookingObj];
        try {
            await bookingModel.findOneAndUpdate({ uid, organization_id, contact_no }, { "bookingDetails": bookingDetailsArr })
            res.send('updated data');
        }
        catch (error) {
            console.log(error);
            res.send({ error });
        }

    }

};
const getBranchUsers = async (
    uid,
    organization_id,
    permission
) => {
    const users = await userModel.find({
        organization_id,
        branch: { $in: permission },
    });
    let usersList = [uid];
    users.forEach((user) => usersList.push(user.uid));
    return usersList;
};

const getTeamUsers = async (uid, organization_id) => {
    const users = await userModel.find({ organization_id });
    const user = users.filter((user) => user.uid === uid);
    let reportingToMap = {};
    let usersList = [user[0].uid];

    users.forEach((item) => {
        if (item.reporting_to === "") {
            return;
        }
        if (reportingToMap[item.reporting_to]) {
            reportingToMap[item.reporting_to].push({
                user_email: item.user_email,
                uid: item.uid,
            });
        } else {
            reportingToMap[item.reporting_to] = [
                { user_email: item.user_email, uid: item.uid },
            ];
        }
    });

    const createUsersList = (email, data) => {
        if (data[email] === undefined) {
            return;
        } else {
            data[email].forEach((user) => {
                if (usersList.includes(user.uid)) {
                    return;
                }
                usersList.push(user.uid);
                createUsersList(user.user_email, data);
            });
        }
    };

    createUsersList(user[0].user_email, reportingToMap);

    return usersList;
};
//get data in booking
bookingController.BookingList = async (req, res) => {
    const uid = req.body.uid;
    let filter = req.body.filter;
    let arrFilter = req.body?.bookingFilter;
    let skip = req.body.skip;
    let limit = req.body.limit;
    // let callLogsFilter = req.body.callLogsFilter;
    // let attachmentFilter = req.body.attachmentFilter;
    const sort = req.body.sort;
    const missed = req.body.missed;
    const searchString = req.body.searchString
        ? req.body.searchString
        : "";
    const page = Number(req.body.page);
    const pageSize = Number(req.body.pageSize);
    let report = [];
    let cond = false;

    Object.keys(filter).forEach((key) => {
        if (datesField.includes(key)) {
            if (filter[key].length && filter[key].length === 2) {
                filter[key] = {
                    $gte: new Date(filter[key][0]),
                    $lte: new Date(filter[key][1]),
                };
            }
        } else if (booleanField.includes(key)) {
            filter[key].forEach((element, index) => {
                if (element === "True" || element === true) {
                    filter[key][index] = true;
                } else if (
                    element === "False" ||
                    element === false
                ) {
                    filter[key][index] = false;
                }
            });
        }
        else if (key === "reporting_to") {
            report = filter[key];
            cond = true;
            delete filter[key];
        }
        else {
            filter[key] = { $in: filter[key] };
        }
    });
    Object.keys(arrFilter).forEach((key) => {
        arrFilter[key] = { $in: arrFilter[key] };
    });
    // Object.keys(callLogsFilter).forEach((key) => {
    //     callLogsFilter[key] = { $in: callLogsFilter[key] };
    // });
    // Object.keys(attachmentFilter).forEach((key) => {
    //     attachmentFilter[key] = { $in: attachmentFilter[key] };
    // });

    let reportingUsers = await userModel
        .find({
            reporting_to: { $in: report },
        })
        .select("uid -_id");

    reportingUsers = reportingUsers.map(({ uid }) => uid);

    if (missed === true) {
        filter["next_follow_up_date_time"] = {
            $lt: new Date(),
        };
    }

    let customer_name_list = [];
    let contact_list = [];

    searchString.split(",").forEach((string) => {
        search = string.trim();
        const re = new RegExp(search, "i");
        if (search.match(/^[0-9]+$/) != null) {
            contact_list.push(re);
        } else if (search !== "") {
            customer_name_list.push(re);
        }
    });

    if (contact_list.length !== 0) {
        filter["contact_no"] = { $in: contact_list };
    }
    if (customer_name_list.length !== 0) {
        filter["customer_name"] = { $in: customer_name_list };
    }
    const resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
       return res.send({ error: "User Not Found" });
    }

    const user = resultUser[0];
    const profile = user?.profile;
    const organization_id = user?.organization_id;
    console.log("profile", profile)
    let bookings;
    const group = {
        $group: {
            // _id: '$_id',
            _id: {
                _id: '$_id',
                organization_id: '$organization_id',
                contact_no: '$contact_no',
                reporting_to: '$reporting_to',
                branch: '$branch',
                team: '$team',
                location: '$location',
                project: '$project',
                uid: '$uid',
                created_at: '$created_at',
                notes: '$notes',
                attachments: '$attachments',
                callLogs: '$callLogs',
                contactDetails: '$contactDetails',
            },
            bookingDetails: { $push: '$bookingDetails' }
        },
    };
    const project = {
        $project: {
            _id: 0,
            _id: '$_id._id',
            bookingDetails: 1,
            organization_id: '$_id.organization_id',
            contact_no: '$_id.contact_no',
            reporting_to: '$_id.reporting_to',
            branch: '$_id.branch',
            team: '$_id.team',
            location: '$_id.location',
            project: '$_id.project',
            uid: '$_id.uid',
            created_at: '$_id.created_at',
            notes: '$_id.notes',
            attachments: '$_id.attachments',
            callLogs: '$_id.callLogs',
            contactDetails: '$_id.contactDetails',
        },
    };
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
        const permission = user.branchPermission;
        if (
            permission === undefined ||
            (permission && permission.length === 0) ||
            (permission && permission.includes("All"))
        ) {
            try {
                let find;
                if (!cond) find = { organization_id, ...filter };
                else
                    find = {
                        organization_id,
                        ...filter,
                        uid: { $in: reportingUsers },
                    };
                // bookings = await bookingModel
                //     .find(find, { _id: 0, __v: 0 })
                //     .sort(sort)
                //     .skip((page - 1) * pageSize)
                //     .limit(pageSize);
                // console.log("Query Printed", JSON.stringify(query));
                bookings = await bookingModel
                .find(find, { _id: 0, __v: 0 })

                return res.send(bookings);
            } catch (error) {
                return res.send({ error });
            }
        }
        else {
            let usersList = await getBranchUsers(
                uid,
                organization_id,
                permission
            );
            try {
                let find;
                const interesectionArray = usersList.filter(
                    (value) => reportingUsers.includes(value)
                );
                if (!cond)
                    find = { uid: { $in: usersList }, ...filter };
                else
                    find = {
                        uid: { $in: interesectionArray },
                        ...filter,
                    };
                bookings = await bookingModel
                    .find(find, { _id: 0, __v: 0 })

                return res.send(bookings);
            } catch (error) {
               return res.send({ error });
            }
        }
    }
    else if (profile.toLowerCase() == "operation manager") {

        try {
            let find;
            if (!cond) find = { organization_id, ...filter };
            else
                find = {
                    organization_id,
                    ...filter,
                    uid: { $in: reportingUsers },
                };
            // bookings = await bookingModel
            //     .find(find, { _id: 0, __v: 0 })
            //     .sort(sort)
            //     .skip((page - 1) * pageSize)
            //     .limit(pageSize);
            bookings = await bookingModel
            .find(find, { _id: 0, __v: 0 })

            return res.send(bookings);
        } catch (error) {
            return res.send({ error });
        }


    }
    else if (profile.toLowerCase() == "team lead") {
        let usersList = await getTeamUsers(
            uid,
            organization_id
        );
        try {
            let find;
            const interesectionArray = usersList.filter((value) =>
                reportingUsers.includes(value)
            );
            if (!cond) {

                find = { uid: { $in: usersList }, ...arrFilter };

            }
            else {
                if (arrFilter?.stage) {
                    find = {
                        uid: { $in: interesectionArray },
                        ...arrFilter,
                    };
                }
            }
            // bookings = await bookingModel
            //     .find(find, { _id: 0, __v: 0 })
            //     .sort(sort)
            //     .skip((page - 1) * pageSize)
            //     .limit(pageSize);
            bookings = await bookingModel
            .find(find, { _id: 0, __v: 0 })

            return res.send(bookings);
        } catch (error) {
            return res.send({ error });
        }
    } else {
        try {
            let find;
            if (cond) {
                find = reportingUsers.includes(uid)
                    ? { uid, ...arrFilter }
                    : "";
            }


            find = { "uid": { "$in": [uid] }, ...arrFilter };

            // bookings = await bookingModel
            //     .find(find, { _id: 0, __v: 0 })
            //     .sort(sort)
            //     .skip((page - 1) * pageSize)
            //     .limit(pageSize);
            bookings = await bookingModel
            .find(find, { _id: 0, __v: 0 })

            return res.send(bookings);
        } catch (error) {
            return res.send({ error });
        }
    }
};

//details data in booking
bookingController.Details = async (req, res) => {
    const uid = req.body.uid;
    const organization_id = req.body.organization_id;
    const contact_no = req.body.contact_no;
    const booking_id = req.body.booking_id;
    try {
        let find;
        find = {
            organization_id,
            contact_no,
        }
        const booking = await bookingModel.find(find);
        if (booking_id) {
            const filterBookingData = booking[0]?._doc?.bookingDetails?.filter(list => list.booking_id === booking_id)
            res.send(filterBookingData);
        }
        else {
            booking[0]?._doc ? res.send(true) : res.send(false)
        }

    }
    catch (error) {
        res.send({ error });
    }
};

//delete data in booking
bookingController.Delete = async (req, res) => {
    const id = req.query.id
    bookingModel
        .findOneAndDelete({ _id: id })
        .exec(function (err, result) {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.status(200).send("Deletion DONE!");
            }
        });
};

bookingController.BookingCount = async (req, res) => {
    const uid = req.body.uid;
    const filter = req.body.filter;
    const resultUser = await userModel.find({ uid });
    if (resultUser.length === 0) {
        res.send({ error: "User Not Found" });
    }
    const user = resultUser[0];
    const profile = user.profile;
    const organization_id = user.organization_id;
    if (profile.toLowerCase() == "lead manager" || profile.toLowerCase() == "admin") {
        const permission = user.branchPermission;
        if (
            permission === undefined ||
            (permission && permission.length === 0) ||
            (permission && permission.includes("All"))
        ) {
            try {
                const and = [{ organization_id }];
                const filterArr = [];
                if (filter) {
                    Object.keys(filter).forEach((key) => {
                        filterArr.push({ [key]: { $in: filter[key] } });
                    })
                }
                let bodyData;
                if (filterArr.length !== 0) {
                    const data = [
                        {
                            $match: {
                                $and: and,
                            },
                        },
                        {
                            $unwind: "$bookingDetails"
                        },
                        {
                            $match: {
                                $and: filterArr,
                            },
                        },
                        { $group: { _id: { status: "$bookingDetails.status" }, count: { $sum: 1 } } },
                    ];
                    bodyData = data;
                }
                else {
                    const data = [
                        {
                            $match: {
                                $and: and,
                            },
                        },
                        {
                            $unwind: "$bookingDetails"
                        },
                        { $group: { _id: { status: "$bookingDetails.status" }, count: { $sum: 1 } } },
                    ];
                    bodyData = data;
                }
                const count = await bookingModel.aggregate(bodyData);
                res.send(count);
            } catch (error) {
                res.send({ error });
            }
        } else {
            let usersList = await getBranchUsers(
                uid,
                organization_id,
                permission
            );
            try {
                const count = await bookingModel.aggregate([
                    {
                        $match: {
                            uid: { $in: usersList },
                        },
                    },
                    { $group: { _id: "$stage", count: { $sum: 1 } } },
                ]);
                res.send(count);
            } catch (error) {
                res.send({ error });
            }
        }
    }
    else if (profile.toLowerCase() == "team lead") {
        let usersList = await getTeamUsers(
            uid,
            organization_id
        );
        try {
            const and = [{ uid: { $in: usersList } }];
            const filterArr = [];
            if (filter) {
                Object.keys(filter).forEach((key) => {
                    filterArr.push({ [key]: { $in: filter[key] } });
                })
            }
            let bodyData;
            if (filterArr.length !== 0) {
                const data = [
                    {
                        $match: {
                            $and: and,
                        },
                    },
                    {
                        $unwind: "$bookingDetails"
                    },
                    {
                        $match: {
                            $and: filterArr,
                        },
                    },
                    { $group: { _id: { status: "$bookingDetails.status" }, count: { $sum: 1 } } },
                ];
                bodyData = data;
            }
            else {
                const data = [
                    {
                        $match: {
                            $and: and,
                        },
                    },
                    {
                        $unwind: "$bookingDetails"
                    },
                    { $group: { _id: { status: "$bookingDetails.status" }, count: { $sum: 1 } } },
                ];
                bodyData = data;
            }
            const count = await bookingModel.aggregate(bodyData);
            res.send(count);
        } catch (error) {
            res.send({ error });
        }
    }
    else {
        try {
            const and = [{ uid }];
            const filterArr = [];
            if (filter) {
                Object.keys(filter).forEach((key) => {
                    filterArr.push({ [key]: { $in: filter[key] } });
                })
            }
            let bodyData;
            if (filterArr.length !== 0) {
                const data = [
                    {
                        $match: {
                            $and: and,
                        },
                    },
                    {
                        $unwind: "$bookingDetails"
                    },
                    {
                        $match: {
                            $and: filterArr,
                        },
                    },
                    { $group: { _id: { status: "$bookingDetails.status" }, count: { $sum: 1 } } },
                ];
                bodyData = data;
            }
            else {
                const data = [
                    {
                        $match: {
                            $and: and,
                        },
                    },
                    {
                        $unwind: "$bookingDetails"
                    },
                    { $group: { _id: { status: "$bookingDetails.status" }, count: { $sum: 1 } } },
                ];
                bodyData = data;
            }
            const count = await bookingModel.aggregate(bodyData);
            res.send(count);
        } catch (error) {
            res.send({ error });
        }
    }
};

module.exports = bookingController;