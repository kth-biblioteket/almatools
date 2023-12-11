require('dotenv').config({path:'almatools.env'})

const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

const db = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DATABASEHOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    debug: false
});

//Kör sql-script vid uppstart
const sqlFilePath = path.join(__dirname, process.env.DB_UPDATE_PATH);
const sqlStatements = fs.readFileSync(sqlFilePath, 'utf8');

db.query(mysql.format(sqlStatements),(err, result) => {
    if(err) {
        console.error(err);
        process.exit(1);
    }
    console.log(result);
});


module.exports = { db, mysql }