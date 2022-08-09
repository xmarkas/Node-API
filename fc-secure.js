/**
 * file:        fc-secure.js
 * 
 * Description: Router for API access credentials
 * 
 */
let { KEY, REFERER } = require('./fc-router-key');
let jwt = require('jsonwebtoken');
const express = require("express");
const router = express.Router();
const { oktaGetUser } = require('./util/okta');
const { getUser } = require('./util/dbUtil');

/**
 * If user is authenticated via OKTA and has a valid session the
 * client will receive a JWT token for authenticating API calls
 * to the app server. JWT tokens will be valid for 30 minutes, after
 * which the client will have to obtain a new token.
 *  
 */
router.post("/", async (req, res) => {
    let payload = req.body.entity;

    let user = await oktaGetUser(payload.login);

    console.log("USER", user);

    if (user.status === "ACTIVE") {
        // Create and sign token
        var token = jwt.sign({
            user: user.profile.login,
        }, KEY, { expiresIn: '60m' });

        // Get user data and return to the client
        let userProfile = await getUser(payload.login);
        let exp = (new Date().getTime() + (60000 * 60)) / 1000;
        res.status(200);
        res.setHeader('Set-Cookie', `fc-user=${token}, max-age=3600000, samesite`);
        res.send({success: true, token: token, user: userProfile, tokenExpiresAt:exp });
    } else {
        res.status(200);
        res.send({ success: false });
    }
});

/**
 * Provision credentials for basic app features
 * 
 */
router.post("/provisional", (req, res) => {
    console.log("PROVISION", req);
    if (req.headers['referer'] === REFERER) {
        var token = jwt.sign({
            data: 'site'
        }, KEY, { expiresIn: '30m' });
        console.log('Route Access')
        res.status(200);
        res.send({ token: token });
    } else {
        console.log('Route DENIED')
        res.status(403);
        res.send("Access not allowed: Invalid Credentials");
    }
    
})

module.exports = router;