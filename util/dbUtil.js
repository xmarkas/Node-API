/**
 * File:            dbUtil.js
 * 
 * Description: Methods for database queries to DB FoodCommune.
 * 
 * Database:    MariaDB
 * 
 * Tables:      User: User Profiles
 *              Deal: An item that if for sale in the catalog
 *              Buy: A DEAL that a User has selected for purchase
 *              Clan: A group of User's
 */

let maria = require('mariadb');
let pool = maria.createPool({ host: 3306, user: 'root', password: '$Captainfc', connectionLimit: 5, database: 'FoodCommune' });

exports.getUser = (userEmail) => {
    return new Promise((resolve, reject) => {
        pool.getConnection()
            .then(conn => {
                conn.query(`SELECT * FROM User WHERE email = '${userEmail}'`)
                    .then(rows => {
                        let user = rows[0];
                        if (user) resolve(user);
                    })
                    .then(res => {
                        conn.release();
                    })
                    .catch(err => {
                        console.log(err);
                        conn.release();
                        reject(false); // Could not find user
                    })
            })
            .catch(err => {
                console.log(err); // Failed to connect to database
            })
    })
}


exports.createNewUserDB = (req, res) => {
    let v = JSON.parse(req.body.entity);
    let request = `INSERT into User (first_name, last_name, email, phone, created) `;
    let values = `VALUES ("${v.firstName}", "${v.lastName}","${v.email}","${v.phoneNumber}" , NOW())`;

    console.log(request + values);
    insertDB(request + values)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}


/**
 * method:      myDashboard
 * 
 * description: Retrieves Clans, Buys, Deals for signed in user
 */
exports.myDashboard = (req, res) => {
    let v = req.body.entity;
    console.log(req.body);
    let response = {};

    let requestTables = [];

    requestTables.push(queryEngine("MyClans", `SELECT * FROM Clan WHERE id in (SELECT clan_id FROM MyClan WHERE user_id = ${v.userId} and approved_user=1)`));
    requestTables.push(queryEngine("Buys",
        `SELECT Deal.*, User.image_url AS seller_image, CONCAT_WS(' ', User.first_name, User.last_name) AS seller_name
    FROM Deal 
    RIGHT JOIN Buy ON Buy.user_id=${v.userId} AND Deal.id = Buy.deal_id
    INNER JOIN User ON User.id=Deal.user_id`));

    requestTables.push(queryEngine("Purchases",
        `SELECT Deal.*, User.image_url AS seller_image, CONCAT_WS(' ', User.first_name, User.last_name) AS seller_name
    FROM Deal 
    RIGHT JOIN Purchase ON Purchase.user_id=${v.userId} AND Deal.id = Purchase.deal_id
    INNER JOIN User ON User.id=Deal.user_id`));

    requestTables.push(queryEngine("Deals", `SELECT * FROM Deal WHERE user_id = ${v.userId}`));

    Promise.all(requestTables)
        .then(values => {
            console.log(values);
            values.forEach(v => {
                let key = Object.keys(v)[0];
                response[key] = v[key];
            })
        }).then(() => {
            console.log(response);
            res.status(200);
            res.send(response);
        })
}

/**
 * method:      getClans
 * 
 * description: Retrieves Clans for client view
 */
exports.getClans = (req, res) => {
    let v = req.body.entity;
    let response = {};

    let requestTables = [];

    requestTables.push(queryEngine("Clans", `SELECT DISTINCT Clan.*, (SELECT COUNT(*) FROM MyClan WHERE clan_id = Clan.id and approved_user = 1) AS member_count FROM Clan`));

    Promise.all(requestTables)
        .then(values => {
            console.log(values);
            values.forEach(v => {
                let key = Object.keys(v)[0];
                response[key] = v[key];
            })
        }).then(() => {
            console.log(response);
            res.status(200);
            res.send(response);
        })
}

/**
 * method:      clanView
 * 
 * description: Retrieves data sets for the Clan view - Clan, Buys, Members, ClanNews 
 */
exports.clanView = (req, res) => {
    let v = req.body.entity;
    let response = {};

    let requestTables = [];

    requestTables.push(queryEngine("Clan", `SELECT * FROM Clan WHERE id = ${v.clanId}`));
    requestTables.push(queryEngine("Members", `select User.*, MyClan.user_is_admin from User inner join MyClan on MyClan.clan_id = ${v.clanId} and User.id = MyClan.user_id and approved_user = 1`));
    requestTables.push(queryEngine("Buys",
        `SELECT Deal.*, User.image_url AS seller_image, CONCAT_WS(' ', User.first_name, User.last_name) AS seller_name
        FROM Deal 
        RIGHT JOIN Buy ON Buy.clan_id=${v.clanId} AND Deal.id = Buy.deal_id
        INNER JOIN User ON User.id=Deal.user_id`));
    requestTables.push(queryEngine("Purchases", `SELECT * FROM Purchase WHERE clan_id = ${v.clanId}`));
    requestTables.push(queryEngine("JoinRequests", `SELECT * FROM User WHERE id in (SELECT user_id from MyClan WHERE clan_id = ${v.clanId} AND approved_user = 0) `));
    requestTables.push(queryEngine("News", `SELECT * from News WHERE clan_id = ${v.clanId} ORDER BY id DESC`));

    // `SELECT DISTINCT Deal.*, User.image_url AS seller_image, CONCAT_WS(' ', User.first_name, User.last_name) 
    // AS seller_name FROM Deal INNER JOIN User ON User.id = Deal.user_id`

    Promise.all(requestTables)
        .then(values => {
            console.log(values);
            values.forEach(v => {
                let key = Object.keys(v)[0];
                response[key] = v[key];
            })
        }).then(() => {
            console.log(response);
            res.status(200);
            res.send(response);
        })
}

/**
 * method:      joinClanRequest
 * 
 * description: Insert new ROW into MyClan field approved_user is set to '0' (unapproved)
 *              till Clan admin explicitly approves/accepts them as a Clan member
 */
exports.joinClanRequest = (req, res) => {
    let v = req.body.entity;
    let user = v.user;

    let request = `INSERT into MyClan (user_id, clan_id, approved_user, created) VALUES (${user.id},${v.clanId},0,NOW())`;

    insertDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      removeUserFromClan
 * 
 * description: Deletes the ROW from MyClan WHERE user_id = User.id 
 */
exports.removeUserFromClan = (req, res) => {
    let v = req.body.entity;
    let user = v.user;

    let request = `DELETE from MyClan WHERE user_id = ${user.id} AND clan_id = ${v.clanId}`;

    deleteDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      insertDeal
 * 
 * description: INSERT new row into Deal
 */
exports.insertDeal = (req, res) => {
    let v = req.body.entity; // As payload
    console.log("PAYLOAD", v)

    let request = `INSERT into Deal (user_id, price, units, unit_measure, description, summary, category, image_url, public, created) `;
    let values = `VALUES (${v.user_id},${v.price},${v.units},'${v.unit_measure}','${v.description}','${v.summary}','${v.category}',${v.image_url ? `'${v.image_url}'` : null}, ${v.public}, NOW())`;

    console.log(request + values);
    insertDB(request + values)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      updateDeal
 * 
 * description: UPDATEs a ROW on the Deal table
 */
exports.updateDeal = (req, res) => {
    let v = req.body.entity; // As payload

    let values = "UPDATE Deal SET ";
    let okValues = ["price", "units", "unit_measure", "description", "summary", "category", "image_url", "public"];
    let keys = Object.keys(v);

    keys.forEach((k, index) => {
        if (okValues.includes(k) && v[k] !== "" && v[k] !== null) {
            if (typeof v[k] === 'string') {
                values += `${k} = "${v[k]}",`;
            } else {
                values += `${k} = ${v[k]},`;
            }
        }
    })

    // Remove trailing "," and concatenate the WHERE clause
    values += ` WHERE id=${v.id}`;
    values = values.replace(', W', " W");

    updateDB(values)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      removeDealDB
 */
exports.removeDealDB = (req, res) => {
    let v = req.body.entity;

    let request = `DELETE from Deal WHERE id = ${v.dealId}`;

    deleteDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      getCatalog
 * 
 * description: SELECTs all the ROWs on the Deal table
 */
exports.getCatalog = (req, res) => {
    let response = {};

    let requestTables = [];

    // requestTables.push(queryEngine("Deals", `SELECT * FROM Deal`));
    requestTables.push(queryEngine("Deals",
        `SELECT DISTINCT Deal.*, User.image_url AS seller_image, CONCAT_WS(' ', User.first_name, User.last_name) 
        AS seller_name, User.score AS user_score FROM Deal INNER JOIN User ON User.id = Deal.user_id WHERE Deal.public=1`));

    Promise.all(requestTables)
        .then(values => {
            console.log(values);
            values.forEach(v => {
                let key = Object.keys(v)[0];
                response[key] = v[key];
            })
        }).then(() => {
            console.log(response);
            res.status(200);
            res.send(response);
        })
}

/**
 * method:      handleMemberRequest
 * 
 * description: Used for approving/denying a request to join a Clan
 */
exports.handleMemberRequest = (req, res) => {
    let v = req.body.entity; // As payload

    let request = `UPDATE MyClan set approved_user = ${v.memberState} WHERE user_id = ${v.user} and clan_id = ${v.clanId}`;

    updateDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      adminToggle
 */
exports.adminToggle = (req, res) => {
    let v = req.body.entity; // As payload

    let request = `UPDATE MyClan set user_is_admin=${v.adminValue} WHERE clan_id=${v.clanId} and user_id=${v.user}`;

    updateDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 *  method:     deleteMember
 */
exports.deleteMember = (req, res) => {
    let v = req.body.entity;

    let request = `DELETE from MyClan WHERE user_id = ${v.user} AND clan_id = ${v.clanId}`;

    deleteDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      createGroup
 */
exports.createGroup = (req, res) => {
    let v = req.body.entity;

    let request = `INSERT into Clan (name, area, score, summary, admin_id, image_url, created) `;
    let values = `VALUES ('${v.name}','${v.area}', 0, '${v.summary}',${v.user_id},${v.image_url ? `'${v.image_url}'` : null}, NOW())`;

    console.log(request + values);
    insertDB(request + values)
        .then(async resolved => {
            console.log(resolved);
            // Create MyClan for group admin
            let insertMyClan = `INSERT into MyClan (user_id, clan_id, approved_user, user_is_admin, created) VALUES (${v.user_id},${resolved.msg.insertId},1,1,NOW())`;
            await insertDB(insertMyClan)
                .then(msg => {
                    console.log(msg);
                })
                .catch(err => {
                    console.log(err)
                })

            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      updateClanFields
 * 
 * description: Update Clan options 
 */
exports.updateClanFields = (req, res) => {
    let v = req.body.entity;
    let columns = v.values;
    let keys = Object.keys(columns);
    let values = "UPDATE Clan SET ";

    keys.forEach((k) => {
        if (typeof columns[k] === 'string') {
            values += `${k} = "${columns[k]}",`;
        } else {
            values += `${k} = ${columns[k]},`;
        }
    })

    // Remove trailing "," and concatenate the WHERE clause
    values += ` WHERE id=${v.clanId}`;
    values = values.replace(', W', " W");

    console.log("CHECK VALS", values);

    updateDB(values)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      userClans
 * 
 * description: Returns the users Clans
 */
exports.userClans = (req, res) => {
    let v = req.body.entity;
    let response = {};
    let requestTables = [];

    requestTables.push(queryEngine("MyClans", `SELECT * FROM Clan WHERE id in (SELECT clan_id FROM MyClan WHERE user_id = ${v.userId} and approved_user=1)`));

    Promise.all(requestTables)
        .then(values => {
            console.log(values);
            values.forEach(v => {
                let key = Object.keys(v)[0];
                response[key] = v[key];
            })
        }).then(() => {
            console.log(response);
            res.status(200);
            res.send(response);
        })
}

/**
 * method:      addDealTo
 * 
 * description: Add an offer to a group or to wish list
 */
exports.addDealTo = (req, res) => {
    let v = req.body.entity;

    let request, values;

    if (v.addType === 'mylist') {
        request = `INSERT into Buy (seller_id, deal_id, user_id, created) `;
        values = `VALUES (${v.sellerId},${v.dealId},${v.userId}, NOW())`;
    } else {
        request = `INSERT into Buy (seller_id, deal_id, user_id, clan_id, created) `;
        values = `VALUES (${v.sellerId},${v.dealId},${v.userId},${v.clanId}, NOW())`;
    }

    console.log(request + values);
    insertDB(request + values)
        .then(async resolved => {
            console.log(resolved);
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      deleteGroupBuy
 * 
 * description: Admin feature to remove an offer from a groups list
 */
exports.deleteGroupBuy = (req, res) => {
    let v = req.body.entity;

    let request = `DELETE from Buy WHERE deal_id = ${v.dealId} AND clan_id = ${v.clanId}`;

    deleteDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      deleteWishlistBuy
 * 
 * description: removes an offer from the wish list
 */
exports.deleteWishListBuy = (req, res) => {
    let v = req.body.entity;
    console.log("BODY", v);

    let request = `DELETE from Buy WHERE deal_id = ${v.itemId} AND user_id=${v.user.id}`;
    console.log(request);

    deleteDB(request)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      groupPurchase
 * 
 * description: Used to record a commit to purchase a quantity of
 *              an offer on the group page.
 */
exports.groupPurchase = (req, res) => {
    let v = req.body.entity;
    let purchaseTotal = (v.unitPrice / v.units) * v.purchaseUnits;

    let request = `INSERT into Purchase (deal_id, user_id, clan_id, purchase_units, unit_price, units, purchase_total, created) `;
    let values = `VALUES (${v.dealId},${v.userId}, ${v.clanId}, ${v.purchaseUnits}, ${v.unitPrice}, ${v.units}, ${purchaseTotal}, NOW())`;

    console.log(request + values);
    insertDB(request + values)
        .then(async resolved => {
            console.log(resolved);

            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      groupPurchaseUpdate
 * 
 */
exports.groupPurchaseUpdate = (req, res) => {
    let v = req.body.entity;
    console.log(v);
    let purchaseTotal = (v.unitPrice / v.units) * v.purchaseUnits;

    let request = `UPDATE Purchase SET purchase_units=${v.purchaseUnits}, unit_price=${v.unitPrice},
     units=${v.units}, purchase_total=${purchaseTotal} WHERE id=${v.purchase_id}`;
    
     updateDB(request)
     .then(resolved => {
         res.status(200);
         res.send(resolved);
     })
     .catch(rejected => {
         res.status(200);
         res.send(rejected);
     })
}

/**
 * method:      updateUserProfile
 */
exports.updateUserProfile = (req, res) => {
    console.log(req.body);
    let v = req.body.entity;
    let columns = v.values;
    let keys = Object.keys(columns);
    let values = "UPDATE User SET ";

    keys.forEach((k) => {
        if (typeof columns[k] === 'string') {
            values += `${k} = '${columns[k]}',`;
        } else {
            values += `${k} = ${columns[k]},`;
        }
    })

    // Remove trailing "," and concatenate the WHERE clause
    values += ` WHERE id=${v.userId}`;
    values = values.replace(', W', " W");

    console.log("CHECK VALS", values);

    updateDB(values)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * method:      insertNews
 */
exports.insertNews = (req, res) => {
    let v = req.body.entity; // As payload

    let request = `INSERT into News (clan_id, message, created) `;
    let values = `VALUES (${v.clanId},"${v.message}", NOW())`;

    console.log(request + values);
    insertDB(request + values)
        .then(resolved => {
            res.status(200);
            res.send(resolved);
        })
        .catch(rejected => {
            res.status(200);
            res.send(rejected);
        })
}

/**
 * Funciton:            queryEngine
 * 
 * Description: Proccess requests to access the database for CREATE, READ, UPDATE, and DELETE.
 *              Results for requests are pushed into the collection array and the named "key"
 *              is set as the key for the collection value of the v.
 *  
 *              After each request the connection to the pool is released.
 * 
 * @param {*} key 
 * @param {*} query 
 */
function queryEngine(key, query) {

    return new Promise((resolve, reject) => {
        let tableName = {};
        pool.getConnection()
            .then(conn => {
                conn.query(query)
                    .then(result => {
                        let collection = [];
                        result.forEach(item => {
                            collection.push(item);
                        })
                        tableName[key] = collection;
                        resolve(tableName);
                    })
                    .then(() => {
                        conn.release();
                    })
                    .catch(err => {
                        console.log(err);
                        conn.release();
                        tableName[key] = [];
                        reject(tableName);
                    })
            })
            .catch(err => {
                console.log(err, "Failed to connect to database");
                tableName[key] = [];
                reject(tableName);
            })
    })
}

/**
 * Function:            insertDB
 * 
 * Description: Insert a new row into the selected table
 * 
 * @param {*} insertROW 
 */
function insertDB(insertROW) {
    return new Promise((resolve, reject) => {
        pool.getConnection()
            .then(conn => {
                conn.query(insertROW)
                    .then(result => {
                        resolve({ success: true, msg: result });
                    })
                    .then(() => {
                        conn.query.release();
                    })
                    .catch(err => {
                        conn.release();
                        reject({ success: false, msg: err });
                    })
            })
            .catch(err => {
                console.log(err, "Failed to connect to database");
                reject({ success: false, msg: err });
            })
    })
}

/**
 * Function:            deleteDB
 * 
 * Description: Deletes a row from the selected table
 * 
 * @param {*} deleteROW 
 */
function deleteDB(deleteROW) {
    return new Promise((resolve, reject) => {
        pool.getConnection()
            .then(conn => {
                conn.query(deleteROW)
                    .then(result => {
                        resolve({ success: true, msg: result });
                    })
                    .then(() => {
                        conn.query.release();
                    })
                    .catch(err => {
                        conn.release();
                        reject({ success: false, msg: err });
                    })
            })
            .catch(err => {
                console.log(err, "Failed to connect to database");
                reject({ success: false, msg: err });
            })
    })
}

/**
 * Function:            updateDB
 * 
 * Description: Deletes a row from the selected table
 * 
 * @param {*} deleteROW 
 */
function updateDB(updateROW) {
    console.log("DB Request", updateROW);
    return new Promise((resolve, reject) => {
        pool.getConnection()
            .then(conn => {
                conn.query(updateROW)
                    .then(result => {
                        resolve({ success: true, msg: result });
                    })
                    .then(() => {
                        conn.query.release();
                    })
                    .catch(err => {
                        conn.release();
                        reject({ success: false, msg: err });
                    })
            })
            .catch(err => {
                console.log(err, "Failed to connect to database");
                reject({ success: false, msg: err });
            })
    })
}

