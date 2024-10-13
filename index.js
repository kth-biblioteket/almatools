require('dotenv').config({ path: 'almatools.env' })

const jwt = require("jsonwebtoken");
const VerifyToken = require('./VerifyToken');
const VerifyAdmin = require('./VerifyAdmin');

const translations = require('./translations/translations.json');

const axios = require('axios');

const fs = require("fs");
const path = require('path');

const cors = require("cors");

const express = require('express')
const bodyParser = require('body-parser');
const Controllers = require('./Controllers');
const cookieParser = require("cookie-parser");

const session = require('express-session');
const qs = require('qs');
const crypto = require('crypto');

const app = express()

const sessionSecret = process.env.SESSION_SECRET

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());

const socketIo = require("socket.io");

app.set("view engine", "ejs");

const whitelist = process.env.CORS_WHITELIST.split(", ");

app.use(cors({ origin: whitelist }));

app.use(process.env.APP_PATH, express.static(path.join(__dirname, "public")));

const appRoutes = express.Router();

app.use(session({
    secret: sessionSecret, 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

const OIDC_CONFIG = {
    issuer: process.env.OIDC_ISSUER,
    authorizationURL: process.env.OIDC_AUTHORIZATIONURL,
    tokenURL: process.env.OIDC_TOKENURL,
    userInfoURL: process.env.OIDC_USERINFOURL,
    clientID: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET, 
    redirectURI: process.env.OIDC_CALLBACKURL,
    scope: 'openid profile email',
};

const decodeToken = (token) => {
    try {
      const decoded = jwt.decode(token);
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
};

//Landningssida för inloggade användare
appRoutes.get("/index", (req, res) => {
    if (!req.session.user) {
        return res.redirect(process.env.APP_PATH + '/login');
    }
    res.render('pages/almatools', { user: req.session.user.decodedIdToken });
});

//Användarprofil
appRoutes.get("/userprofile", (req, res) => {
    if (!req.session.user) {
        return res.redirect(process.env.APP_PATH + '/login');
    }
    res.render('pages/userprofile', { user: req.session.user.decodedIdToken });
});

//Login mot OIDC
appRoutes.get(`/login`, (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.state = state;
  
    const authUrl = `${OIDC_CONFIG.authorizationURL}?` + qs.stringify({
      client_id: OIDC_CONFIG.clientID,
      redirect_uri: OIDC_CONFIG.redirectURI,
      response_type: 'code',
      scope: OIDC_CONFIG.scope,
      state: state,
    });
  
    console.log('Redirecting to OIDC provider:', authUrl);
    res.redirect(authUrl);
});

//Callback för OIDC
appRoutes.get('/', async (req, res) => {
    const { code, state } = req.query;
  
    if (state !== req.session.state) {
      return res.status(403).send('CSRF-error.');
    }
  
    const tokenUrl = OIDC_CONFIG.tokenURL;
    const tokenData = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: OIDC_CONFIG.redirectURI,
      client_id: OIDC_CONFIG.clientID,
      client_secret: OIDC_CONFIG.clientSecret,
    };
  
    try {
      const response = await axios.post(tokenUrl, qs.stringify(tokenData), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
  
      const { access_token, id_token } = response.data;
      const decodedAccessToken = decodeToken(access_token);
      const decodedIdToken = decodeToken(id_token);
  
      req.session.user = {
        accessToken: access_token,
        idToken: id_token,
        decodedAccessToken,
        decodedIdToken,
      };
      return res.redirect(process.env.APP_PATH + '/index');
    } catch (error) {
      console.error('Error exchanging authorization code:', error.response.data);
      res.status(500).send('Authentication failed.');
    }
});

//Logga ut från OIDC
appRoutes.get(`/logout`, (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).send('Could not log out.');
      }
      res.redirect(`${OIDC_CONFIG.issuer}/oauth2/logout?post_logout_redirect_uri=${encodeURIComponent(OIDC_CONFIG.redirectURI)}`);
    });
});

appRoutes.post("/almalogin", Controllers.almalogin)

appRoutes.get("/newbookspage", Controllers.getNewbooksList)

appRoutes.get("/newbookscarouselpage", Controllers.getNewbooksCarousel)

appRoutes.get("/payment", async function (req, res, next) {
    let language = req.query.lang || 'sv'
    //object att skicka till template-ejs
    let config = {
        "createpaymentUrl": process.env.CREATEPAYMENTURL,
        translations: translations[language]
    }
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
                "systemheader": translations['en'].systemheader,
            },
            "sv": {
                "systemheader": translations['sv'].systemheader,
            },
        },
        "language": req.query.lang || 'sv'
    }

    //Verifiera token från Primo
    let decodedtoken
    try {
        decodedtoken = await VerifyToken.verifyexlibristoken(req.query.jwt)
    } catch (err) {
        console.log(err)
    }

    if (decodedtoken != 0) {
        almapaymentdata.decodedtoken = decodedtoken;

        //Hämta fees från Alma
        alma_apiurl = process.env.ALMAPIENDPOINT + 'users/' + decodedtoken.userName + '/fees?user_id_type=all_unique&status=ACTIVE&apikey=' + process.env.ALMAAPIKEY;
        console.log(alma_apiurl)
        try {
            const almaresponse = await axios.get(alma_apiurl)
            almapaymentdata.status = "success";
            almapaymentdata.message = "ok";
            almapaymentdata.alma = almaresponse.data;
        } catch (err) {
            console.log(err.message);
            almapaymentdata.status = "error";
            almapaymentdata.message = err.message;
        }
    } else {
        almapaymentdata.status = "error";
        almapaymentdata.message = "None or not a valid token";
    }

    res.render('pages/payment', { "config": config, "almapaymentdata": almapaymentdata });
})

appRoutes.get("/payment/checkout", async function (req, res, next) {

    let language = req.query.lang || 'sv'

    let config = {
        "checkpaymentUrl": process.env.CHECKPAYMENTURL,
        translations: translations[language]
    }

    decodedtoken = await VerifyToken.verifyexlibristoken(req.query.jwt)
    if (decodedtoken != 0) {
        try {
            //Kolla om betalning redan är utförd
            //Hämta payment
            const payment = await axios.post(process.env.ALMATOOLSAPI_INTERNAL_ENDPOINT + "v1/checkpayment/" + req.query.paymentId)
            if (payment.data.status && typeof payment.data.status !== "undefined" && payment.data.status !== "") {
                if (payment.data.finished == 1) {
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
                                "systemheader": translations['en'].systemheader,
                            },
                            "sv": {
                                "systemheader": translations['sv'].systemheader,
                            },
                        },
                        "language": language
                    }
                    res.render('pages/checkout', { "config": config, "almapaymentdata": almapaymentdata });
                }

                //Hämta fees från Alma
                let almaresponse
                totalamount = 0;
                if (req.query.fee_id == 'all') {
                    almapiurl = process.env.ALMAPIENDPOINT + 'users/' + decodedtoken.userName + '/fees?user_id_type=all_unique&status=ACTIVE&apikey=' + process.env.ALMAAPIKEY
                    almaresponse = await axios.get(almapiurl)
                    totalamount = almaresponse.data.total_sum
                } else {
                    almapiurl = process.env.ALMAPIENDPOINT + 'users/' + decodedtoken.userName + '/fees/' + req.query.fee_id + '?user_id_type=all_unique&status=ACTIVE&apikey=' + process.env.ALMAAPIKEY
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
                            "systemheader": translations['en'].systemheader,
                        },
                        "sv": {
                            "systemheader": translations['sv'].systemheader,
                        },
                    },
                    "language": language
                }
                res.render('pages/checkout', { "config": config, "almapaymentdata": almapaymentdata });
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
                            "systemheader": translations['en'].systemheader,
                        },
                        "sv": {
                            "systemheader": translations['sv'].systemheader,
                        },
                    },
                    "language": language
                }
                res.render('pages/checkout', { "config": config, "almapaymentdata": almapaymentdata });
            }
        } catch (err) {
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
                        "systemheader": translations['en'].systemheader,
                    },
                    "sv": {
                        "systemheader": translations['sv'].systemheader,
                    },
                },
                "language": language
            }
            res.render('pages/checkout', { "config": config, "almapaymentdata": almapaymentdata });
        }
    } else {
        almapaymentdata = {
            "status": "error",
            "message": translations[language].systemheader,
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
                    "systemheader": translations['en'].systemheader,
                },
                "sv": {
                    "systemheader": translations['sv'].systemheader,
                },
            },
            "language": language
        }
        res.render('pages/checkout', { "config": config, "almapaymentdata": almapaymentdata });
    }

})
app.use(process.env.APP_PATH, appRoutes);

const server = app.listen(process.env.PORT || 3002, function () {
    const port = server.address().port;
    console.log("App now running on port", port);
});

// Initiera socketserver
const io = socketIo(server, { path: process.env.SOCKETIOPATH })

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