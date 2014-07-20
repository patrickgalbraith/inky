var embedly = require('embedly'),
    async   = require('async'),
    read    = require('node-read'),
    webshot = require('../services/webshot'),
    util    = require('./util');

var EMBEDLY_KEY = 'c00640d5e30a4899af13d6b96710fb87';

// Read page using node.read (readability fork)
var readabilityTask = function(url, callback) {
    read(url, function(err, article, meta) {
        if (!err) {
            var allowedTags = '<br><a><p><code><pre><strong><b><em><img>';
            
            var data = {};
            data.title = article.title;
            //data.article = util.stripTags(article.content, allowedTags);
            data.excerpt = util.htmlExcerpt(util.stripTags(article.content, allowedTags), 2000);

            //Shortcut icon
            var $scEl = article.dom('head > link[rel*="icon"]');
            if($scEl.length) {
                data.icon = $scEl.attr('href');
            } else {
                data.icon = null;
            }

            callback(null, data);
        } else {
            callback(err);
        }
    });
};

// Extract additional info using Embedly API
var embedlyTask = function(url, callback) {
    var ebly = new embedly({key: EMBEDLY_KEY}, function(err, api) {
        if (!err) {
            api.oembed({url: url}, function(err, objs) {
                if(!err && objs.length > 0) {
                    var data = {};
                    data.embed = objs[0];
                    callback(null, data);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// Take screenshot of url using webshot
var webshotTask = function(url, callback) {
    webshot.process(url, function(err, imagePath, imagePathThumb) {
        if (!err) {
            var data = {};
            data.thumbnail = imagePathThumb;
            data.screenshot = imagePath;
            callback(err, data);
        } else {
            callback(err);
        }
    });
};


var q = async.queue(function (task, _callback) {
    if(task.name === 'readability') {
        readabilityTask(task.url, function(err, data) {
            if(!!err) return _callback(err);
            _callback(null, data);
        });
    } else if (task.name === 'embedly') {
        embedlyTask(task.url, function(err, data) {
            if(!!err) return _callback(err);
            _callback(null, data);
        });
    } else if(task.name === 'webshot') {
        webshotTask(task.url, function(err, data) {
            if(!!err) return _callback(err);
            _callback(null, data);
        });
    }
}, 2);

module.exports = function(url, callback) {
    q.push({name: 'readability', url: url}, callback);
    q.push({name: 'embedly', url: url}, callback);
    q.push({name: 'webshot', url: url}, callback);
};