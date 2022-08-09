/**
 * File:        fc-login.routes.js
 * 
 * Description: Router for login
 * 
 */
const { KEY, REFERER } = require('./fc-router-key.js');
let jwt = require('jsonwebtoken');
const express = require("express");
const router = express.Router();
const { oktaChangePassword, oktaFindUser } = require('./util/okta');
const { sendVerificationDigits } = require("./util/plivo");
const { myDashboard, getClans, clanView, joinClanRequest,
  removeUserFromClan, insertDeal, updateDeal, handleMemberRequest,
  adminToggle, deleteMember, createGroup, updateClanFields, userClans,
  addDealTo, deleteGroupBuy, groupPurchase, updateUserProfile, insertNews,
  removeDealDB, deleteWishListBuy, groupPurchaseUpdate } = require('./util/dbUtil');


/**********************************************************************
 * JWT Authentication for protected API routes /foodcommune/accounts
 **********************************************************************/
router.use((req, res, next) => {
  // Extract token from header
  console.log(req.headers);
  let tokenArray = req.headers.authorization ? req.headers.authorization.split(" ") : "";
  let token = tokenArray[1];

  // Validate token with KEY
  jwt.verify(token, KEY, (err, success) => {
    if (err) {
      console.log("ERROR", err);
      // If token expired
      if (err.name === 'TokenExpiredError') console.log('expired');
      // if JWT token error
      if (err.name === 'JsonWebTokenError') console.log('bad key?');
      res.status(403);
      res.send({ success: false, msg: 'Access denied' });
    } else if (success && req.headers['referer'].includes(REFERER)) {
      console.log("SUCCESS", success);
      next();
    }
  })
})

/**
 * ROUTES FOR /foodcommune/accounts
 */


// Verify account
router.post("/verify", (req, res) => {
  sendVerificationDigits(req, res);
})

// Get Okta user
router.get("/finduser", (req, res) => {
  oktaFindUser(req, res);
})

// Change Okta password
router.post("/changepassword", (req, res) => {
  oktaChangePassword(req, res);
})

router.post("/dashboard", (req, res) => {
  myDashboard(req, res);
})

router.post("/groups", (req, res) => {
  getClans(req, res);
})

router.post("/clanView", (req, res) => {
  clanView(req, res);
})

router.post("/joinClanRequest", (req, res) => {
  joinClanRequest(req, res);
})

router.post("/removeUserFromClan", (req, res) => {
  removeUserFromClan(req, res);
})

router.post("/insertDeal", (req, res) => {
  insertDeal(req, res);
})

router.post("/updateDeal", (req, res) => {
  updateDeal(req, res);
})

router.post("/removeDealDB", (req, res) => {
  removeDealDB(req, res);
})

router.post("/addUserToGroup", (req, res) => {
  handleMemberRequest(req, res);
})

router.post("/adminToggle", (req, res) => {
  adminToggle(req, res);
})

router.post("/deleteMember", (req, res) => {
  deleteMember(req, res);
})

router.post("/createGroup", (req, res) => {
  createGroup(req, res);
})

router.post("/updateClanFields", (req, res) => {
  updateClanFields(req, res);
})

router.post("/userClans", (req, res) => {
  userClans(req, res);
})

router.post("/addDealTo", (req, res) => {
  addDealTo(req, res);
})

router.post("/deleteGroupBuy", (req, res) => {
  deleteGroupBuy(req, res);
})

router.post("/deleteWishListBuy", (req, res) => {
  deleteWishListBuy(req, res);
})

router.post("/groupPurchase", (req, res) => {
  groupPurchase(req, res);
})

router.post("/groupPurchaseUpdate", (req, res) => {
  groupPurchaseUpdate(req, res);
})

router.post("/updateUserProfile", (req, res) => {
  updateUserProfile(req, res);
})

router.post("/insertNews", (req, res) => {
  insertNews(req, res);
})

// Export routes
module.exports = router;