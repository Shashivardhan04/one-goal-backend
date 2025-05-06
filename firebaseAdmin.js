const admin = require("firebase-admin");
const serviceAccount = require("./read-pro-firebase-adminsdk-yj5wq-69599c58f5.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "read-pro.appspot.com",
});

module.exports = admin;

