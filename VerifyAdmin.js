const jwt = require("jsonwebtoken");
var jwkToPem = require('jwk-to-pem');

function verifyAdmin(req, res, next) {
    return new Promise(function (resolve, reject) {

        let token = req.body.jwt
            || req.query.jwt
            || req.body.apikey
            || req.query.apikey
            || req.cookies.jwt;

        if (!token)
            reject("no token");

        if (req.body.jwt || req.query.jwt || req.cookies.jwt) {
            jwt.verify(token, process.env.SECRET, function (err, decoded) {
                if (err) {
                    console.log(err.message)
                    reject(err.message)
                }
                req.userprincipalname = decoded.id;

                req.token = jwt.sign({ id: req.userprincipalname }, process.env.SECRET, {
                    expiresIn: "7d"
                });
                resolve("ok");
            });
        }

        if (req.body.apikey || req.query.apikey) {
            if (token != process.env.APIKEY) {
                reject(err.message)
            } else {
                resolve("ok");
            }
        }
    })
}

module.exports = verifyAdmin;