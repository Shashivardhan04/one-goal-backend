const CryptoJS = require('crypto-js');
require('dotenv').config();
exports.STAGE_CHANGE_AT = 'stage_change_at';
exports.LEAD_ASSIGN_TIME = 'lead_assign_time';
exports.ASSOCIATE = 'associate';
exports.SOURCE = 'source';
exports.PENDING = 'Pending';
exports.OVERDUE = 'Overdue';
exports.COMPLETED = 'Completed';
exports.INTERESTED = 'INTERESTED';
exports.LEAD_MANAGER = 'lead manager';
exports.TEAM_LEAD = 'team lead';
exports.SALES = 'sales';
exports.CALL_BACK_REASON = 'call_back_reason';
exports.NOT_INT_REASON = 'not_int_reason';
exports.LOST_REASON = 'lost_reason';


exports.CONSTANTS = {
  propertyStage: {
    "UNDER_CONSTRUCTION": "Under Construction",
    "READY_TO_MOVE_IN": "Ready To Move In",
    "PRE_LAUNCH": "Pre-Launch"
  },
  propertyType: {
    "RESIDENTIAL": "Residential",
    "COMMERCIAL": "Commercial",
    "INDUSTRIAL": "Industrial",
    "INSTITUTIONAL": "Institutional"
  },
  autoRotationMessages: {
    "AUTO_ROTATE_TIME_TEXT": "Auto transfers at",
    "LAST_PERSON_RECEIVED_LEAD": "No action taken on this lead",
  },
  supportPhoneNumber: {
    "SUPPORT_PHONE_NUMBER": '01206866600',
  },
  profiles: {
    "CEO":"CEO",
    "TL":"Team Lead",
    "SALES":"Sales",
    "LM":"Lead Manager",
    "OM":"Operation Manager"
  },
  notInterestedReason: {
    "LOW_BUDGET":"Low Budget",
    "NOT_PROPERTY_SEEKER":"Not A Property Seeker",
    "LOCATION_MISMATCH":"Location Mismatch",
    "DND":"DND",
    "BROKER_LEAD":"Broker Lead",
    "INVALID_NUMBER":"Invalid Number",
    "OTHER":"Other"
  },
  notInterestedReasonOther: {
    "LOW_BUDGET":"Low Budget",
    "LOCATION_MISMATCH":"Location Mismatch",
    "DND":"DND",
    "INVALID_NUMBER":"Invalid Number",
    "OTHER":"Other"
  },
  lostReasons: {
    "BETTER_DEAL":"Better Deal/Already Purchased",
    "LOAN_ISSUE":"Loan Issue",
    "FINANCIAL_CONCERN":"Financial Concern",
    "PLAN_POSTPONED":"Plan Postponed",
    "OTHER":"Other"
  },
  followUpType: {
    "CALLBACK":"Call Back",
    "MEETING":"Meeting",
    "SITE_VISIT":"Site Visit"
  },
  callBack: {
    "NOT_PICKED":"Not Picked",
    "ON_REQUEST":"On Request",
    "NOT_REACHABLE":"Not Reachable",
    "SWITCHED_OFF":"Switched Off"
  },
  loginTypes: {
    "EMAIL": "Login via Email",
    "OTP": "Login via OTP",
    "AUTO_LOGIN": "Login via autoLoginUrl",
    "MB_EMAIL": "Login via MBEMAIL"
  },
  activityTypes: {
    "LOGIN": "Login",
  },
  supportedAppVersions:['8.15.11','8.15.12','8.15.13','8.15.14','8.15.15','8.15.16','8.15.17','8.15.18','8.15.19','8.15.20','8.15.21','8.15.22'],

  // secretKey:process.env.REACT_APP_SECRET_KEY,

  leadSources: [
    { label: 'CommonFloor', value: 'CommonFloor' },
    { label: 'Facebook', value: 'Facebook' },
    { label: 'Google', value: 'Google' },
    { label: 'GSheet', value: 'GSheet' },
    { label: 'Housing', value: 'Housing' },
    { label: 'MagicBricks', value: 'MagicBricks' },
    { label: 'Makaan', value: 'Makaan' },
    { label: 'NoBroker', value: 'NoBroker' },
    { label: 'Self Generated', value: 'Self Generated' },
    { label: 'WhatsApp', value: 'WhatsApp' },
    { label: '99Acres', value: '99Acres' }
  ],

  showMobileUpdationModal: true

}  

exports.encryptPAN = (plainTextPAN) => {
  // const secretKey:any = secretKey; // Use a secure method to manage this key
  const encryptedPAN = CryptoJS.AES.encrypt(plainTextPAN, process.env.REACT_APP_SECRET_KEY).toString();
  return encryptedPAN;
};

exports.decryptPAN = (encryptedPAN) => {
   const bytes = CryptoJS.AES.decrypt(encryptedPAN, process.env.REACT_APP_SECRET_KEY);
  const decryptedPAN = bytes.toString(CryptoJS.enc.Utf8);
  return decryptedPAN;
};


exports.decryptautoLogin = (encryptedPAN) => {
  try {
    // Decode Base64 string
    const encryptedData = Buffer.from(encryptedPAN, 'base64');

    // Extract the IV (first 16 bytes) and the actual encrypted data
    const iv = CryptoJS.lib.WordArray.create(encryptedData.slice(0, 16));
    const encrypted = CryptoJS.lib.WordArray.create(encryptedData.slice(16));

    // Decrypt using the secret key and IV
    const decryptedBytes = CryptoJS.AES.decrypt(
      { ciphertext: encrypted },
      CryptoJS.enc.Utf8.parse(process.env.AUTO_LOGIN_KEY),
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const decryptedPAN = decryptedBytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedPAN) {
      return 'Decryption failed or invalid token';
    }
    
    return decryptedPAN;

  } catch (error) {
    return 'An error occurred during decryption';
  }
};

exports.encryptautoLogin = (plainPAN) => {
  try {
    // Convert the secret key into a WordArray
    const secretKey = CryptoJS.enc.Utf8.parse(process.env.AUTO_LOGIN_KEY);

    // Generate a random IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt the plainPAN using the secret key and IV
    const encrypted = CryptoJS.AES.encrypt(plainPAN, secretKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Combine IV and encrypted data (IV should be prepended to the encrypted data)
    const encryptedData = iv.concat(encrypted.ciphertext);

    // Encode the result as a Base64 string
    const encryptedBase64 = Buffer.from(encryptedData.toString(CryptoJS.enc.Hex), 'hex').toString('base64');

    return encryptedBase64;
  } catch (error) {
    return 'An error occurred during encryption';
  }
};

exports.AuthMbUrl=" http://172.29.217.34/userauthapi/token/autoLoginUrl"

exports.autoUrl="https://release.magicbricks.com/bricks/myMagicBox.html"

exports.CONTACT_FILTER_VALUES = ['budget','contact_owner_email','country_code','created_by','lead_source','location','lost_reason','next_follow_up_type','not_int_reason','other_lost_reason','other_not_int_reason','previous_owner','project','property_stage','property_type','stage','addset','campaign','inventory_type','property_sub_type','transfer_reason','previous_stage_1','previous_stage_2','previous_owner_2','previous_owner_1','transfer_by_1','transfer_by_2','call_back_reason','branch','business_vertical','api_forms','state','requirement_Type','unit_no','country','city','property_id'];

exports.CALLLOG_FILTER_VALUES = ['budget','contact_owner_email','created_by','lead_source','location','project','stage','inventory_type','duration','state'];

exports.TASK_FILTER_VALUES = ['budget','contact_owner_email','created_by','source','location','project','property_stage','property_type','stage','inventory_type','type','call_back_reason','branch','state'];
exports.MESSAGES = {
    catchError: "An error occured, please try again !!"
}

exports.ORG_RESOURCE=[
  "custom_templates", "budgets", "carousel", "comTypes", "leadSources",
  "locations", "permission", "industrialTypes", "institutionalTypes", "states",
  "resTypes", "apiForms", "transferReasons", "businessVertical"
]

exports.sanitizationString=(inp) =>{
  if (inp) {
    // Regular expression to detect potential CSV injection characters at the start of the string
    const re = /^[=+\-@\t\r]/;

    // Check if the input starts with any of the potentially dangerous characters
    if (re.test(inp)) {
      throw new Error("CSV injection detected");
    }

    // Escape every double quote with an additional double quote
    const sanitized = inp.replace(/"/g, '""');

    return sanitized;
  } else {
    return "";
  }
}

exports.getTimeDifferenceInSeconds = (t1, t2) => {
  const differenceInMilliseconds = t2 - t1;
  const differenceInSeconds = differenceInMilliseconds / 1000;
  return differenceInSeconds;
}