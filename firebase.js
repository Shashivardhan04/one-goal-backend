const firebase = require("firebase/app");
const auth = require("firebase/auth");
// const auth = require("firebase/auth");
// import "firebase/firestore";
// import "firebase/functions";
// import "firebase/storage";
// import "firebase/database";

const app = firebase.initializeApp({
  apiKey: "AIzaSyD-imDQKQinOEbHnLia8IIAawsZ8h8U4UU",
  authDomain: "read-pro.firebaseapp.com",
  databaseURL: "https://read-pro-default-rtdb.firebaseio.com",
  projectId: "read-pro",
  storageBucket: "read-pro.appspot.com",
  messagingSenderId: "181749393848",
  appId: "1:181749393848:web:7b6f446c116ef72165474d",
  measurementId: "G-LKK64PEBB7",
});

// console.log(app.auth().signInWithEmailAndPassword());

// updatePasswordUser();

// export const firestore = app.firestore();
// export const functions = app.functions();
// export const storage = app.storage();
// export const db = app.database();
// export default app;
module.exports=app;