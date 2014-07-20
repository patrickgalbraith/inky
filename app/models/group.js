var db = require('../db');

module.exports = {
    findAll: function(callback) {
        db.collection('groups').find({}).toArray(function (err, records) {
            if (err) {
                callback(err);
            } else {
                if(records.length) {
                    callback(null, records);
                } else {
                    callback(null, []);
                }
            }
        });
    },

    findById: function(id, callback) {
        db.collection('groups').findOne({_id: id}).toArray(function (err, record) {
            if (err) {
                callback(err);
            } else {
                callback(null, record);
            }
        });
    },

    create: function(data, callback) {
        db.collection('groups').insert(data, function(err, records){
            if (err) {
                callback(err);
            } else {
                callback(null, records[0]);
            }
        });
    },

    update: function(id, data, callback) {
        db.collection('groups').update({_id:id}, data, function(err, modified) {
            if (err) {
                callback(err);
            } else {
                callback(null, modified, data);
            }
        });
    },

    delete: function(id, callback) {
        db.collection('groups').remove({_id:id}, function(err, modified) {
            if (err) {
                callback(err);
            } else {
                callback(null, modified);
            }
        });
    }
};