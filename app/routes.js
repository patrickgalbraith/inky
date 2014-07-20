var posts  = require('./models/post'),
    groups = require('./models/group');

module.exports = function(app, io) {

    //groups.create({title: 'Design'}, function(){ 
    //    groups.create({title: 'Development'}, function(){}); 
    //});

    io.sockets.on('connection', function (socket) {
        //////////////////////////////
        // POSTS
        socket.on('posts:read', function (data, callback) {
            posts.findAll(callback);
        });

        socket.on('post:read', function (data, callback) {
            if(typeof data.id === 'undefined' && typeof data._id !== 'undefined')
                data.id = data._id;

            posts.findById(data.id, callback);
        });

        socket.on('post:create', function (data, callback) {
            // The create callback may be called multiple times as each creation 
            // task completes (such as scraping, thumbnailing, etc.)
            posts.create(data, function(err, isNew, record) {
                if(err) {
                    console.log('ERR: socket.on(post:create)', err);
                    callback(err);
                } else {
                    if(isNew) {
                        console.log(' post:create - New post');

                        socket.emit('posts:create', record);
                        socket.broadcast.emit('posts:create', record);
                        callback(null, record);
                    } else {
                        console.log(' post:create - Update post');

                        socket.emit('post/' + record._id + ':update', record);
                        socket.broadcast.emit('post/' + record._id + ':update', record);
                        callback(null, record);
                    }
                }
            });
        });

        socket.on('post:update', function (data, callback) {
            if(typeof data.id === 'undefined' && typeof data._id !== 'undefined')
                data.id = data._id;

            posts.update(data.id, data, function(err, data) {
                if (err) {
                    console.log('ERR: socket.on(post:update)', err);
                    callback(err);
                } else {
                    socket.emit('post/' + data._id + ':update', data);
                    socket.broadcast.emit('post/' + data._id + ':update', data);
                    callback(null, data);
                }
            });
        });

        // @TODO: currently only patches comments
        socket.on('post:patch', function (data, callback) {
            if(typeof data.id === 'undefined' && typeof data._id !== 'undefined')
                data.id = data._id;

            if(data.comments) {
                posts.addComment(data.id, data.comments[0], function(err, data) {
                    if (err) {
                        console.log('ERR: socket.on(post:patch)', err);
                        callback(err);
                    } else {
                        socket.emit('post/' + data._id + ':update', data);
                        socket.broadcast.emit('post/' + data._id + ':update', data);
                        callback(null, data);
                    }
                });
            }
        });

        socket.on('post:delete', function (data, callback) {
            if(typeof data.id === 'undefined' && typeof data._id !== 'undefined')
                data.id = data._id;

            posts.delete(data.id, function(err, modified) {
                if (err) {
                    callback(err);
                } else {
                    socket.emit('post/' + data.id + ':delete', data);
                    socket.broadcast.emit('post/' + data.id + ':delete', data);
                    callback(null, data);
                }
            });
        });

        //////////////////////////////
        // GROUPS
        socket.on('groups:read', function (data, callback) {
            groups.findAll(callback);
        });

        socket.on('group:read', function (data, callback) {
            if(typeof data.id === 'undefined' && typeof data._id !== 'undefined')
                data.id = data._id;

            groups.findById(data.id, callback);
        });

        socket.on('group:create', function (data, callback) {
            groups.create(data, function(err, record) {
                if(!err) {
                    socket.emit('groups:create', record);
                    socket.broadcast.emit('groups:create', record);
                    callback(null, record);
                } else {
                    callback(err);
                }
            });
        });

        socket.on('group:update', function (data, callback) {
            if(typeof data.id === 'undefined' && typeof data._id !== 'undefined')
                data.id = data._id;

            groups.update(data.id, data, function(err, modified) {
                if (err) {
                    callback(err);
                } else {
                    socket.emit('group/' + data.id + ':update', data);
                    socket.broadcast.emit('group/' + data.id + ':update', data);
                    callback(null, data);
                }
            });
        });

        socket.on('group:delete', function (data, callback) {
            if(typeof data.id === 'undefined' && typeof data._id !== 'undefined')
                data.id = data._id;

            groups.delete(data.id, function(err, modified) {
                if (err) {
                    callback(err);
                } else {
                    socket.emit('group/' + data.id + ':delete', data);
                    socket.broadcast.emit('group/' + data.id + ':delete', data);
                    callback(null, data);
                }
            });
        });
    });
};