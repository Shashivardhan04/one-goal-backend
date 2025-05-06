const express = require("express");
const router = express.Router();
const app = require("../../firebase");

router.post("/", async (req, res) => {
    let oldPassword = req.body.old_password;
    let newPassword = req.body.new_password;
    let userEmail = req.body.user_email;
    if(oldPassword && newPassword && userEmail){
      try{
        await app.auth().signInWithEmailAndPassword(
          userEmail,
          oldPassword
        );
        const currentUser = app.auth().currentUser;
        await currentUser?.updatePassword(newPassword);
        return res.json({"success": true});
      }catch(err){
        return res.status(400).json({"success": false,"error":err});
      }
    }else{
      return res.status(400).json({"success": false});
    }
  });

  module.exports = router;