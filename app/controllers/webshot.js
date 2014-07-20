var webshot = require('webshot'),
    fs      = require('fs'),
    crypto  = require('crypto'),
    async   = require('async'),
    path    = require('path');

var md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex');
};

module.exports = {
    getIndex: function(req, res, next) {
        var url       = req.query.url || '';
        var key       = md5(url);
        var mimeType  = 'image/png';
        var imagePath = path.resolve(__dirname, '../../public/storage/webshot/'+key+'.png');

        if(url.length < 1) {
            console.log("Missing URL param");
            return res.status(404).send('Not found. Missing param.');
        }

        async.waterfall([
            function(callback) {
                //Check if image already exists
                fs.exists(imagePath, function(exists) {
                    callback(null, exists);
                });
            },
            function(found, callback) {
                if(found) {
                    return callback(null, true);
                }

                //Webshot the webpage and generate image
                webshot(url, imagePath, {
                    settings: {
                        resourceTimeout: 2000,
                        javascriptEnabled: true,
                        loadImages: true
                    }
                }, function(err) {
                    return callback(null, (err === null ? true : err));
                });
            }
        ], function (err, found) {
            if(err !== null || !found) {
                console.log(err);
                return res.status(404).send('Not found.');
            }

            fs.readFile(imagePath, function (err, data) {
                if(err) {
                    console.log(err);
                    return res.status(404).send('Not found. Failed to read.');
                };

                res.writeHead(200, {'Content-Type': mimeType });
                res.end(data, 'binary');
            });
        });
    }
}