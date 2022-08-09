/****************************************************************************
 * 
 * File:        fc-server.js
 * 
 * Date:        May 12, 2020
 * Author:      Mark A Smith
 * Version:     v1.0.0
 * Description: File server for foodcommune.com running on localhost:3100
 *              proxy passed from *.80 in Apache config files httpd/conf.d
 *  
*/

let express = require('express');
let app = express();
let bodyParser = require("body-parser");
let multer = require('multer');

///////////////////////////////////////////////////////
// MULTER IMAGE UPLOADS FOR FOOD COMMUNE
let dealImage = multer.diskStorage({
    destination: 'Deal_Images/', filename: (req, file, cb) => {
        cb(null, req.query.userid + '@' + file.originalname);
    }
});
let deal = multer({ storage: dealImage });

let groupImage = multer.diskStorage({
    destination: 'Group_Images/', filename: (req, file, cb) => {
        let groupname = req.query.groupname.replace(/\s|"|'/g, "");
        cb(null,  groupname + '@' + file.originalname);
    }
});
let group = multer({ storage: groupImage });

let userImage = multer.diskStorage({
    destination: 'Profile_Images/', filename: (req, file, cb) => {
        let userId = req.query.userId.replace(/\s|"|'/g, "");
        cb(null,  userId + '@' + file.originalname);
    }
});
let user = multer({ storage: userImage });

////////////////////////////////////////////////////////

// Use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// For Food Commune Login
//************************************************************* */

var logger = require('morgan');
app.use(logger('dev'));

//************************************************************* */

app.listen(3100, "localhost", function (err) {
    if (err) console.log(err);
    console.log('FC-Server: RUNNING.....');
});

/**
 *  Food Commune
 * 
 */
const accountsRouter = require('./fc-account');
const secureRouter = require('./fc-secure');
const siteRouter = require('./fc-site');

// Static served site
app.use('/', express.static(__dirname + "/../build"));
console.log(__dirname + "/../build")

// Handles routing for creating accounts and user account flows
app.use('/accounts', accountsRouter);

// Client request for API access
app.use('/secure', secureRouter);

// Site data
app.use('/site', siteRouter);

app.post('/foodcommune/loginCallback', (req, res) => {
    console.log('CALL BACK OKTA ROUTE')
    console.log(req.body);
    res.status(200);
    res.send();
})


// Image upload and save
app.post('/imageUpload', deal.single('file'), (req, res) => {
    console.log(req.file)
    res.status(200);
    res.send({ success: true, msg: "ok" });
})

app.post('/imageUpload/group', group.single('file'), (req, res) => {
    console.log(req.file)
    res.status(200);
    res.send({ success: true, msg: "ok" });
})

app.post('/imageUpload/user', user.single('file'), (req, res) => {
    console.log(req.file)
    res.status(200);
    res.send({ success: true, msg: "ok" });
})
