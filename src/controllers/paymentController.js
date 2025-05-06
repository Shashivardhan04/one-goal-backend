var ObjectId = require("mongoose").Types.ObjectId;
const paymentModel = require("../models/paymentSchema");
const userModel = require("../models/userSchema");
const Razorpay = require('razorpay')
const crypto = require('crypto')
const cors = require('cors')
require("dotenv").config();
const { v4: uuidv4 } = require('uuid')
// const { verifyBody } = require("../createinvoice/utils");
// const { getInvoice } = require("../createinvoice/invoice");



const paymentController = {};

const datesField = [
  "verified_at",
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

paymentController.Create = async (req, res) => {
  const instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
    // key_id: "rzp_test_PBAMaFcQYsevYS",
    // key_secret: "VZx44m2cOlzDfSynE7HBd2o6",
  });
  const options = {
    amount: Number(req.body.amount * 100),
    currency: req.body.currency,
    receipt: uuidv4(),
  };
  const order = await instance.orders.create(options);

  res.status(200).json({
    success: true,
    order,
  });
};

paymentController.Verification = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, uid, contact_no, contact_owner_email, organization_id, amount, currency, receipt,
     invoice_no,
    company,
    email,
    address,
    transaction_date,
    due_date,
    paymentFrom,
    paymentTill,
    units,
    igst,
    items 
  } =
    req.body;
  console.log("payment request", req.body);
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.KEY_SECRET)
    // .createHmac("sha256", "VZx44m2cOlzDfSynE7HBd2o6")
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;
  const instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET, 
    // key_id: "rzp_test_PBAMaFcQYsevYS",
    // key_secret: "VZx44m2cOlzDfSynE7HBd2o6",
  });
  const payment = await instance.payments.fetch(razorpay_payment_id);
 
  if (isAuthentic) {
    // Database comes here
    if (payment?.status === "failed") {
      await paymentModel.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        uid,
        contact_no,
        amount,
        currency,
        receipt,
        contact_owner_email,
        organization_id,
        status: "FAILED",
        invoice_no,
        company,
        email,
        address,
        transaction_date,
        due_date,
        paymentFrom,
        paymentTill,
        units,
        igst,
        items: [
          {
            serialNumber:items[0].serialNumber,
            description:items[0].description,
            qty: items[0].qty,
            hsn: items[0].hsn,
            rate: items[0].rate,
            taxAmount: items[0].taxAmount,
          }
        ]
      });
    }
    else {
      await paymentModel.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        uid,
        contact_no,
        amount,
        currency,
        receipt,
        contact_owner_email,
        organization_id,
        status: "SUCCESS",
        invoice_no,
        company,
        email,
        address,
        transaction_date,
        due_date,
        paymentFrom,
        paymentTill,
        units,
        igst,
        items: [
          {
            serialNumber:items[0].serialNumber,
            description:items[0].description,
            qty: items[0].qty,
            hsn: items[0].hsn,
            rate: items[0].rate,
            taxAmount: items[0].taxAmount,
          }
        ]
      });
      
    }
    // res.redirect(
    //   `http://localhost:3000/paymentsuccess?reference=${razorpay_payment_id}`
    // );
    res.status(200).json({
      success: true,
    });
  } else {
    await paymentModel.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      uid,
      contact_no,
      amount,
      currency,
      receipt,
      contact_owner_email,
      organization_id,
      status: "FAILED",
      invoice_no,
      company,
      email,
      address,
      transaction_date,
      due_date,
      paymentFrom,
      paymentTill,
      units,
      igst,
      items: [
        {
          serialNumber:items[0].serialNumber,
          description:items[0].description,
          qty: items[0].qty,
          hsn: items[0].hsn,
          rate: items[0].rate,
          taxAmount: items[0].taxAmount,
        }
      ]
    });
    res.status(400).json({
      success: false,
    });
  }
};

paymentController.Search = async (req, res) => {
  const uid = req.body.uid;
  let filter = req.body.filter;
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
    } else if (key === "reporting_to") {
      report = filter[key];
      cond = true;
      delete filter[key];
    } else {
      filter[key] = { $in: filter[key] };
    }
  });

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
      customer_name_list.push(re);
    } else if (search !== "") {
      customer_name_list.push(re);
    }
  });

  if (contact_list.length !== 0) {
    filter["contact_no"] = { $in: contact_list };
  }
  if (customer_name_list.length !== 0) {
    filter["receipt"] = { $in: customer_name_list };
  }
  console.log("UID:" + uid);
  const resultUser = await userModel.find({ uid });
  if (resultUser.length === 0) {
    res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.profile;
  const organization_id = user.organization_id;

  let leads;

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
            receipt: { $in: reportingUsers },
          };
        leads = await paymentModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        const count = leads.length;

        res.send({ payments: leads, count });
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

        leads = await paymentModel
          .find(find, { _id: 0, __v: 0 })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);

        res.send(leads);
      } catch (error) {
        res.send({ error });
      }
    }
  } else if (profile.toLowerCase() == "team lead") {
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
        if (filter?.stage) {
          find = { uid: { $in: usersList }, ...filter };
        }
        else {
          find = { uid: { $in: usersList }, ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] } };
        }
      }
      else {
        if (filter?.stage) {
          find = {
            uid: { $in: interesectionArray },
            ...filter,
          };
        }
        else {
          find = {
            uid: { $in: interesectionArray },
            ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] }
          };
        }
      }
      leads = await paymentModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      res.send(leads);
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      let find;
      if (cond) {
        find = reportingUsers.includes(uid)
          ? { uid, ...filter }
          : "";
      }
      if (find === "") {
        return res.send([]);
      }
      else {
        if (filter?.stage) {
          find = { uid, ...filter };
        }
        else {
          find = { uid, ...filter, "stage": { $nin: ["LOST", "NOT INTERESTED"] } };
        }
      }
      leads = await paymentModel
        .find(find, { _id: 0, __v: 0 })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      res.send(leads);
    } catch (error) {
      res.send({ error });
    }
  }
};


paymentController.CreatePdf = async (req, res) => {
  const result = verifyBody(req.body)
  if (result.success) {
    getInvoice(req.body).then(pdf => {
      res.status(200)
      res.contentType("application/pdf");
      res.send(pdf);
    }).catch(err => {
      console.error(err)
      res.status(500).send({ success: false, error: "something went wrong" })
    })
  } else {
    res.status(400).send(result)
  }
};

paymentController.Get = async (req, res) => {
  try{
    let today = new Date();
      const data = await paymentModel.find({});
      let date= parseInt(today.getMonth()+1) +"-"+today.getFullYear();
      let total=0
      data.map((obj)=>{
        let Verified_date = obj.verified_at
        let dateData= parseInt(Verified_date.getMonth()+1) +"-"+Verified_date.getFullYear();
          if(date===dateData){
            total += + obj.amount
          }
          })
          res.json(total)
  }catch(err){
      console.log("Error is there",err)
  }
};


module.exports = paymentController;