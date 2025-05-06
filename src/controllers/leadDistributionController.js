const leadDistributionModel = require("../models/leadDistributionSchema");
const userModel = require("../models/userSchema");
const { MESSAGES } = require("../constants/constants");

const leadDistributionController = {};

const datesField = [
    "created_at",
    "next_follow_up_date_time",
    "stage_change_at",
    "modified_at",
    "lead_assign_time",
    "call_response_time"
];


leadDistributionController.create = async (req, res) => {
    try {
        const data = req.body;
        const { organization_id, budget, location, project, property_type, source, users, api_forms, autoRotationalEnable,
            autoRotationTime, returnLeadTo,requirement_type } = data;

        if (!organization_id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parameters",
                error: "organization_id required",
            });
        }

        // Check if 'users' is not selected
        if (!users || users.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Please select at least one user.",
                message: "Please select A User",
            });
        }

        // Check if at least one option is selected for other fields
        const fields = [budget, location, project, property_type, source, api_forms,requirement_type];
        if (fields.every(field => field === undefined || (Array.isArray(field) && field.length === 0))) {
            return res.status(400).json({
                success: false,
                message: " Please Select A Value",
                error: "Please select at least one option for budget, location, project, property_type, or source."
            });
        }

        // check for the minimum autorotation time

        if (autoRotationTime) {
            if (autoRotationTime < 10) {
                return res.status(200).json({
                    success: false,
                    message: "Auto rotation time should be 10 minutes or greater.",
                    error: "Auto rotation time should be 10 minutes or greater.",
                    data: []
                });
            }
        }

        const obj = {
            organization_id,
            budget,
            location,
            project,
            property_type,
            source,
            users,
            requirement_type,
            api_forms,
            autoRotationEnabled: autoRotationalEnable || "OFF",
            autoRotationTime: autoRotationTime || 0,
            returnLeadTo: returnLeadTo || ""

        };

        const createdData = await leadDistributionModel.create(obj);

        return res.status(201).json({
            success: true,
            message: "Logic created successfully"
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: MESSAGES.catchError,
            error: error.message,
        });
    }
};

leadDistributionController.update = async (req, res) => {
    try {
        const { Id } = req.body;

        if (!Id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parameters",
                error: "Id required"
            });
        }

        const check = await leadDistributionModel.findById({ _id: Id });

        if (!check) {
            return res.status(400).json({
                success: false,
                message: "Distribution logic doesn't exist",
                error: "Distribution logic doesn't exist"
            });
        }

        let data = req.body;

        const { autoRotationTime } = data;

        if (autoRotationTime) {
            if (autoRotationTime < 10) {
                return res.status(200).json({
                    success: false,
                    message: "Auto rotation time should be 10 minutes or greater.",
                    error: "Auto rotation time should be 10 minutes or greater.",
                    data: []
                });
            }
        }

        // console.log("data", data);

        // Remove 'Id' and 'organization_id' from the data before updating
        delete data.Id;
        if (data.organization_id) {
            delete data.organization_id;
        }

        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please send at least one parameter to update",
                error: "Please send at least one parameter to update"
            });
        }


        // Add a modifiedAt field with the current timestamp
        data.modified_at = new Date();
        const update = await leadDistributionModel.findOneAndUpdate(
            { _id: Id },
            { $set: data },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Logic updated successfully"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: MESSAGES.catchError,
            error: error.message,
        });
    }
};

leadDistributionController.deleteLogic = async (req, res) => {
    try {
        const { Id } = req.body;

        if (!Id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parameters",
                error: "Id required"
            });
        }

        const check = await leadDistributionModel.findById({ _id: Id });

        if (!check) {
            return res.status(400).json({
                success: false,
                message: "Distribution logic doesn't exist",
                error: "Distribution logic doesn't exist"
            });
        }

        const dataDelete = await leadDistributionModel.findByIdAndDelete({ _id: Id })

        return res.status(200).json({
            success: true,
            message: "Logic deleted successfully"
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: MESSAGES.catchError,
            error: error.message,
        });
    }
}
// const emailMapper = async (data) => {
//     const session = await userModel.startSession();

//     try {
//         await session.withTransaction(async () => {



//         });
//     } catch (error) {
//         return res.status(400).json({
//             success: false,
//             message: MESSAGES.catchError,
//             error: error.message,
//         });

//     } finally {
//         // End the session
//         session.endSession();
//     }
// };

leadDistributionController.fetchAll = async (req, res) => {
    try {
        const { organization_id, page, limit, sort, filters } = req.query;

        if (!organization_id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parameters",
                error: "organization_id required",
            });
        }

        let parsedFilters = {};
        try {
            if (filters) {
                parsedFilters = JSON.parse(filters);

                for (const key of Object.keys(parsedFilters)) {
                    if (datesField.includes(key)) {
                        if (parsedFilters[key].length && parsedFilters[key].length === 2) {
                            parsedFilters[key] = {
                                $gte: new Date(parsedFilters[key][0]),
                                $lte: new Date(parsedFilters[key][1]),
                            };
                        }
                    } else if (key === "users") {
                        let userfilter = parsedFilters[key];
                        delete parsedFilters[key];
                        let result = await userModel.find({ user_email: { $in: userfilter } }, { uid: 1, _id: 0 });
                        result = result.map((val) => val.uid);
                        parsedFilters["users"] = { $all: result };
                        // console.log("sfdsfsd", result);
                    }
                    else if (key === "returnLeadTo") {
                        let userfilter = parsedFilters[key];
                        delete parsedFilters[key];
                        let result = await userModel.find({ user_email: { $in: userfilter } }, { uid: 1, _id: 0 });
                        result = result.map((val) => val.uid);
                        parsedFilters["returnLeadTo"] = { $all: result };
                    }
                    else {
                        parsedFilters[key] = { $all: parsedFilters[key] };
                    }
                }
            }

            // const result=await userModel.find({ user_email: { $in: parsedFilters[key]} });
            // parsedFilters[key]=result.map((user) => user.uid)
            // parsedFilters[key] = { $all: parsedFilters[key] };

            // console.log("efewfbwebfhiwebfywbf",parsedFilters);

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid parameter ",
                error: error.message
            });
        }

        // Convert page and limit to integers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        if (pageNumber) {
            if (isNaN(pageNumber) || pageNumber < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid page value",
                    error: "Invalid page value"
                });
            }
        }

        if (limitNumber) {
            if (isNaN(limitNumber) || limitNumber < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid limit value",
                    error: "Invalid limit value"
                });
            }
        }

        const skip = (pageNumber - 1) * limitNumber;
        let parsedSort;
        if (sort) {

            try {
                parsedSort = JSON.parse(sort);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid  parameter",
                    error: error.message
                });
            }
        }
        //  console.log("dfsdf",parsedSort,pageNumber,limitNumber);
        // fetch cout of all data in the organization 
        const count = await leadDistributionModel.countDocuments({ organization_id: organization_id, ...parsedFilters });

        // all data fetched from the organization 
        const data = await leadDistributionModel
            .find({ organization_id: organization_id, ...parsedFilters }, { __v: 0 }).lean()
            .sort(parsedSort)
            .skip(skip)
            .limit(limitNumber);


        // await emailMapper(data);

        const uniqueUserIds = [...new Set(data.flatMap(key => [...key.users, key.returnLeadTo].filter((id) => id != "")))];
        const modifiedData = await userModel.find({ uid: { $in: uniqueUserIds } }, { user_email: 1, uid: 1, _id: 0 });

        const userMapping = {};
        modifiedData.forEach(user => {
            userMapping[user.uid] = user.user_email;
        });

        data.forEach((val) => {
            val.usersWithUid = val.users.map((user) => ({ uid: user, user_email: userMapping[user] }));
            val.users = val.users.map((user) => userMapping[user]);
            val.returnLeadTo = val.returnLeadTo ? userMapping[val.returnLeadTo] : "";
        });


        return res.status(200).json({
            success: true,
            message: "Fetched all distribution logic",
            data: data,
            count: count
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: MESSAGES.catchError,
            error: error.message,
        });
    }
};

leadDistributionController.filterValues = async (req, res) => {
    try {
        const { organization_id } = req.query;

        if (!organization_id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parameters",
                error: "organization_id required",
            });
        }

        const groupStage = {
            $group: {
                _id: null,
                budget: { $addToSet: "$budget" },
                location: { $addToSet: "$location" },
                project: { $addToSet: "$project" },
                property_type: { $addToSet: "$property_type" },
                source: { $addToSet: "$source" },
                users: { $addToSet: "$users" },
                api_forms: { $addToSet: "$api_forms" },
                autoRotationEnabled: { $addToSet: "$autoRotationEnabled" },
                autoRotationTime: { $addToSet: "$autoRotationTime" },
                returnLeadTo: { $addToSet: "$returnLeadTo" },
                requirement_type: { $addToSet: "$requirement_type" }
            }
        }


        const projectStage = {
            $project: {
                _id: 0,
                budget: { $reduce: { input: "$budget", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                location: { $reduce: { input: "$location", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                project: { $reduce: { input: "$project", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                property_type: { $reduce: { input: "$property_type", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                requirement_type: { $reduce: { input: "$requirement_type", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                source: { $reduce: { input: "$source", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                users: { $reduce: { input: "$users", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                api_forms: { $reduce: { input: "$api_forms", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
                autoRotationEnabled: 1,
                autoRotationTime: 1,
                returnLeadTo: 1
            }
        }


        const filterValues = await leadDistributionModel.aggregate([
            {
                $match: { organization_id }
            },
            groupStage,
            projectStage
        ])



        const modification = await userModel.find({ uid: { $in: [...filterValues[0].users, ...filterValues[0].returnLeadTo] } });

        const userMapping = {};
        modification.forEach(user => {
            userMapping[user.uid] = user.user_email;
        });


        filterValues[0].users = filterValues[0].users.map((val) => userMapping[val]);
        filterValues[0].returnLeadTo = filterValues[0].returnLeadTo
            .filter((val) => val !== '') // Filter out empty strings
            .map((val) => userMapping[val]);

        return res.status(200).json({
            success: true,
            message: "Fetched all filter values",
            data: filterValues
        })


    } catch (error) {
        return res.status(400).json({
            success: false,
            message: MESSAGES.catchError,
            error: error.message,
        });
    }
}

// leadDistributionController.leadDistributionCount = async (req, res) => {
//     try {
//         const { organization_id, filters } = req.query;

//         if (!organization_id) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid Parameters",
//                 error: "organization_id required",
//             });
//         }

//         let parsedFilters = {};
//         try {
//             if (filters) {
//                 parsedFilters = JSON.parse(filters);

//                 for (const key of Object.keys(parsedFilters)) {
//                     if (datesField.includes(key)) {
//                         if (parsedFilters[key].length && parsedFilters[key].length === 2) {
//                             parsedFilters[key] = {
//                                 $gte: new Date(parsedFilters[key][0]),
//                                 $lte: new Date(parsedFilters[key][1]),
//                             };
//                         }
//                     } else if (key === "users") {
//                         let userfilter = parsedFilters[key];
//                         delete parsedFilters[key];
//                         let result = await userModel.find({ user_email: { $in: userfilter } }, { uid: 1, _id: 0 });
//                         result = result.map((val) => val.uid);
//                         parsedFilters["users"] = { $all: result };
//                     } else {
//                         parsedFilters[key] = { $all: parsedFilters[key] };
//                     }
//                 }
//             }
//         } catch (error) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid parameter ",
//                 error: error.message
//             });
//         }

//         let count = await leadDistributionModel.countDocuments({ organization_id: organization_id, ...parsedFilters });


//         return res.status(200).json({
//             success: true,
//             message: "Fetched all records",
//             data: count,
//         })


//     } catch (error) {
//         return res.status(400).json({
//             success: false,
//             message: MESSAGES.catchError,
//             error: error.message,
//         });
//     }
// }

module.exports = leadDistributionController;