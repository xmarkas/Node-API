/**
 * File:        plivo.js
 * 
 * Description: Plivo utility file for voice and SMS methods.
 * 
 */

 // PLIVO
var plivo = require('plivo');
let PhoneClient = new plivo.Client('########', '#######');
let PhloClient = new plivo.PhloClient('########', '#######');

exports.sendVerificationDigits = (req, res) => {
    let payload = req.body.entity;
    console.log("PAYLOAD", payload)
    // Format Phone number
    let phone = payload.phone.replace(/\W/g, ""); // Remove any characters
    phone = phone[0] === 1 ? phone : "1" + phone;

    console.log("Send verification to:", phone);

    PhoneClient.messages.create(
        '12062592279',
        phone,
        `Food Commune Verification \nCode:${payload.code}`
      ).then((message_created) => {
          console.log(message_created);
          res.status(200);
          res.send('ok');
      }).catch(err => {
          console.log(err);
      })
}
