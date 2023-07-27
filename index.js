require('dotenv').config({path:'almatools.env'})

const jwt = require("jsonwebtoken");
const VerifyToken = require('./VerifyToken');
const VerifyAdmin = require('./VerifyAdmin');

const axios = require('axios');

const fs = require("fs");
const path = require('path');

const cors = require("cors");

const express = require('express')
const bodyParser = require('body-parser');
const Controllers = require('./Controllers');
const cookieParser = require("cookie-parser");

const app = express()

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());

const socketIo = require("socket.io");

app.set("view engine", "ejs");

const whitelist = process.env.CORS_WHITELIST.split(", ");

app.use(cors({origin: whitelist}));

app.use(process.env.APP_PATH, express.static(path.join(__dirname, "public")));


app.get("/", VerifyToken, async function (req, res, next) {
    try {
        res.render('almatools', {logindata: {"status": "ok", "message": "login"} });
    } catch(err) {
        res.render('login', {logindata: {"status": "ok", "message": "login"}})
    }
    /*
    try {
        let verify = await VerifyAdmin(req, res, next)
        res.render('almatools', {logindata: {"status": "ok", "message": "login"} });
    } catch(err) {
        res.render('login', {logindata: {"status": "ok", "message": "login"}})
    }
    */
});

app.post("/login", Controllers.login)

app.post("/logout", VerifyToken, Controllers.logout)

const server = app.listen(process.env.PORT || 3002, function () {
    const port = server.address().port;
    console.log("App now running on port", port);
});

// Initiera socketserver
const io = socketIo(server, {path: process.env.SOCKETIOPATH})

const sockets = {}

io.on("connection", (socket) => {
    socket.on("connectInit", (sessionId) => {
        sockets[sessionId] = socket.id
        app.set("sockets", sockets)
    })
})

app.set("io", io)


/**
 * 
 * Hjälpfunktioner 
 *  
 */

/**
 * 
 * @param {*} i 
 * @returns 
 */
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}