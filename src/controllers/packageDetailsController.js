const packageDetailsModel = require("../models/packageDetailsSchema");
const { MESSAGES } = require("../constants/constants");
const {query} = require("../../src/database/mariaDb");


packageDetailsController = {};

const WHATSAPP_SERVICE_ID = "13739";


/**
 * Fetches all active packages for a specific organization.
 * 
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
packageDetailsController.fetchAll = async (req, res) => {
    try {
        const { organization_id } = req.query;
        let clientHadWhatsappPackageInLast1Year = false;

        // Validate the request parameters
        if (!organization_id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parameters",
                error: "organization_id is required",
            });
        }

        // Fetch all active packages for the given organization
        const allPackages = await packageDetailsModel.find({
            organization_id: organization_id,
            package_status: "active",
        });

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const whatsappPackageDataOfLast1Year = await packageDetailsModel.find({
            organization_id: organization_id,
            service_id: WHATSAPP_SERVICE_ID,
            created_at: {
                $gte: oneYearAgo, // Greater than or equal to one year ago
                $lte: new Date() // Less than or equal to today
            }
        });

        if(whatsappPackageDataOfLast1Year.length > 0){
            clientHadWhatsappPackageInLast1Year = true;
        }

        // Separate packages into license and WhatsApp categories
        let totalWhatsappPackageAmount = 0;
        const licensePackages = [];
        const whatsappPackages = [];

        allPackages.forEach((pkg) => {
            if (pkg.service_id === WHATSAPP_SERVICE_ID) {
                whatsappPackages.push(pkg);
                totalWhatsappPackageAmount += Number(pkg.no_of_unit || 0); // Ensure no_of_unit is safely converted to a number
            } else {
                licensePackages.push(pkg);
            }
        });

        // Return the categorized data along with the total WhatsApp package amount
        return res.status(200).json({
            success: true,
            data: {
                licensePackages,
                whatsappPackages,
                totalWhatsappPackageAmount,
                clientHadWhatsappPackage:clientHadWhatsappPackageInLast1Year
            },
            message: "Data fetched successfully",
        });

    } catch (error) {
        // Handle unexpected errors gracefully
        console.error("Error in fetchAll:", error);

        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while fetching packages.",
            error: error.message,
        });
    }
};
  
packageDetailsController.OrgHadCallRecordingSubscription = async (req, res) => {
    try {
        const { organization_id } = req.query;
        let orgHadCallRecordingSubscription = false;

        if (!organization_id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parameters",
                error: "organization_id required",
            });
        }

        const callRecordingPackages = await packageDetailsModel.find({ organization_id: organization_id, service_id: "13738" });
        if (callRecordingPackages.length > 0) {
            orgHadCallRecordingSubscription = true;
        }
        return res.status(200).json({
            success: true,
            data: {
                orgHadCallRecordingSubscription
            },
            message: "Data Fetched Successfully"
        })


    } catch (error) {
        return res.status(400).json({
            success: false,
            message: MESSAGES.catchError,
            error: error.message,
        });
    }
}

// packageDetailsController.FetchAllV2 = async (req, res) => {
//     try {
//         const { organization_id } = req.query;

//         let totalWhatsappPackageAmount = 0;

//         if (!organization_id) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid Parameters",
//                 error: "organization_id required",
//             });
//         }

//         const packages = await packageDetailsModel.find({ organization_id: organization_id, package_status: "active" });

//         // SQL query string with placeholders
//         const sql = `select * from pkg_services where organization_id = '${organization_id}' and isactive = 'active' and service_id = '13739';`;

//         // Execute the query with provided values
//         const services = await query(sql);

//         services.forEach(service => {
//             totalWhatsappPackageAmount += Number(service.no_of_unit);
//         })

//         return res.status(200).json({
//             success: true,
//             data: {
//                 packages,
//                 services,
//                 totalWhatsappPackageAmount
//             },
//             message: "Data fetched successfully"
//         })


//     } catch (error) {
//         return res.status(400).json({
//             success: false,
//             message: MESSAGES.catchError,
//             error: error.message,
//         });
//     }
// }


module.exports = packageDetailsController;