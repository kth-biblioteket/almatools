const database = require('./db');

//Exempel
/*
const readXXXX = () => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM xxxxx`;
        database.db.query(database.mysql.format(sql,[]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};
*/

module.exports = {
};