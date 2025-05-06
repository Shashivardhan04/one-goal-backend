require("dotenv").config();
const jwt = require("jsonwebtoken");
const secret = process.env.NEW_TOKEN_KEY;

const verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();

//   const header = {alg: "HS256", typ: "JWT"};
// const payload = {
//   exp: Math.floor(Date.now() / 1000) + (100 * 365 * 24 * 60 * 60)
// };
// const secret = "aKSHAY@sETH";

// const token = jwt.sign(payload, secret, {header});
  
//  return res.status(200).json(token);
};


// const getAuthToken = (req, res, next) => {
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.split(' ')[0] === 'Bearer'
//   ) {
//     req.authToken = req.headers.authorization.split(' ')[1];
//   } else {
//     req.authToken = null;
//   }
//   next();
// };


// const verifyToken = (req, res, next) => {
//  getAuthToken(req, res, async () => {
//     try {
//       const { authToken } = req;
//       const userInfo = await admin
//         .auth()
//         .verifyIdToken(authToken);
//       req.authId = userInfo.uid;
//       return next();
//     } catch (e) {
//       return res
//         .status(401)
//         .send({ error: 'You are not authorized to make this request' });
//     }
//   });
// };

module.exports = verifyToken;
