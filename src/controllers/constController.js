const { CONSTANTS } = require("../constants/constants");

const constantController = {};

constantController.fetch = async (req, res) => {

    try {

        const data = CONSTANTS;
        return res.status(200).json({
            success: true,
            data: data
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        })
    }
}

module.exports = constantController;