var path = require('path');

// Rename this file to "config.js" after entering required info.

module.exports = {
    embedlyApiKey: "ENTER KEY HERE",
    thumbnail: {
        imageLibrary: 'graphicsmagick', //graphicsmagick or imagemagick
        concurrency: 2,
        storageDir: path.resolve(__dirname, '../public/storage/thumb')
    }
};