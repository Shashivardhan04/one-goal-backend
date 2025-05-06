// const userAuthorizationModel = require("../models/userAuthorizationSchema.js");
const axios = require("axios");
const https = require('https');
const qs = require('qs');

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// Add an interceptor to include the Host header
axiosInstance.interceptors.request.use(
  (config) => {
    config.headers["Host"] = process.env.MAGICBRICKS_HOST_URL || "api.magicbricks.com"; // Set your desired host here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const mbPostPropertyController = {};

let MB_BRICKS_URL = process.env.MB_BRICKS_URL;
let MB_MOBILE_API_URL = process.env.MB_MOBILE_API_URL;
let MB_POST_PROPERTY_URL = process.env.MB_POST_PROPERTY_URL;

// mbPostPropertyController.WapPropertyDetails = async (req, res) => {
//   try {
//     // Make the request to the target URL using 
//     // console.log("params",req.query, "body",req.body, "headers",req.headers);
//     const response = await axios({
//       method: 'post',
//       url: 'http://172.29.32.37:8080/bricks/wapPropertyDetails.html',
//       headers: req.headers,
//       params: req.query,
//       data: req.body
//     });
//     console.log("response",response.data);
//     return res.status(200).json({
//       success: true,
//       data: response.data,
//  
//     });
//   } catch (error) {
//     // console.log("An error occurred", error);
//     return res.status(400).json({
//       success: false,
//       message: "An error occurred",
//       error: error.message,
//     });
//   }
// };

// mbPostPropertyController.MyMobileApiMmbResponses = async (req, res) => {
//   try {
//     // Make the request to the target URL using 
//     // console.log("params",req.query, "body",req.body, "headers",req.headers);
//     const response = await axios({
//       method: 'post',
//       url: 'http://172.29.32.61:8080/mbmobileapi/mmb/responses',
//       headers: req.headers,
//       params: req.query,
//       data: req.body
//     });
//     console.log("response",response.data);
//     return res.status(200).json({
//       success: true,
//       data: response.data,
//  
//     });
//   } catch (error) {
//     // console.log("An error occurred", error);
//     return res.status(400).json({
//       success: false,
//       message: "An error occurred",
//       error: error.message,
//     });
//   }
// };

// mbPostPropertyController.FindBuyerOrSeller = async (req, res) => {
//   try {
//     // Make the request to the target URL using 
//     // console.log("params",req.query, "body",req.body, "headers",req.headers);
//     const response = await axios({
//       method: 'get',
//       url: 'https://apistg.magicbricks.com/bricks/findBuyerOrSeller.html',
//       headers: req.headers,
//       params: req.query,
//       data: req.body
//     });
//     console.log("response",response.data);
//     return res.status(200).json({
//       success: true,
//       data: response.data,
//  
//     });
//   } catch (error) {
//     // console.log("An error occurred", error);
//     return res.status(400).json({
//       success: false,
//       message: "An error occurred",
//       error: error.message,
//     });
//   }
// };

mbPostPropertyController.BricksDoLoginByType = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const urlEncodedData = qs.stringify(req.body);
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_BRICKS_URL}/dologinbytype.html?${serializedQuery}`,
      headers: req.headers,
      data: urlEncodedData
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.BricksDoMobileLogin = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const urlEncodedData = qs.stringify(req.body);
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_BRICKS_URL}/domobilelogin.html?${serializedQuery}`,
      headers: req.headers,
      data: urlEncodedData
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.BrickWapPropertyDetails = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_BRICKS_URL}/wapPropertyDetails.html?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    // console.log("response",response);
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobileResponses = async (req, res) => {
  try {
    // Make the request to the target URL using 
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/mmb/responses?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.BricksFindBuyerOrSeller = async (req, res) => {
  try {
    // Make the request to the target URL using 
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const urlEncodedData = qs.stringify(req.body);
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_BRICKS_URL}/findBuyerOrSeller.html?${serializedQuery}`,
      headers: req.headers,
      data: urlEncodedData
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.BricksB2BCampaignTracking = async (req, res) => {
  try {
    // Make the request to the target URL using 
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_BRICKS_URL}/b2bCampaignTracking.html?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MBMobileAPIGetMBPrimePackageDetail = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/get-mbprime-package-details?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobileCaptureLeadsAction = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // let url = `${MB_MOBILE_API_URL}/mmb/captureLeadsAction?`
    // console.log("kkl",url)
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/mmb/captureLeadsAction?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.BricksUpdateLeadStatus = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_BRICKS_URL}/updateLeadStatus.html?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobileLogSelfVerifyAction = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_MOBILE_API_URL}/logselfverifyaction?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobileTopCitiesMaster = async (req, res) => {
  try {
    // Make the request to the target URL using 
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/master/top-cities?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobilePPRecordIntent = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_MOBILE_API_URL}/pp/record-intent?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.GetUserListings = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const urlEncodedData = qs.stringify(req.body);
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_POST_PROPERTY_URL}/getUserListing?${serializedQuery}`,
      headers: req.headers,
      data: urlEncodedData
    });
    return res.status(200).send((response.data))
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.GetSubscriptionMessages = async (req, res) => {
  try {
    // Make the request to the target URL using 
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const urlEncodedData = qs.stringify(req.body);
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_POST_PROPERTY_URL}/getSubscriptionMessages?${serializedQuery}`,
      headers: req.headers,
      data: urlEncodedData
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.SaveMobTppmtTempData = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_POST_PROPERTY_URL}/saveMobTppmtTempData.html?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.UpdateMobTppmtTempData = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_POST_PROPERTY_URL}/updateMobTppmtTempData.html?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MBMobileCheckPackageAvailability = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/check-package-availability?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.ValidateQuotient = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_POST_PROPERTY_URL}/validateQuotient?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.WapPostProperty = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("GVFRDC",req.query)
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_POST_PROPERTY_URL}/wapPostProperty?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.WapPostPropertyPost = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("GVFRDC",req.query)
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'post',
      url: `${MB_POST_PROPERTY_URL}/wapPostProperty?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobileProperties = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/mmb/properties?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobileCitiesMaster = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/master/cities?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.MMBMobileLocalitiesMaster = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/master/localities?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.BricksProjectSociety = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_BRICKS_URL}/projectSociety.html?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.agentBenifits = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log( "headers",req.headers,`${MB_MOBILE_API_URL}/mmb/agent-benefits`);
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_MOBILE_API_URL}/mmb/agent-benefits`,
      headers: req.headers
    });
    // console.log(response.data)
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.getKeywordAutoSuggestListForMobile = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log( "headers",req.headers,`${MB_MOBILE_API_URL}/mmb/agent-benefits`);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_BRICKS_URL}/ajax/getKeywordAutoSuggestListForMobile.json?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    console.log(response.data)
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.getPostProperty = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log( "headers",req.headers,`${MB_MOBILE_API_URL}/mmb/agent-benefits`);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_POST_PROPERTY_URL}/getPostProperty?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    console.log(response.data)
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.completionScore = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log( "headers",req.headers,`${MB_MOBILE_API_URL}/mmb/agent-benefits`);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_POST_PROPERTY_URL}/completionScore?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    // console.log(response.data)
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.validateQuotientForEdit = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log( "headers",req.headers,`${MB_MOBILE_API_URL}/mmb/agent-benefits`);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_POST_PROPERTY_URL}/validateQuotientForEdit?${serializedQuery}`,
      headers: req.headers,
      data: req.body
    });
    // console.log(response.data)
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

mbPostPropertyController.bricksWapPostProperty = async (req, res) => {
  try {
    // Make the request to the target URL using 
    // console.log("params",req.query, "body",req.body, "headers",req.headers);
    const serializedQuery =qs.stringify(req.query, { arrayFormat: 'repeat' })
    const urlEncodedData = qs.stringify(req.body);
    const response = await axiosInstance({
      method: 'get',
      url: `${MB_BRICKS_URL}/wapPostProperty.html?${serializedQuery}`,
      headers: req.headers,
      data: urlEncodedData
    });
    return res.status(200).send(response.data)
  } catch (error) {
    // console.log("An error occurred", error);
    return res.status(400).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};


module.exports = mbPostPropertyController;
