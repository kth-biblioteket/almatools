require('dotenv').config()

const Models = require('./Models');
const translations = require('./translations/translations.json');

const fs = require("fs");
const path = require('path');
const axios = require('axios')
const jwt = require("jsonwebtoken");
const marc4js = require("marc4js");
const Record = require("marc-record-js");

async function login(req, res) {
    try {
        const response = await axios.post(process.env.LDAP_API_URL + 'login', req.body)
        res
        .cookie("jwt", response.data.token, {
            maxAge: 60 * 60 * 24 * 7 * 1000,
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
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

async function getActivatePatron(req, res) {
    try {
        res.render('pages/activatepatron', 
        {
            user: req.session.user ? req.session.user.decodedIdToken : null
        })
    } catch (err) {
        res.send("error: " + err)
    }
}

async function getNewbooksAdmin(req, res) {
    try {
        let result = await Models.readNewbooks(req)
        res.render('pages/newbooksadmin', 
        {
            user: req.session.user ? req.session.user.decodedIdToken : null,
            books: result
        })
    } catch (err) {
        res.send("error: " + err)
    }
}

async function almalogin(req, res) {
   
    //Logga in med password
    if (req.query.op == 'auth') {
        let username = req.body.user;
        try {
            const response = await axios.post(`${process.env.ALMA_API_ENDPOINT}users/${req.body.user}?user_id_type=all_unique&op=auth&apikey=${process.env.ALMAAPIKEY}`,{},{headers: {"Exl-User-Pw" : req.body.password}})
            const user = await axios.get(`${process.env.ALMA_API_ENDPOINT}users/${req.body.user}?user_id_type=all_unique&view=full&expand=none&format=json&apikey=${process.env.ALMAAPIKEY}`)
            
            const token = jwt.sign({ username, role: 'user' }, process.env.SECRET, { expiresIn: '3h' });
            //En aktiv patronroll måste finnas för att kunna logga in
            const hasActivePatronRole = user.data.user_role.some(role =>
                role.status?.value === 'ACTIVE' &&
                role.role_type?.value === '200' // Patron
            );
            //Ska vara en icke kth-användare(Not affiliated with KTH = 30)
            const isNonKth = user.data.user_group?.value === '30';

            if (isNonKth) {
                if (hasActivePatronRole) {
                    res.status(200)
                    res.json({ message: "Success", data: user.data, token: token });
                } else {
                    res.status(402)
                    res.json({ message: "You need to activate your account, contact the library" });
                }
            } else {
                res.status(403)
                res.json({ message: "Only external users can login" });
            }
        } catch(err) {
            if(err.response) {
                if(err.response.status == 400) {
                    console.log(JSON.stringify({ message: "Unauthorized", username: username, error: err.response.data}))
                    res.status(401)
                    res.json({ message: "Unauthorized"});
                } 
            } else {
                    console.log(err)
                    res.status(404)
                    res.json({ message: "Error" });
            }
        }
    } else {
        //Logga in med pin
        try {
            const response = await axios.get(`${process.env.ALMA_API_ENDPOINT}users/${req.body.user}?user_id_type=all_unique&view=full&expand=none&format=json&apikey=${process.env.ALMAAPIKEY}`)
            if(response.data.pin_number == req.body.pin_number) {
                res.status(200)
                res.json({ message: "Success", data: response.data });
            } else {
                res.status(401)
                res.json({ message: "Unauthorized" });
            }
        } catch(err) {
            if (err.response && err.response.status === 400) {
                res.status(400).json({ message: err.response.data.errorList.error[0].errorMessage });
            } else {
                // Handle other types of errors
                res.status(500).json({ message: "Error" });
            }
        }
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

async function readFailedLibrisImports(req, res) {
    try {
        const results = await Models.readFailedLibrisImports(req)
        
        // Lägg till marcText för varje post
        results.forEach(row => {
            if (row.record) {
                const recordObj = JSON.parse(row.record);
                row.marcTable = jsonToMarcTable(recordObj);
                row.marcText = jsonToMarc21(recordObj);
            } else {
                row.marcText = '';
                row.marcTable = [];
            }
        });

        res.render('pages/librisimport', { 
            user: req.session.user ? req.session.user.decodedIdToken : null, 
            records: results, 
            refreshMs: process.env.LIBRISIMPORTREFRESHMS || "8000" 
        });
    } catch (err) {
        res.send("error: " + err)
    }
}

async function retryFailedLibrisImports(req, res) {
    try {
        let results = await Models.retryFailedLibrisImports(req)
        res.json({ success: true, message: results });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: err });
    }
}

async function getFailedLibrisRecordsJson(req, res) {
    try {
        let results = await Models.readFailedLibrisImports(req)

        // Lägg till marcText för varje post
        results.forEach(row => {
            if (row.record) {
                const recordObj = JSON.parse(row.record);
                row.marcTable = jsonToMarcTable(recordObj);
                row.marcText = jsonToMarc21(recordObj);
            } else {
                row.marcText = '';
                row.marcTable = [];
            }
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err });
    }
}

async function getAllConfig(req, res) {
    try {
        const configs = await Models.getAllConfig();
        res.render('pages/config', { 
            configs, 
            user: req.session.user ? req.session.user.decodedIdToken : null
        });
    } catch (err) {
        res.status(500).send("Fel vid hämtning av config: " + err.message);
    }
}

// Uppdatera befintliga värden

async function updateConfig(req, res) {
    try {
        console.log(req.body);
        const configs = req.body.configs;
        const promises = Object.entries(configs).map(async ([key, obj]) => {
            const value = obj.value;
            const description = obj.description;
            await Models.updateConfig(key, value, description);
        });
        await Promise.all(promises);
        res.redirect('/almatools/config');
    } catch (err) {
        console.log(err);
        res.status(500).send("Fel vid uppdatering av config: " + err.message);
    }
};

// Skapa ny nyckel
async function createConfig(req, res) {
    try {
        const { key, value, description } = req.body;
        if (!key || !value) {
            return res.status(400).send("Både key och value krävs");
        }
        await Models.createConfig(key, value, description || null);
        res.redirect('/almatools/config');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).send(`Nyckeln "${req.body.key}" finns redan.`);
        } else {
            res.status(500).send("Fel vid skapande av config: " + err.message);
        }
    }
};

// Ta bort nyckel
async function deleteConfig(req, res) {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).send("Key krävs");
        await Models.deleteConfig(key);
        res.redirect('/almatools/config');
    } catch (err) {
        res.status(500).send("Fel vid borttagning av config: " + err.message);
    }
};


function jsonToMarc21(record) {
    let lines = [];

    if (record.leader) lines.push(`=LDR  ${record.leader}`);

    if (record.controlfield && Array.isArray(record.controlfield)) {
        record.controlfield.forEach(cf => {
            lines.push(`=${cf.$.tag}  ${cf._}`);
        });
    }

    if (record.datafield && Array.isArray(record.datafield)) {
        record.datafield.forEach(df => {
            const tag = df.$.tag;
            const ind1 = df.$.ind1 || ' ';
            const ind2 = df.$.ind2 || ' ';

            if (Array.isArray(df.subfield)) {
                const subfields = df.subfield.map(sf => `#${sf.$.code} ${sf._}`).join(' ');
                lines.push(`=${tag}  ${ind1}${ind2} ${subfields}`);
            } else if (df.subfield) {
                const sf = df.subfield;
                lines.push(`=${tag}  ${ind1}${ind2} $${df.subfield.$.code} ${df.subfield._}`);
            }
        });
    }

    return lines.join('\n');
}

function jsonToMarcTable(record) {
    const rows = [];

    // Leader motsvarar "000"
    if (record.leader) {
        rows.push({
            tag: '000',
            i1: '',
            i2: '',
            data: record.leader.trim()
        });
    }

    // Controlfields
    if (record.controlfield && Array.isArray(record.controlfield)) {
        record.controlfield.forEach(cf => {
            rows.push({
                tag: cf.$.tag,
                i1: '',
                i2: '',
                data: cf._.trim()
            });
        });
    }

    // Datafields
    if (record.datafield && Array.isArray(record.datafield)) {
        record.datafield.forEach(df => {
            const tag = df.$.tag;
            const i1 = df.$.ind1 || '';
            const i2 = df.$.ind2 || '';

            // Subfields som sträng "#a text#b text"
            let data = '';
            if (Array.isArray(df.subfield)) {
                data = df.subfield.map(sf => `#${sf.$.code} ${sf._}`).join('');
            } else if (df.subfield) {
                data = `#${df.subfield.$.code} ${df.subfield._}`;
            }

            rows.push({ tag, i1, i2, data });
        });
    }

    return rows;
}

module.exports = {
    login,
    logout,
    getActivatePatron,
    getNewbooksAdmin,
    almalogin,
    getNewbooksList,
    getNewbooksCarousel,
    readFailedLibrisImports,
    retryFailedLibrisImports,
    getFailedLibrisRecordsJson,
    getAllConfig,
    updateConfig,
    createConfig,
    deleteConfig
};