require('dotenv').config()

const Models = require('./Models');
const translations = require('./translations/translations.json');

const fs = require("fs");
const path = require('path');
const axios = require('axios')

async function login(req, res) {
    try {
        const response = await axios.post(process.env.LDAP_API_URL + 'login', req.body)
        res
        .cookie("jwt", response.data.token, {
            maxAge: 60 * 60 * 24 * 7 * 1000,
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development", //om denna sätts till secure vid localhost så sätts ingen cookie!
        })
        .status(200)
        .json({ message: "Success" });
    } catch(err) {
        res.status(401)
        res.json({ message: "Error" });
    }
}

async function logout(req, res) {
    res
    .clearCookie("jwt")
    .status(200)
    .json({ message: "Success" });
}

async function almalogin(req, res) {
    try {
        const response = await axios.get(`https://api-eu.hosted.exlibrisgroup.com/almaws/v1/users/${req.body.user}?user_id_type=all_unique&view=full&expand=none&format=json&apikey=${process.env.ALMAAPIKEY}`)
        if(response.data.pin_number == req.body.pin_number) {
            res.status(200)
            res.json({ message: "Success" });
        } else {
            res.status(401)
            res.json({ message: "Unauthorized" });
        }
    } catch(err) {
        res.status(500)
        res.json({ message: "Error" });
    }
}

// Lista som visar nya böcker på https://www.kth.se/biblioteket/soka-vardera/nya-bocker-pa-kth-biblioteket-1.1175846
// Kodsnutt läggs in som html-block i polopoly
async function getNewbooksList(req, res) {
    try {
        let result = await Models.readNewbooks(req)
        let lang = req.query.lang || 'sv'
        let almatoolsconfig = {
            showwithnocover : req.query.showwithnocover || 'true',
            primoview :  req.query.primoview || '46KTH_VU1_L',
            target: req.query.target || '_blank',
            nroftitlestoshow : parseInt(req.query.nroftitlestoshow) || 20,
            min_publication_date: req.query.minpublicationdate || '2020-05-01',
            booktype: req.query.booktype || 'all',
            lang: req.query.lang || 'sv',
            bookitemtype_P_text : translations[lang].bookitemtype_P_text,
            bookitemtype_E_text : translations[lang].bookitemtype_E_text,
            bookitempublishedtext : translations[lang].bookitempublishedtext,
            bookimageurl: process.env.BOOKIMAGEURL,
            book200imageurl: process.env.BOOK200IMAGEURL,
            nojquery: req.query.nojquery || false,
            nostyle: req.query.nostyle || false
        }
        res.render('pages/newbookslist', 
        {
            almatoolsconfig: almatoolsconfig, 
            rows: result 
        })
    } catch (err) {
        res.send("error: " + err)
    }
}

// Karusell som visar nya böcker på https://www.kth.se/biblioteket
// Kodsnutt läggs in som html-block i polopoly
async function getNewbooksCarousel(req, res) {
    try {
        let result = await Models.readNewbooks(req)
        let primoview = req.query.primoview || '46KTH_VU1_L'
        let target = req.query.target || '_blank'
        let lang = req.query.lang || 'sv'
        let books = [];
        let image;
        let booktype;
        let nroftitlestoshow;
        (nroftitlestoshow > result.length ? nroftitlestoshow = result.length : nroftitlestoshow = parseInt(req.query.nroftitlestoshow))
        for (i=0;i<nroftitlestoshow;i++) {
            (result[i].booktype == "P") ? booktype = translations[lang].bookitemtype_P_text : booktype = translations[lang].bookitemtype_E_text;
            if (result[i].coverurl && result[i].coverurl != process.env.BOOKIMAGEURL) {
                image = result[i].coverurl
            } else {
                image = ''
            }
            books.push({
                link: `https://kth-ch.primo.exlibrisgroup.com/discovery/fulldisplay?vid=46KTH_INST:${primoview}&docid=alma${result[i].mmsid}&lang=${lang}`,
                image: image,
                title: result[i].title.replace('/', '').trim().substring(0,150),
                description: booktype,
                target: target,
                authors: [ result[i].subject ]
            });
        }
        let almatoolsconfig = {
            showwithnocover : req.query.showwithnocover || 'true',
            nocoverfontsize : req.query.nocoverfontsize || 20,
            carouseltype : req.query.carouseltype || 'carousel',
            stepInterval: req.query.stepInterval||"5000",
            stepDuration: req.query.stepDuration||"2000",
            maxshelfheight: req.query.maxshelfheight||"150",
            bookimageurl: process.env.BOOKIMAGEURL,
            book200imageurl: process.env.BOOK200IMAGEURL,
            nojquery: req.query.nojquery || false,
        }
        
        res.render('pages/newbookscarousel', 
        {
            almatoolsconfig: almatoolsconfig, 
            rows: result,
            books: books
        })
    } catch (err) {
        res.send("error: " + err)
    }
}

module.exports = {
    login,
    logout,
    almalogin,
    getNewbooksList,
    getNewbooksCarousel
};