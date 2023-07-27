require('dotenv').config()

const mysql = require('mysql');

const db = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DATABASEHOST,
    user: process.env.DATABASEUSER,
    password: process.env.DATABASEPWD,
    database: process.env.DATABASE,
    debug: false
});

module.exports = { db, mysql }