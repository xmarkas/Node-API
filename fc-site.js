const express = require("express");
const router = express.Router();
const { getCatalog, getUser, createNewUserDB } = require('./util/dbUtil');
const { oktaFindUser, oktaChangePassword, createNewUser } = require('./util/okta');
const { sendVerificationDigits } = require('./util/plivo');
let { KEY, REFERER } = require('./fc-router-key');
let jwt = require('jsonwebtoken');

router.get("/catalog", (req, res) => {
    getCatalog(req, res);
})

router.get("/finduser", (req, res) => {
    oktaFindUser(req, res);
})

router.post("/createOktaAccount", (req, res) => {
    console.log("create new account");
    createNewUser(req, res);
});

router.post("/createFCAccount", (req, res) => {
    createNewUserDB(req, res);
})

router.post("/verify", (req, res) => {
    sendVerificationDigits(req, res);
})

router.post("/changepassword", (req, res) => {
    oktaChangePassword(req, res);
})

router.post("/usersession", (req, res) => {
    console.log("USER SESSION ---->>", req.headers);

    // Get fc-user cookie from header
    let cookies = req.headers.cookie;
    let userToken = cookieMonster(cookies, 'fc-user');

    // Validate token with KEY
    jwt.verify(userToken, KEY, async (err, success) => {
        if (err) {
            console.log("ERROR", err);
            // If token expired
            if (err.name === 'TokenExpiredError') console.log('expired');
            // if JWT token error
            if (err.name === 'JsonWebTokenError') console.log('bad key?');
            res.status(200);
            res.send({ success: false, msg: 'Access denied' });
        } else if (success && req.headers['referer'].includes(REFERER)) {
            console.log("SUCCESS", success);
            // Get user data and return to the client
            let userProfile = await getUser(success.user);
            res.status(200);
            res.send({ success: true, user: userProfile, token: userToken, tokenExpiresAt: success.exp });
        }
    })
})

// Export routes
module.exports = router;


/**
 * Function:        cookieMonster
 * 
 * Description: Parses cookies from the request header. The target parameter
 *              is the name of the cookie, and the function returns the value
 *              of the target.
 * 
 * @param {String} cookies 
 * @param {String} target 
 */
function cookieMonster(cookies, target) {
    // No cookies
    if (!cookies) return;

    let cookieArray = cookies.split(';');
    let cookieJar = {};

    cookieArray.forEach((c, index) => {
        let sections = c.split(',');
        sections.forEach(s => {
            if (s.includes('=')) {
                let key = s.slice(0, s.indexOf('='));
                let value = s.slice(s.indexOf('=') + 1);
                cookieJar[key] = value;
            }
        })
    })
    return cookieJar[target];
}