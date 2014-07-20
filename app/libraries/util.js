var crypto = require('crypto')
    path   = require('path');

exports.validUrl = function(str) {
    var pattern = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;

    if(!pattern.test(str)) {
        return false;
    } else {
        return true;
    }
};

exports.stripTags = function(input, allowed) {
    allowed = (((allowed || '') + '')
        .toLowerCase()
        .match(/<[a-z][a-z0-9]*>/g) || [])
        .join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)

    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

    return input.replace(commentsAndPhpTags, '')
                .replace(tags, function ($0, $1) {
                    return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
                }
            );
};

exports.excerpt = function(str, limit, suffix) {
    if(typeof suffix == 'undefined')
        suffix = '...';
    return (str.length > limit) ? str.substring(0, limit)+suffix : str;
};

exports.htmlExcerpt = function(str, limit, suffix) {
    var res = exports.excerpt(str, limit, suffix);

    // Extremelly naeve fix but works for now
    // @TODO: use something like jquery to fix it on the backend
    if(res.lastIndexOf('<') > res.lastIndexOf('>')) {
        return res.slice(0, res.lastIndexOf('>') + 1);
    }

    return res;
};

exports.extend = function(){
    for(var i=1; i<arguments.length; i++)
        for(var key in arguments[i])
            if(arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
    return arguments[0];
};

exports.md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex');
};

exports.pathToUrl = function(filePath) {
    var publicPath = path.join(__dirname, "../../public");

    var bits = path.normalize(filePath)
                   .replace(publicPath, '')
                   .split(path.sep);

    return bits.join('/');
};