window.socket = io.connect(window.location.origin);

(function() {
    window.Inky = {
        Models: {},
        Collections: {},
        Views: {},
        Util: {}
    };

    Backbone.View.prototype.close = function(){
        this.remove();
        this.unbind();
    };

    /********************************/
    /*             UTIL             */
    /********************************/
    Inky.Util.getJSON = function(filename, callback) {
        $.ajax({
            url: filename,
            dataType: 'json'
        })
        .done(function(data) {
            callback(null, data)
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            callback(errorThrown);
        });
    };

    Inky.Util.timeago = function(timestamp, short) {
        var seconds = Math.floor((new Date() - timestamp) / 1000);
        var interval = Math.floor(seconds / 31536000);

        if(typeof short === 'undefined'){
            short = false;
        }

        if (interval > 1) {
            return interval + (short ? "yr" : " years ago");
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + (short ? "mth" : " months ago");
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + (short ? "d" : " days ago");
        }
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
            return interval + (short ? "h" : " hours ago");
        }
        interval = Math.floor(seconds / 60);
        if (interval >= 1) {
            return interval + (short ? "m" : " minutes ago");
        }
        return Math.floor(seconds) + (short ? "s" : " seconds ago");
    }

    /********************************/
    /*            MODELS            */
    /********************************/
    Inky.Models.Group = Backbone.Model.extend({
        urlRoot: 'group',
        noIoBind: false,
        socket: window.socket,
        idAttribute: '_id',

        initialize: function() {
            console.log('new group', this.get('title'));
        },

        isSelected: function() {
            return this.collection.getSelected() === this;
        }
    });

    Inky.Collections.Group = Backbone.Collection.extend({
        model: Inky.Models.Group,
        url: 'groups',
        socket: window.socket,

        initialize: function() {
            this.selected = null;
        },

        setSelected: function(group) {
            if (this.selected) {
                this.selected.trigger('unselected');
            }

            if(group) {
                group.trigger('selected');
            }
            
            this.selected = group;

            this.trigger('selected:change', group);
        },

        getSelected: function() {
            return this.selected;
        },

        getSlug: function() {
            return this.getSelected() ? this.getSelected().id : 'all';
        }
    });

    Inky.Models.Post = Backbone.Model.extend({
        urlRoot: 'post',
        noIoBind: false,
        socket: window.socket,
        idAttribute: '_id',

        initialize: function () {
            console.log('new post', this.get('title'));

            _.bindAll(this, 'serverChange', 'serverDelete', 'modelCleanup');

            /*!
            * if we are creating a new model to push to the server we don't want
            * to iobind as we only bind new models from the server. This is because
            * the server assigns the id.
            */
            if (!this.noIoBind) {
                this.ioBind('update', this.serverChange, this);
                this.ioBind('delete', this.serverDelete, this);
            }
        },
        serverChange: function (data) {
            // Useful to prevent loops when dealing with client-side updates (ie: forms).
            data.fromServer = true;
            this.set(data);
        },
        serverDelete: function (data) {
            if (this.collection) {
                this.collection.remove(this);
            } else {
                this.trigger('remove', this);
            }
            this.modelCleanup();
        },
        modelCleanup: function () {
            this.ioUnbindAll();
            return this;
        },

        toTemplateData: function() {
            var post = {};

            post._id = null;
            post.content = this.get('content');
            post.title = post.content;
            post.created = (new Date()).getTime();
            post.link = "#";
            post.embed = {};
            post.thumbnail = '';
            post.comments = [];
            post.excerpt = post.content;
            post.domain = post.content.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1];

            post = $.extend({}, post, this.toJSON());

            post.group = {
                id: post.group,
                title: app.groups.get(post.group).get('title'),
                link: '#g/'+post.group
            };

            post.persisted = post._id !== null;

            post.link = '#g/'+(app.groups.getSelected() !== null ? app.groups.getSelected().id : 'all')+'/'+post._id;

            post.excerpt = $('<div>'+post.excerpt+'</div>').html();

            if(!post.comments)
                post.comments = [];

            return post;
        }
    });

    Inky.Collections.Post = Backbone.Collection.extend({
        model: Inky.Models.Post,
        url: 'posts',
        socket: window.socket,

        initialize: function () {
            _.bindAll(this, 'serverCreate', 'collectionCleanup');
            this.ioBind('create', this.serverCreate, this);
        },
        serverCreate: function (data) {
            // make sure no duplicates, just in case
            var exists = this.findWhere({ucid: data.ucid});

            if (!exists) {
                this.add(data);

                if(data.author !== app.author) {
                    notify.createNotification('Inky - New Post', {
                        body: data.content
                    });
                }
            } else {
                exists.serverChange(data);
            }
        },
        collectionCleanup: function (callback) {
            this.ioUnbindAll();
            this.each(function (model) {
                model.modelCleanup();
            });
            return this;
        }
    });

    /********************************/
    /*             VIEWS            */
    /********************************/
    Inky.Views.Sidebar = Backbone.View.extend({
        className: "sidebar",

        events: {
            "click .compose-button": "composeClick",
        },

        initialize: function() {
            this.listenTo(this.model, "all", this.renderMenu);
        },

        render: function() {
            var template = _.template($('#template-sidebar').html(), {});
            this.$el.html(template);

            this.renderMenu();

            return this;
        },

        renderMenu: function() {
            var $nav = this.$el.find('#primary-sidebar');
            var lis = '';

            lis += '<li class="'+(this.model.getSelected() === null ? 'active' : '')+'"><a href="#g/all" data-groupid="all">All</a></li>';

            this.model.forEach(function(group, idx) {
                lis += '<li class="'+(group.isSelected() ? 'active' : '')+'"><a href="#g/'+group.id+'">'+group.get('title')+'</a></li>'
            });

            $nav.find('li:not(.initial)').remove()
            $nav.append(lis);
            return this;
        },

        composeClick: function() {
            app.navigate('/g/'+this.model.getSlug()+'/new/edit', {trigger: true});
        }
    });

    Inky.Views.PostsPane = Backbone.View.extend({
        tagName: 'aside',
        className: "content-aside posts-list-pane",

        initialize: function() {
            this.listenTo(this.model, "all", this.render);

            this.selectedPost = null;
            this.visiblePosts = null;
        },

        render: function() {
            var template = _.template($('#template-posts-aside').html(), {});
            this.$el.html(template);

            this.visiblePosts = this.model.toArray().reverse();
            this.renderPosts();
            return this;
        },

        selectPost: function(postId) {
            this.selectedPost = postId;
            this.renderPosts();
        },

        renderPosts: function() {
            var $_el = $("<div>");

            this.visiblePosts.forEach(function(post, index) {
                $_el.append(_.template($('#template-posts-list-post').html(), {
                    post: post.toTemplateData(),
                    selected: this.selectedPost == post.id
                }));
            }, this);

            this.$el.find('.posts').html($_el.html());
        },

        showAll: function() {
            this.visiblePosts = this.model.toArray().reverse();
            this.renderPosts();
        },

        filterByGroup: function(groupId) {
            this.visiblePosts = this.model.filter(function(post) {
                return post.get('group') == groupId;
            }).reverse();

            this.renderPosts();
        }
    });

    Inky.Views.EditPostPane = Backbone.View.extend({
        className: "content-main edit-post-pane",

        events: {
            "submit form": "submitForm",
            "click [data-click='cancel']": "onCancel"
        },

        initialize: function() {
            this.listenTo(this.model.get('groups'), "all", this.render);
        },

        render: function() {
            var post = this.model.get('post');
            var posts = this.model.get('posts');
            var groups = this.model.get('groups');

            var template = _.template($('#template-edit-post').html(), {
                isNew: post === null,
                groups: groups.toJSON(),
                content: (post !== null ? post.get('content') : ''),
                comment: (post !== null ? post.get('comment') : '')
            });

            this.$el.html(template);

            return this;
        },

        submitForm: function(e) {
            e.preventDefault();
            var self = this;

            var post = this.model.get('post') ? this.model.get('post') : new (Inky.Models.Post.extend({ noIoBind: true }))();
            var groups = this.model.get('groups');

            post.save({
                ucid: uuid.v4(), // Unique ID used to match client model with socket io response
                author: app.author,
                content: $(e.target).find('input[name=content]').val(),
                group: $(e.target).find('select[name=group]').val(),
                comment: $(e.target).find('textarea[name=comment]').val()
            }, {
                success: function(model, response, options) {
                    app.navigate('/g/'+groups.getSlug()+'/'+model.id, {trigger: true});
                },
                error: function(model, response, options) {
                    console.log('Error saving post!');
                }
            });

            self.model.get('posts').add(post);

            if(app.contentView) {
                app.contentView.remove();
            }
        },

        onCancel: function(e) {
            var post = this.model.get('post');
            var groups = this.model.get('groups');

            if(app.contentView) {
                app.contentView.remove();
            }

            app.postsView.selectPost(null);

            app.navigate((post === null ? '#g/'+groups.getSlug() : '#g/'+groups.getSlug()+'/'+post.id), {trigger: true});
        }
    });

    Inky.Views.ViewPostPane = Backbone.View.extend({
        className: "content-main view-post-pane",

        events: {
            "submit #comment-form": "onAddComment",
            "click [data-click='edit']": "onEdit",
            "click [data-click='delete']": "onDelete",
        },

        initialize: function() {
            this.listenTo(this.model.get('post'), "all", this.render);
        },

        render: function() {
            var post = this.model.get('post');

            var template = _.template($('#template-view-post').html(), {
                post: post.toTemplateData()
            });

            this.$el.html(template);
            //this.$el.html(template).hide().delay(200).fadeIn(200);

            return this;
        },

        onEdit: function(e) {
            e.preventDefault();

            var post = this.model.get('post');
            var groups = this.model.get('groups');

            app.navigate('/g/'+groups.getSlug()+'/'+post.id+'/edit', {trigger: true});
        },

        onDelete: function(e) {
            e.preventDefault();

            var post = this.model.get('post');
            var groups = this.model.get('groups');

            if(confirm("Are you sure?")) {
                post.destroy({
                    success: function(model, response) {
                        if(app.contentView) {
                            app.contentView.remove();
                        }

                        app.navigate('/g/'+groups.getSlug(), {trigger: true});
                    }
                });
            }
        },

        onAddComment: function(e) {
            e.preventDefault();

            var post = this.model.get('post');

            var comments = post.get('comments') ? post.get('comments') : [];
            var content = $(e.currentTarget).find('textarea[name=comment]').val();

            if(!content) return;

            var comment = {
                author: app.author,
                content: content,
                created: (new Date()).getTime()
            };

            //comments.push(comment);

            post.save({
                comments: [comment]
            }, {
                patch: true
            });
        },

        /*remove: function() {
            var self = this;
            var args = arguments;

            this.$el.fadeOut(200, function() {
                Backbone.View.prototype.remove.apply(self, args);
            });
        }*/
    });

    Inky.Views.SettingsPane = Backbone.View.extend({
        className: "content-main settings-pane",

        events: {
            "click [data-click='notifyRequestPermission']": "onNotifyInstall",
            "change [name='handle']": "onHandleChange",
        },

        initialize: function() {
            //this.listenTo(this.model.get('posts'), "all", this.render);
            this.listenTo(this.model.get('groups'), "all", this.renderGroups);
        },

        render: function() {
            var template = _.template($('#template-settings').html(), {
                author: app.author,
                notify: {
                    permission: notify.permissionLevel() === notify.PERMISSION_GRANTED ? true : false,
                    supported: notify.isSupported
                }
            });

            this.$el.html(template);

            this.renderGroups();

            return this;
        },

        renderGroups: function() {
            var $el = this.$el.find('.groups').empty();
            var tpl = _.template($('#template-settings-group').html());

            this.model.get('groups').forEach(function(group) {
                $el.append(tpl({
                    id: group.id,
                    num: 0,
                    title: group.get('title')
                }));
            });

            $el.append(tpl({
                id: 'new',
                num: 0,
                title: ''
            }));
        },

        onHandleChange: function(e) {
            e.preventDefault();

            var $input = $(e.currentTarget);
            var val = $.trim($input.val());

            if(val) {
                app.author = val;

                if('localStorage' in window && window['localStorage'] !== null) {
                    localStorage.setItem("handle", val);
                }
            }
        },

        onNotifyInstall: function(e) {
            var self = this;
            e.preventDefault();

            if (!notify.isSupported)
                return; // no notifications support

            if (notify.permissionLevel() === notify.PERMISSION_DEFAULT) {
                notify.requestPermission(function() {
                    if(notify.permissionLevel() === notify.PERMISSION_GRANTED) {
                        self.find('.notification .btn').text('ENABLED').prop('disabled', true);
                    }
                });
            }
        }
    });

    /********************************/
    /*            ROUTER            */
    /********************************/
    Inky.App = Backbone.Router.extend({
        routes: {
            '': 'indexAction',
            '/': 'indexAction',
            'settings': 'settingsAction',
            'g/:group': 'groupAction',
            'g/:group/:post/edit': 'editPostAction',
            'g/:group/:post': 'viewPostAction'
        },

        initialize: function() {
            this.$outer = $('#outer-container');

            this.groups = new Inky.Collections.Group();
            this.groups.fetch();

            this.posts = new Inky.Collections.Post();
            this.posts.fetch();

            // Init sidebar
            this.sidebar = new Inky.Views.Sidebar({
                model: this.groups
            });
            this.sidebar.render();
            this.$outer.prepend(this.sidebar.$el);

            // Init left pane
            this.postsView = new Inky.Views.PostsPane({
                model: this.posts
            });
            this.postsView.render();
            this.$outer.find('.content-pane').append(this.postsView.$el);

            // Define author
            if('localStorage' in window && window['localStorage'] !== null) {
                this.author = localStorage.getItem("handle");
            }

            if(!this.author) {
                this.author = prompt('Please select your handle:');

                if('localStorage' in window && window['localStorage'] !== null) {
                    if(this.author) {
                        localStorage.setItem("handle", this.author);
                    } else {
                        this.author = 'Nameless';
                    }
                }
            }
        },

        indexAction: function() {
            // nothing for now
            this.navigate('/g/all', {trigger: true});
        },

        settingsAction: function() {
            if(this.contentView) {
                this.contentView.remove();
            }

            this.postsView.selectPost(null);

            var model = new Backbone.Model();
            model.set({
                groups: this.groups, 
                posts: this.posts
            });
            this.contentView = new Inky.Views.SettingsPane({
                model: model
            });
            this.contentView.render();

            this.$outer.find('.content-pane').append(this.contentView.$el);
        },

        groupAction: function(groupId) {
            //if(this.contentView) {
            //    this.contentView.remove();
            //}

            // Filter by group
            if(groupId == 'all') {
                this.groups.setSelected(null);
                this.postsView.showAll();
            } else {
                this.groups.setSelected(this.groups.get(groupId));
                this.postsView.filterByGroup(groupId);
            }
        },

        editPostAction: function(groupId, postId) {
            if(this.contentView) {
                this.contentView.remove();
            }

            if(postId == 'new') {
                var model = new Backbone.Model();
                model.set({
                    groups: this.groups, 
                    posts: this.posts,
                    post: null
                });

                this.postsView.selectPost(null);

                this.contentView = new Inky.Views.EditPostPane({
                    model: model
                });
                this.contentView.render();

                this.$outer.find('.content-pane').append(this.contentView.$el);
            } else {
                var post = this.posts.get(postId);

                if(!post) {
                    return this.navigate('/g/'+(this.groups.getSelected() !== null ? this.groups.getSelected().id : 'all'), {trigger: true});
                }

                var model = new Backbone.Model();
                model.set({
                    groups: this.groups, 
                    posts: this.posts,
                    post: post
                });

                this.postsView.selectPost(postId);

                this.contentView = new Inky.Views.EditPostPane({
                    model: model
                });
                this.contentView.render();

                this.$outer.find('.content-pane').append(this.contentView.$el);
            }
        },

        viewPostAction: function(groupId, postId) {
            if(this.contentView) {
                this.contentView.remove();
            }

            var post = this.posts.get(postId);

            if(!post) {
                return this.navigate('/g/'+(this.groups.getSelected() !== null ? this.groups.getSelected().id : 'all'), {trigger: true});
            }

            this.postsView.selectPost(post.id);

            var model = new Backbone.Model();
            model.set({
                groups: this.groups, 
                posts: this.posts,
                post: post
            });
            this.contentView = new Inky.Views.ViewPostPane({
                model: model
            });
            this.contentView.render();

            this.$outer.find('.content-pane').append(this.contentView.$el);
        }
    });

    $(document).ready(function() {
        window.app = new Inky.App();
        Backbone.history.start();
    });
})();