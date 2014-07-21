var async  = require('async'),
    path   = require('path'),
    uuid   = require('node-uuid'),
    config = require('../config'),
    gm     = require('gm');

var concurrency = config.thumbnail.concurrency;
var storageDir = config.thumbnail.storageDir;

if(config.thumbnail.imageLibrary === 'imagemagick')
    gm = gm.subClass({ imageMagick: true });

var thumbQ = async.queue(function(task, callback) {
    console.log('Generating thumbnail from:', task.source, task.width, task.height);

    gm(task.source).thumb(
        task.width,
        task.height,
        task.dest,
        typeof task.quality !== 'undefined' ? task.quality : 90,
        function(err, stdout, stderr, command) {
            // Thumbnai saved callback
            callback(err, task);
        }
    );
}, concurrency);

// Convert an image into 3 thumbnails
var process = function(inputFilePath, outFileName, callback) {

    if(!outFileName) {
        outFileName = uuid.v4();
    }

    thumbQ.push([
        {
            source: inputFilePath,
            dest: storageDir+'/small/'+outFileName,
            width: 100,
            height: 100
        },
        {
            source: inputFilePath,
            dest: storageDir+'/medium/'+outFileName,
            width: 200,
            height: 200
        },
        {
            source: inputFilePath,
            dest: storageDir+'/large/'+outFileName,
            width: 350,
            height: 350
        }
    ], function(err, task) {
        // Callback for when each task is complete
        if(typeof callback === 'function')
            callback(err, task);
    });
};

exports.q = thumbQ;
exports.process = process;