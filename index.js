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

const appRoutes = express.Router();

appRoutes.get("/", VerifyToken.verifyToken, async function (req, res, next) {
    try {
        res.render('pages/almatools', {logindata: {"status": "ok", "message": "login"} });
    } catch(err) {
        res.render('pages/login', {logindata: {"status": "ok", "message": "login"}})
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

appRoutes.post("/login", Controllers.login)

appRoutes.post("/logout", VerifyToken.verifyToken, Controllers.logout)

appRoutes.get("/newbookspage", Controllers.getNewbooksList)

appRoutes.get("/newbookscarouselpage", Controllers.getNewbooksCarousel)

appRoutes.get("/payment", async function (req, res, next) {
    //object att skicka till template-ejs
    let almapaymentdata = {
        "status": "",
        "message": "",
        "decodedtoken": "",
        "alma": [],
        "nets": {
            "apiurl": process.env.NETSAPIURL,
            "checkouturl": process.env.NETSCHECKOUTURL,
            "checkoutkey": process.env.NETSCHECKOUTKEY
        },
        "tocurl": process.env.TOCURL,
        "gdprurl": process.env.GDPRURL,
        "labels": {
            "en": {
                "systemheader": "KTH Bibliotekets Online Payment",
            },
            "sv":  {
                "systemheader": "KTH Library Online Betalning",    
            },
        },
        "language": req.query.lang || 'sv'
    }

    //Verifiera token från Primo
    let decodedtoken
    try {
        decodedtoken = await VerifyToken.verifyexlibristoken(req.query.jwt)
    } catch(err) {
        console.log(err)
    }

    if (decodedtoken!=0) {
        almapaymentdata.decodedtoken = decodedtoken;

        //Hämta fees från Alma
        alma_apiurl = process.env.ALMAPIENDPOINT + 'users/' +decodedtoken.userName + '/fees?user_id_type=all_unique&status=ACTIVE&apikey=' + process.env.ALMAAPIKEY;
        console.log(alma_apiurl)
        try {   
            const almaresponse = await axios.get(alma_apiurl)
            almapaymentdata.status = "success";
            almapaymentdata.message = "ok";
            almapaymentdata.alma = almaresponse.data;
        } catch(err) {
            console.log(err.message);
            almapaymentdata.status = "error";
            almapaymentdata.message = err.message;
        }
    } else {
        almapaymentdata.status = "error";
        almapaymentdata.message = "None or not a valid token";
    }

    config = {
        "createpaymentUrl" : process.env.CREATEPAYMENTURL,
        "":""
    }
    res.render('pages/payment', {"config":config, "almapaymentdata": almapaymentdata});
})

appRoutes.get("/payment/checkout", async function (req, res, next) {
    let config = {
        "checkpaymentUrl" : process.env.CHECKPAYMENTURL,
        "":""
    }
    decodedtoken = await VerifyToken.verifyexlibristoken(req.query.jwt)
    if (decodedtoken!=0) {
        try {
            //Kolla om betalning redan är utförd
            //Hämta payment
            //const payment = await Controllers.readPayment(req.query.paymentId)
            const payment = await axios.post(process.env.ALMATOOLSAPI_INTERNAL_ENDPOINT + "v1/checkpayment/" + req.query.paymentId)
            console.log(payment)
            if( payment.data.length > 0) {
                if (payment.data[0].finished == 1) {
                    almapaymentdata = {
                        "status": "finished",
                        "message": "The payment with paymentId " + req.query.paymentId + " is already finished",
                        "nets": {
                            "apiurl": process.env.NETSAPIURL,
                            "checkouturl": process.env.NETSCHECKOUTURL,
                            "checkoutkey": process.env.NETSCHECKOUTKEY
                        },
                        "tocurl": process.env.TOCURL,
                        "gdprurl": process.env.GDPRURL,
                        "jwt": req.query.jwt,
                        "labels": {
                            "en": {
                                "systemheader": "KTH Bibliotekets Online Payment",
                            },
                            "sv":  {
                                "systemheader": "KTH Library Online Betalning",    
                            },
                        },
                        "language": req.query.lang || 'sv'
                    }
                    res.render('pages/checkout',{"config":config, "almapaymentdata": almapaymentdata});
                }

                //Hämta fees från Alma
                let almaresponse
                totalamount = 0;
                if(req.query.fee_id == 'all') {
                    almapiurl = process.env.ALMAPIENDPOINT + 'users/' + decodedtoken.userName + '/fees?user_id_type=all_unique&status=ACTIVE&apikey=' + process.env.ALMAAPIKEY
                    almaresponse = await axios.get(almapiurl)
                    totalamount = almaresponse.data.total_sum
                } else {
                    almapiurl = process.env.ALMAPIENDPOINT + 'users/' + decodedtoken.userName + '/fees/' + req.query.fee_id + '?user_id_type=all_unique&status=ACTIVE&apikey=' + process.env.ALMAAPIKEY
                    console.log(almapiurl)
                    almaresponse = await axios.get(almapiurl)
                    totalamount = almaresponse.data.balance 
                }

                almapaymentdata = {
                    "status": "success",
                    "decodedtoken": decodedtoken,
                    "alma": almaresponse.data,
                    "totalamount": totalamount,
                    "nets": {
                        "apiurl": process.env.NETSAPIURL,
                        "checkouturl": process.env.NETSCHECKOUTURL,
                        "checkoutkey": process.env.NETSCHECKOUTKEY
                    },
                    "tocurl": process.env.TOCURL,
                    "gdprurl": process.env.GDPRURL,
                    "jwt": req.query.jwt,
                    "labels": {
                        "en": {
                            "systemheader": "KTH Bibliotekets Online Payment",
                        },
                        "sv":  {
                            "systemheader": "KTH Library Online Betalning",    
                        },
                    },
                    "language": req.query.lang || 'sv'
                }
                res.render('pages/checkout',{"config":config, "almapaymentdata": almapaymentdata});
            } else {
                almapaymentdata = {
                    "status": "finished",
                    "message": "The payment with paymentId " + req.query.paymentId + " does not exist",
                    "nets": {
                        "apiurl": process.env.NETSAPIURL,
                        "checkouturl": process.env.NETSCHECKOUTURL,
                        "checkoutkey": process.env.NETSCHECKOUTKEY
                    },
                    "tocurl": process.env.TOCURL,
                    "gdprurl": process.env.GDPRURL,
                    "jwt": req.query.jwt,
                    "labels": {
                        "en": {
                            "systemheader": "KTH Bibliotekets Online Payment",
                        },
                        "sv":  {
                            "systemheader": "KTH Library Online Betalning",    
                        },
                    },
                    "language": req.query.lang || 'sv'
                }
                res.render('pages/checkout',{"config":config, "almapaymentdata": almapaymentdata});
            }
        } catch(err) {
            almapaymentdata = {
                "status": "error",
                "message": err.message,
                "decodedtoken": decodedtoken,
                "alma": [],
                "nets": {
                    "apiurl": process.env.NETSAPIURL,
                    "checkouturl": process.env.NETSCHECKOUTURL,
                    "checkoutkey": process.env.NETSCHECKOUTKEY
                },
                "tocurl": process.env.TOCURL,
                "gdprurl": process.env.GDPRURL,
                "jwt": req.query.jwt,
                "labels": {
                    "en": {
                        "systemheader": "KTH Bibliotekets Online Payment",
                    },
                    "sv":  {
                        "systemheader": "KTH Library Online Betalning",    
                    },
                },
                "language": req.query.lang || 'sv'
            }
            res.render('pages/checkout',{"config":config, "almapaymentdata": almapaymentdata});
        }
    } else {
        almapaymentdata = {
            "status": "error",
            "message": "None or not valid token",
            "decodedtoken": decodedtoken,
            "nets": {
                "apiurl": process.env.NETSAPIURL,
                "checkouturl": process.env.NETSCHECKOUTURL,
                "checkoutkey": process.env.NETSCHECKOUTKEY
            },
            "tocurl": process.env.TOCURL,
            "gdprurl": process.env.GDPRURL,
            "jwt": req.query.jwt,
            "labels": {
                "en": {
                    "systemheader": "KTH Bibliotekets Online Payment",
                },
                "sv":  {
                    "systemheader": "KTH Library Online Betalning",    
                },
            },
            "language": req.query.lang || 'sv'
        }
        res.render('pages/checkout',{"config":config, "almapaymentdata": almapaymentdata});
    }
    
})
app.use(process.env.APP_PATH, appRoutes);

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