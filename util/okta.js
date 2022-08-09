/**
 * File:        okta.js
 * 
 * Description: Utility for the Okta Node.js SDK
 * 
 */

const okta = require('@okta/okta-sdk-nodejs');

const client = new okta.Client({
    orgUrl: '#######',
    token: '#######'
});

exports.createNewUser = (req, res) => {
    let payload = JSON.parse(req.body.entity);
    console.log(payload);

    const newUser = {
        profile: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            login: payload.email,
            mobilePhone: payload.phoneNumber.replace(/\W/g, "")
        },
        credentials: {
            password: {
                value: payload.password
            }
        }
    };

    console.log(newUser)
    client.createUser(newUser)
        .then(user => {
            console.log('Created user', user);
            res.status(200);
            res.send({ success: true });
        })
        .catch(err => {
            console.log(err.errorSummary);
            let msg = "ERROR: server could not handle request";
            if (err.errorSummary.includes("password")) {
                msg = "Password does not meet requirements";
            } else if (err.errorSummary.includes("login")) {
                msg = "Username already exists. Please try another email or contact support.";
            }
            res.status(200);
            res.send({ success: false, msg: msg });
        })
}

exports.oktaFindUser = async (req, res) => {
    let query = req.query.queryparams;
    console.log(query)
    let results = [];
    await client.listUsers({ search: query })
        .each(user => {
            results.push(user.profile);
        })

    if (results.length === 1) {
        res.status(200);
        res.send({ res: true, msg: "User Found", login: results[0].login, phone: results[0].mobilePhone });
    } else {
        res.status(200);
        res.send({ res: false, msg: "User Not Found" });
    }
}

exports.oktaChangePassword = async (req, res) => {
    let payload = req.body.entity;

    let user = await oktaGetUser(payload.login);
    user.credentials.password = payload.newPassword;
    user.update()
        .then(user => {
            console.log("user updated");
            res.status(200);
            res.send({ res: true });
        })
        .catch(err => {
            console.log(err);
            res.status(200);
            res.send({ res: false, msg: "Password does not meet requirements" });
        })

}

exports.oktaGetUser = (login) => {
    return oktaGetUser(login);
}

let oktaGetUser = (login) => {
    return new Promise((resolve, reject) => {
        client.getUser(login)
            .then(user => {
                resolve(user);
            })
            .catch(err => {
                reject(false);
            })
    });
}



