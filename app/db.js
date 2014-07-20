var driver   = require('tingodb')().Db,
    path     = require('path');

var db = new driver(path.resolve(__dirname, '../storage/db'), {});

module.exports = db;