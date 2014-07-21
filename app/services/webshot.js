var webshot   = require('webshot'),
    fs        = require('fs'),
    async     = require('async'),
    util      = require('../libraries/util'),
    thumbnail = require('./thumbnail'),
    path      = require('path');

var STORAGE_PATH = '../../public/storage/webshot/';

var process = function(url, callback) {
    var key       = util.md5(url);
    var mimeType  = 'image/png';
    var imagePath = path.resolve(__dirname, STORAGE_PATH+key+'.png');
    var thumbPath = path.resolve(__dirname, STORAGE_PATH+key+'_t.png');

    if(url.length < 1) {
        return callback("Missing URL");
    }

    async.waterfall([
        function(_callback) {
            //Check if image already exists
            fs.exists(imagePath, function(exists) {
                _callback(null, exists);
            });
        },
        function(found, _callback) {
            if(found) {
                return _callback(null, true, false);
            }

            //Webshot the webpage and generate image
            webshot(url, imagePath, {
                settings: {
                    resourceTimeout: 2000,
                    javascriptEnabled: true,
                    loadImages: true
                }
            }, function(err) {
                return _callback(err, (err === null ? true : false), true);
            });
        },
        function(found, needsThumb, _callback) {
            if(!needsThumb) {
                return _callback(null, found);
            }

            thumbnail.q.push([
                {
                    source: imagePath,
                    dest: thumbPath,
                    width: 100,
                    height: 100
                }
            ], function(err, task) {
                if(!err) {
                    _callback(null, found);
                } else {
                    _callback(err);
                }
            });
        }
    ], function (err, found) {
        if(err !== null || !found) {
            console.log(err);
            callback(err);
        }

        callback(null, util.pathToUrl(imagePath), util.pathToUrl(thumbPath));
    });
};

exports.process = process;