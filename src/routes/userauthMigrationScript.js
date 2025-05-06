const express = require('express');
const admin = require("../../firebaseAdmin");
// const { findOne } = require('../models/organizationSchema');
// const packageDetailsController = require("../controllers/packageDetailsController")
const userModel = require("../models/userSchema")
const organizationModel=require("../models/organizationSchema")
const organizationResourceModel= require("../models/organizationResourcesSchema")
// const organizationResourceModelTest=require("../models/organizationResourcesTestSchema")
var router = express.Router();
// import { FirebaseScrypt } from 'firebase-scrypt'
// const { FirebaseScrypt } = require("firebase-scrypt")

const fetchAllUsers = async (nextPageToken = undefined, allUsers = []) => {
  try {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    result.users.forEach(userRecord => {
      allUsers.push(userRecord.toJSON());
    });

    console.log("pageATOken", result.pageToken)
    if (result.pageToken) {
      await fetchAllUsers(result.pageToken, allUsers);
    }
  } catch (error) {
    throw new Error('Error fetching users: ' + error.message);
  }
  return allUsers;
};


router.post("/script", async (req, res) => {
    try {
      const snapshot = await admin.firestore().collection("fcmTokens").get();
      let allUsers = await fetchAllUsers();
  
      const bulkOps = [];
  
      allUsers.forEach((val) => {
        const customClaims = val.customClaims || {};
        let fcmToken = '';
  
        snapshot.forEach((doc) => {
          const fieldsProto = doc._fieldsProto;
          if (val.uid in fieldsProto) {
            fcmToken = fieldsProto[val.uid].stringValue;
          }
        });
  
        bulkOps.push({
          updateOne: {
            filter: { uid: val.uid },
            update: {
              $set: {
                password: val.passwordHash,
                passwordSalt: val.passwordSalt,
                session_id: "",
                device_type: "",
                first_login: customClaims.firstLogin || false,
                role: customClaims.role,
                fcm_token: fcmToken
              },
            },
          },
        });
      });
  
      if (bulkOps.length > 0) {
        await userModel.bulkWrite(bulkOps);
      }
  
      return res.status(200).json({
        message: "Updated successfully",
        dataLength: bulkOps.length,
        data: bulkOps,
      });
    } catch (error) {
      console.error("Error listing users:", error.message);
      return res.status(400).json({
        error: error.message
      });
    }
  });
  


const fetchAllOrganizations = async () => {
  try {
    const organizationsRef = admin.firestore().collection('organizations');
    const snapshot = await organizationsRef.get();

    if (snapshot.empty) {
      console.log('No matching documents.');
      return [];
    }

    const organizations = [];
    snapshot.forEach(doc => {
      const data = doc.data();

      // adding organization_id
      data.organization_id = doc.id;

      for (const key in data) {
        if (data[key] instanceof admin.firestore.Timestamp) {
          data[key] = data[key].toDate();
        }
      }

      if (data.created_at && typeof data.created_at === 'object' && data.created_at.seconds && data.created_at.nanoseconds) {
        data.created_at = new Date(data.created_at.seconds * 1000 + data.created_at.nanoseconds / 1000000);
      }


      organizations.push(data);
    });

    // console.log(organizations);
    return organizations;
  } catch (error) {
    console.error('Error fetching documents: ', error);
    return [];
  }
}


router.post("/orgScript", async (req, res) => {
  try {
    const org = await fetchAllOrganizations();


    await organizationModel.insertMany(org);

    return res.status(200).json({
      message: "organizations migrated successfully",
      data: org.length,
    });
  } catch (error) {
    console.error("Error listing users:", error.message);
    return res.status(400).json({
      error: error.message
    });
  }
})

const fetchAllOrganizationsResources = async () => {
    try {
        const organizationsRef = admin.firestore().collection('organizationResources');
        const snapshot = await organizationsRef.get();

        if (snapshot.empty) {
            console.log('No matching documents.');
            return [];
        }

        const organizationResources = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Ensure temp is an array before using forEach
            // if (Array.isArray(temp)) {
            //     temp.forEach((data) => {
            //         organizationResources.push(data)
                    
            //     });
            // }

             if (data.businessVertical) {
                    let obj = {};
                    obj["organization_id"] = data.organization_id?data.organization_id:"";
                    obj["resource_type"] = "businessVertical";
                    obj["businessVertical"] = [];
                    data.businessVertical.forEach((val) => {
                        obj["businessVertical"].push({
                            businessVertical: val
                        });
                    });

                    organizationResources.push(obj);
                }
            
       if(data.apiForms){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="apiForms"
            obj["apiForms"]=[]
            data.apiForms.forEach((val)=>{
                obj["apiForms"].push({
                    apiForm:val
                })
            })

            organizationResources.push(obj)
          } 

              if(data.TransferReasons){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="transferReasons"
            obj["transferReasons"]=[]
            data.TransferReasons.forEach((val)=>{
                obj["transferReasons"].push({
                    transferReason:val
                })
            })

            organizationResources.push(obj)
          }

              if(data.resTypes){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="resTypes"
            obj["resTypes"]=[]
            data.resTypes.forEach((val)=>{
                obj["resTypes"].push({
                    resType:val
                })
            })

            organizationResources.push(obj)
          }

          

          if(data.comTypes){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="comTypes"
            obj["comTypes"]=[]
            data.comTypes.forEach((val)=>{
                obj["comTypes"].push({
                    comType:val
                })
            })

            organizationResources.push(obj)
          }

          if(data.institutionalType){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="institutionalTypes"
            obj["institutionalTypes"]=[]
            data.institutionalType.forEach((val)=>{
                obj["institutionalTypes"].push({
                    institutionalType:val
                })
            })

            organizationResources.push(obj)
          }

          if(data.industrialType){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="industrialTypes"
            obj["industrialTypes"]=[]
            data.industrialType.forEach((val)=>{
                obj["industrialTypes"].push({
                    industrialType:val
                })
            })

            organizationResources.push(obj)
          }

            if(data.locations){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="locations"
            obj["locations"]=[]
            data.locations.forEach((val)=>{
                obj["locations"].push({
                    location:val.location_name,
                    created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
                })
            })

            organizationResources.push(obj)
          }

             if(data.state){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="states"
            obj["states"]=[]
            data.state.forEach((val)=>{
                obj["states"].push({
                    state:val.state_name,
                    created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
                })
            })

            organizationResources.push(obj)
          }

          if(data.budgets){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="budgets"
            obj["budgets"]=[]
            data.budgets.forEach((val)=>{
                obj["budgets"].push({
                    budget:val.budget,
                    created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
                })
            })

            organizationResources.push(obj)
          }

          let objImage={
            "organization_id":data.organization_id?data.organization_id:"",
            "resource_type":"carousel",
            "carousel":[]
          };

          if(data.logoList){
            
            data.logoList.forEach((val)=>{
                objImage["carousel"].push({
                    imageType:"LOGO",
                    imageName:val.image_name,
                    url:val.url,
                    created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
                })
            })
            // organizationResources.push(objImage)

          }

          if(data.carousel){
            data.carousel.forEach((val)=>{
                objImage["carousel"].push({
                    imageType:"IMAGE",
                    imageName:val.image_name,
                    url:val.url,
                    created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
                })
            })

            // organizationResources.push(objImage)

          }

          organizationResources.push(objImage)

           if(data.leadSources){
            let obj={};

            obj["organization_id"]=data.organization_id?data.organization_id:"";
            obj["resource_type"]="leadSources"
            obj["leadSources"]=[]
            data.leadSources.forEach((val)=>{
                obj["leadSources"].push({
                    leadSource:val.leadSource,
                    created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
                })
            })

            organizationResources.push(obj)
          }

          if(data.permission){
            let obj={};
            obj["organization_id"]=data.organization_id;
            obj["resource_type"]="permission"
            obj["permission"]={
              ["Sales"]:data.permission["Sales"],
              ["Team Lead"]:data.permission["Team Lead"]
            }
            organizationResources.push(obj)
          }
        });

        return organizationResources;
    } catch (error) {
        console.error('Error fetching documents: ', error);
        return [];
    }
};


router.post("/orgResourcesScript", async (req, res) => {
    const session = await organizationResourceModel.startSession();
    session.startTransaction();
    try {
        const org = await fetchAllOrganizationsResources();
        const orgCustom = [];
        const customTemplates = await organizationResourceModel.find({ custom_templates: { $exists: true } }).lean();

        if (customTemplates) {
            for (const data of customTemplates) {
                if (data) {
                    let obj = {};

                    obj["organization_id"] = data.organization_id ? data.organization_id : "";
                    obj["resource_type"] = "custom_templates";
                    obj["custom_templates"] = [];

                    for (const val of data.custom_templates) {
                        const temp = await userModel.findOne({ user_email: val.created_by });
                        obj["custom_templates"].push({
                            template_name: val.template_name,
                            template_data: val.template_data,
                            modified_by: temp && temp.uid ? temp.uid : "",
                            created_at: new Date(val.created_at)
                        });

                        // await organizationResourceModel.deleteOne({
                        //     organization_id: data.organization_id,
                        //     custom_templates: { $exists: true }
                        // }, { session });
                    }

                    orgCustom.push(obj);
                }
            }
        }

        await organizationResourceModel.insertMany(orgCustom, { session });
        await organizationResourceModel.insertMany(org, { session });




        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Organizations resources migrated successfully",
            dataLength: orgCustom.length + org.length,
            data: { orgCustom, org },
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error migrating resources:", error.message);
        return res.status(400).json({
            error: error.message
        });
    }
});





const crypto = require('crypto');
const base64url = require('base64url');
const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16; // Should match block length (16 bytes for AES)
const KEYLEN = 256 / 8;

const scryptConfig = {
  algorithm: 'SCRYPT',
  signerKey: Buffer.from('R0MEZMm1Yq0WLP21Go5RFYE2JF7LD2v5C3J4UGNBjutJid+QawrNVzxzV9mtXexRwqgrd8qnHMSW2erxpNipHQ==', 'base64'),
  saltSeparator: Buffer.from('Bw==', 'base64'),
  rounds: 8,
  memCost: 14
};

function base64decode(encoded) {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
const scryptHash = (password, salt, callback) => {
  if (!password) throw new Error('Error hashing password: password parameter missing');
  if (!salt) throw new Error('Error hashing password: salt parameter missing');

  const saltWithSeparator = Buffer.concat([Buffer.from(salt, 'base64'), scryptConfig.saltSeparator]);
  const iv = Buffer.alloc(IV_LENGTH, 0);
  crypto.scrypt(password, saltWithSeparator, KEYLEN, {
      N: Math.pow(2, scryptConfig.memCost),
      r: scryptConfig.rounds,
      p: 1
    }, (err, derivedKey) => {
      if (err) throw err;
      //   const hmac = crypto.createHmac('sha256', scryptConfig.signerKey);
      //   hmac.update(derivedKey);
      //   const hash = hmac.digest('base64');
      //   callback(hash);
      try {
        const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
        const hashedPassword = Buffer.concat([
          cipher.update(scryptConfig.signerKey),
          cipher.final()
        ]).toString('base64');
        callback(null, hashedPassword);
      } catch (error) {
        callback(error);
      }

    });
};

const validatePassword = (password, hash, salt, callback) => {
  if (!password) throw new Error('Error verifying password: password parameter missing');
  if (!salt) throw new Error('Error verifying password: salt parameter missing');
  if (!hash) throw new Error('Error verifying password: hash parameter missing');

  scryptHash(password, salt, (err, generatedHash) => {
    if (err) {
      return callback(err);
    }

    const knownHash = base64decode(hash);
    const bGeneratedHash = base64decode(generatedHash);
    if (bGeneratedHash.length !== knownHash.length) {
      // timingSafeEqual throws when buffer lengths don't match
      try {
        crypto.timingSafeEqual(knownHash, knownHash);
      } catch (error) {
        return callback(null, false);
      }
    }

    const isValid = crypto.timingSafeEqual(bGeneratedHash, knownHash);
    callback(null, isValid);
  });
};

// Example usage


router.get("/passwordHash", async (req, res) => {
  const inputPassword = 'Sharmaji@0709';
  const storedHash = 'F4VvPc6Znh8Ug48wdGwi4xa3N7TFuSm5HNtABxw0DwfzDaGh8O7jJbjuSRgf0BIThkEq2Bsnn7jlomSr7KG9QA=='; // Example hash from Firebase
  const salt = 'pYyaKk2NCNGp6A==';

  validatePassword(inputPassword, storedHash, salt, (err, isValid) => {
    if (isValid) {
      console.log('Password is valid!');
      return res.send('Password is valid!')
    } else {
      console.log('Invalid password.');
      return res.send('Invalid password.')
    }
  });

});




const firebaseParameter = {
  algorithm: "SCRYPT",
  signerKey: "R0MEZMm1Yq0WLP21Go5RFYE2JF7LD2v5C3J4UGNBjutJid+QawrNVzxzV9mtXexRwqgrd8qnHMSW2erxpNipHQ==",
  saltSeparator: "Bw==",
  rounds: 8,
  memCost: 14,
}




router.get("/passwordHash", async (req, res) => {
  const scrypt = new FirebaseScrypt(firebaseParameter);

  const password = "YashK@#123"
  const salt = "cucVFzwpVu6jGw=="
  const hash = "_lICy_TpU3rsok_rEIVWs8rIxArse2x7u_43RMG6NsBpx5xdjNm3IOOJFgunigt084PdjURboJahybKvVL9N2A=="

  scrypt.verify(password, salt, hash)
  .then((isValid) => {
    if (isValid) {
      return res.send("valid password")
    } else {
      return res.send("Invalid password")
    }
  })

});



module.exports = router;


            
        //   if(data.apiForms){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="apiForms"
        //     obj["apiForms"]=[]
        //     data.apiForms.forEach((val)=>{
        //         obj["apiForms"].push({
        //             apiForm:val
        //         })
        //     })

        //     organizationResources.push(obj)
        //   } 
          
        //   if(data.TransferReasons){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="transferReasons"
        //     obj["transferReasons"]=[]
        //     data.TransferReasons.forEach((val)=>{
        //         obj["transferReasons"].push({
        //             transferReason:val
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }


        //   if(data.resTypes){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="resTypes"
        //     obj["resTypes"]=[]
        //     data.resTypes.forEach((val)=>{
        //         obj["resTypes"].push({
        //             resType:val
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

          

        //   if(data.comTypes){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="comTypes"
        //     obj["comTypes"]=[]
        //     data.comTypes.forEach((val)=>{
        //         obj["comTypes"].push({
        //             comType:val
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

        //   if(data.institutionalType){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="institutionalTypes"
        //     obj["institutionalTypes"]=[]
        //     data.institutionalType.forEach((val)=>{
        //         obj["institutionalTypes"].push({
        //             institutionalType:val
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

        //   if(data.industrialType){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="industrialTypes"
        //     obj["industrialTypes"]=[]
        //     data.industrialType.forEach((val)=>{
        //         obj["institutionalTypes"].push({
        //             industrialType:val
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

        //   if(data.locations){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="locations"
        //     obj["locations"]=[]
        //     data.locations.forEach((val)=>{
        //         obj["locations"].push({
        //             location:val.location_name,
        //             created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

        //   if(data.state){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="states"
        //     obj["states"]=[]
        //     data.state.forEach((val)=>{
        //         obj["states"].push({
        //             state:val.state_name,
        //             created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

        //   if(data.budgets){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="budgets"
        //     obj["budgets"]=[]
        //     data.budgets.forEach((val)=>{
        //         obj["budgets"].push({
        //             budget:val.budget,
        //             created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

        //   if(data.logoList){
        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="carousel"
        //     obj["carousel"]=[]
        //     data.logoList.forEach((val)=>{
        //         obj["carousel"].push({
        //             imageType:"LOGO",
        //             imageName:val.image_name,
        //             url:val.url,
        //             created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
        //         })
        //     })
        //     organizationResources.push(obj)

        //   }

        //   if(data.carousel){
        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="carousel"
        //     obj["carousel"]=[]
        //     data.carousel.forEach((val)=>{
        //         obj["carousel"].push({
        //             imageType:"IMAGE",
        //             imageName:val.image_name,
        //             url:val.url,
        //             created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
        //         })
        //     })

        //     organizationResources.push(obj)

        //   }

        //    if(data.leadSources){
        //     let obj={};

        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="leadSources"
        //     obj["leadSources"]=[]
        //     data.leadSources.forEach((val)=>{
        //         obj["leadSources"].push({
        //             leadSource:val.leadSource,
        //             created_at:new Date(val.created_at.seconds * 1000 + val.created_at.nanoseconds / 1000000)
        //         })
        //     })

        //     organizationResources.push(obj)
        //   }

        //   if(data.permissions){
        //     let obj={};
        //     obj["organization_id"]=data.organization_id;
        //     obj["resource_type"]="permission"
        //     obj["permission"]={}
            
        //     obj["permissions"]["Sales"]=[
        //         "Budget",
        //         "Contact No.",
        //         "Created At",
        //         "Customer Name",
        //         "Email",
        //         "Source",
        //         "Assign Time",
        //         "Owner",
        //         "Follow Up Date Time",
        //         "Follow Up Type",
        //         "Property Type",
        //         "Property Stage",
        //         "Project",
        //         "Location"
        //       ]
        //       obj["permissions"]["Team Lead"]=[
        //         "Budget",
        //         "Contact No.",
        //         "Created At",
        //         "Created By",
        //         "Customer Name",
        //         "Email",
        //         "Source",
        //         "Assign Time",
        //         "Location",
        //         "Project",
        //         "Property Stage",
        //         "Property Type",
        //         "Follow Up Date Time",
        //         "Owner"
        //       ]

        //       organizationResources.push(obj)
        //   } 