var express     = require('express'),
    app         = express(),
    compression = require('compression'),
    port        = process.env.PORT || 8080,
    env         = process.env.NODE_ENV || 'development';

app.use(compression());

app.use(express.static(__dirname + '/public', { maxAge: 86400000 }));

var server = app.listen(port);
var io = require('socket.io')(server);

// Bootstrap routes
require("./app/routes")(app, io);

console.log('Listening on port: '+port); 