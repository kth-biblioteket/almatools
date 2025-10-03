const database = require('./db');

//Hämta alla böcker från och med aktiveringsdatum
const readNewbooks = (req) => {
    let showwithnocover = req.query.showwithnocover || 'true'
    let coverurl = '%images/book.png%'

    if(showwithnocover === 'true') {
        coverurl = '%nocoverurl%'
    }
    let activationdate = req.query.activationdate || '2020-01-01';
    let publicationdate = req.query.publicationdate || '2020';
    let sql = `SELECT id, mmsid, recordid, isbn, isbnprimo, thumbnail, coverurl, 
                    title, DATE_FORMAT(activationdate, "%Y-%m-%d") as activationdate, 
                    publicationdate, dewey, subject, category, subcategory, booktype 
                    FROM newbooks
                    WHERE activationdate >= ?
                    AND  cast(publicationdate AS SIGNED) >= ?
                    AND coverurl NOT LIKE ?
                    ORDER BY activationdate DESC`;
  
      /*
    if(req.query.activationdate) {
        sql += ` AND activationdate >= '${req.query.activationdate}'`
    }
  
    if(req.query.publicationdate) {
        sql += ` AND  cast(publicationdate AS SIGNED) >= ${req.query.publicationdate}`
    }
  
    if(req.query.booktype) {
        sql += ` AND booktype = '${req.query.booktype}'`
    }
  
    if(req.query.dewey) {
        if (req.query.dewey.length == 1) {
            sql += ` AND (dewey LIKE '${req.query.dewey}__.%' OR dewey LIKE '${req.query.dewey}__/%')`
        }
        if (req.query.dewey.length == 2) {
            sql += ` AND (dewey LIKE '${req.query.dewey}_.%' OR dewey LIKE '${req.query.dewey}_/%')`
        }
        if (req.query.dewey.length == 3) {
            sql += ` AND (dewey LIKE '${req.query.dewey}.%' OR dewey LIKE '${req.query.dewey}/%')`
        }
        
    }
    */
  
    //sql += ` ORDER BY activationdate DESC`;
  
    return new Promise(function (resolve, reject) {    
        database.db.query(database.mysql.format(sql,[activationdate, publicationdate, coverurl]),(err, result) => {
            if(err) {
              console.error('Error executing query:', err);
              reject(err.message)
            }
            const successMessage = "Success"
            resolve(result);
        });
    })
};

const readFailedLibrisImports = (req) => {
    let sql = `SELECT * FROM libris_import_records`;
  
    return new Promise(function (resolve, reject) {    
        database.db.query(database.mysql.format(sql),(err, result) => {
            if(err) {
              console.error('Error executing query:', err);
              reject(err.message)
            }
            const successMessage = "Success"
            resolve(result);
        });
    })
};

const retryFailedLibrisImports = (req) => {
    const id = req.params.id;
    let sql = `UPDATE libris_import_records SET attempts = attempts - 1, last_attempt = NOW(), status= "failed" WHERE id = ?`;

    return new Promise(function (resolve, reject) {  
        database.db.query(database.mysql.format(sql,[id]),async (err, result) => {
            if(err || result.length === 0) {
              console.error('Error executing query:', err);
              reject(err.message)
            }
            resolve(`✅ Omförsök kommer att utföras: ${id}`);
        });
    })
};



module.exports = {
    readNewbooks,
    readFailedLibrisImports,
    retryFailedLibrisImports
};