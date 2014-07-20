var db      = require('../db'),
    util    = require('../libraries/util'),
    extract = require('../libraries/extract'),
    async   = require('async');

module.exports = {
    findAll: function(callback) {
        db.collection('posts').find({}).toArray(function (err, records) {
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
        db.collection('posts').findOne({_id: id}).toArray(function (err, record) {
            if (err) {
                callback(err);
            } else {
                callback(null, record);
            }
        });
    },

    create: function(data, callback) {
        data.created = (new Date()).getTime();
        data.domain = data.content.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1];

        if(!util.validUrl(data.content)) {
            callback('Invalid url in "data.content"');
        }

        // Scrape / extract addition data from url
        extract(data.content, function(err, _data) {
            if(err) {
                callback(err);
            } else {
                data = util.extend({}, data, _data);

                if(data.embed) {
                    if(!data.title && data.embed.title) {
                        data.title = data.embed.title;
                    }

                    if(data.embed.description) {
                        data.description = data.embed.description;
                    }

                    if(data.embed.thumbnail_url && 
                       (data.embed.type == 'rich' || 
                        data.embed.type == 'photo' || 
                        data.embed.type == 'video')
                    ) {
                        data.thumbnail = data.embed.thumbnail_url;
                    }
                }

                db.collection('posts').findAndModify(
                    { ucid: data.ucid },
                    [['_id','asc']],
                    data,
                    { upsert: true, new: true },
                    function(err, record){
                        if (err){
                            console.log(err);
                            callback(err);
                        } else {
                            var isNew = typeof data._id === 'undefined';
                            console.log(record._id);
                            data._id = record._id;
                            callback(null, isNew, data);
                        }
                    }
                );
            }
        });
    },

    update: function(id, data, callback) {
        // @TODO: Re-scrape page if url changes. See create() function above.

        db.collection('posts').findAndModify(
            {_id: id}, 
            data, 
            [['_id','asc']], 
            {new: true},
            function(err, record) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, record);
                }
            }
        );
    },

    delete: function(id, callback) {
        db.collection('posts').remove({_id:id}, function(err, modified) {
            if (err) {
                callback(err);
            } else {
                callback(null, modified);
            }
        });
    },

    addComment: function(id, comment, callback) {
        db.collection('posts').findAndModify(
            {_id: id}, 
            [['_id','asc']], 
            {$push: {comments: comment}}, 
            {new: true},
            function(err, record) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, record);
                }
            }
        );
    }
};