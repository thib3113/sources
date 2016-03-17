var time_between_refresh = 60000; //time between refresh, 60s

////////////////////////
// DO NOT EDIT BELOW  //
////////////////////////
fs = require("fs");
path = require("path");
cookieParser = require("cookie");
var http = require('http');
var async = require('async');
var request = require('request');
var gui = require('nw.gui');
var win = gui.Window.get();
var os = require('os');
var manifest = gui.App.manifest;
var opener = require('open');
var __dirname = process.cwd();
var allNotifications = [];

if(gui.App.argv.indexOf('debug') != -1){
    win.showDevTools();
}

var gui = require('nw.gui');
var indexDealabsTimeout = 0;

var internWebBrowser = null;

// var memwatch = require('memwatch-next');
// memwatch.on('leak', function(info) { 
//     console.log(info);
//     notify("memory leak detected !", info.reason);
// });

/**
 *
 * Author: Robert (CMoses) Kałamański
 *
 * DOM tree and JS object disintegrator.
 *
 * When DOM node is given then this function will break DOM tree into unreferenced nodes and remove all attributes.
 * If JS object is passed then it will be broken down into unreferenced elements. Also all DOM nodes referenced by
 * object will be destroyed.
 *
 */
function blackhole( object, path) {
    if(Object.is(object, process) || object === global)
        return;

    debugger;
    var child
      , type
      , attrs
      , keys
      , i;
    path = path || '';
    // Object must not be empty.
    if ( object ) {
        // DOM node.
        if ( object instanceof Node ) {
            // debugger;
            if ( object instanceof HTMLDocument ) {
                path = 'DOCUMENT';
            } else {
                path += '>' + object.nodeName;
            }
            // Remove attributes.
            attrs = object.attributes;
            if ( attrs ) {
                for ( i=attrs.length-1; i>=0; i-- ) {
                    // console.log('X DOM: ' + path + '[' + attrs[i].name + '=' + attrs[i].value + ']');
                    attrs[i] = null;
                }
            }

            // Remove childs.
            while ( (child = object.firstChild) ) {
                // console.log('X DOM: ' + path + '>' + child.nodeName);
                blackhole(child, path);
                child.remove();
            }
        }

        // JS object.
        else if ( typeof object === 'object' ) {

            // debugger;
            keys = Object.keys(object);
            for ( i=keys.length-1; i>=0; i-- ) {
                console.log('X OBJ: ' + path + '.' + keys[i]);
                // JS function.
                if ( typeof object[keys[i]] === 'function' ) {
                    object[keys[i]] = null;
                }
                // JS object.
                else if ( typeof object === 'object' ) {
                    blackhole(object[keys[i]], path + '.' + keys[i]);
                }
                object[keys[i]] = null;
            }
        }
    }
}

function Settings(){
    _settings = {
        _useInternWebBrowser : null,
        _internWebBrowserStyle : null
    }
    this.toJSON=function(){
        return {
            useInternWebBrowser:this.useInternWebBrowser,
            internWebBrowserStyle:this.internWebBrowserStyle
        }
    }
    Object.defineProperty(this, 'useInternWebBrowser', {
        get: function() {
            if(_settings._useInternWebBrowser == null)
                _settings._useInternWebBrowser = this.getSettings().useInternWebBrowser || false;
            return _settings._useInternWebBrowser;
        },
        set: function(value) {
            _settings._useInternWebBrowser = value;
            this.updateSettings(this);
        }
    });
    Object.defineProperty(this, 'internWebBrowserStyle', {
        get: function() {
            if(_settings._internWebBrowserStyle == null)
                _settings._internWebBrowserStyle = this.getSettings().internWebBrowserStyle || "default";
            return _settings._internWebBrowserStyle;
        },
        set: function(value) {
            _settings._internWebBrowserStyle = value;
            this.updateSettings(this);
        }
    });

    this.getSettings=function (){
        try{
            cSettings=JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')).toString());
        }
        catch(e){
            cSettings = {};
        }    
        return cSettings;
    };

    this.updateSettings=function(settings){
        curFile = fs.openSync(path.join(__dirname, 'config.json'), "w+");
        try{
            fs.writeSync(curFile, JSON.stringify(settings, null, 2));
        }
        catch(e){
            alert("One error appear when we will save setting file");
            console.log(e);
        }
        finally{
            fs.closeSync(curFile);
        }
    }
}

var settings = new Settings(); 

function openLink(link){
    if(!settings.useInternWebBrowser)
        opener(link);
    else{
        if(internWebBrowser == null){
            internWebBrowser = gui.Window.open(link, {
                position: 'center',
                width: screen.availWidth,
                height: screen.availHeight,
                show : false
            }, function(window){
                internWebBrowser = window;            
                internWebBrowser.on('close', function(){
                    this.close(true);
                    internWebBrowser=null;
                }.bind(internWebBrowser)); 
                internWebBrowser.on('loaded', function(e){
                    this.show();
                    if(this.window.location.hostname.match(/dealabs\.com$/) ){
                        if(this.window.document.getElementById('login_conteneur_right_connected') != null){
                            updateNotifications(this.window, this.window);
                        }
                    }

                    change_theme_menu_check=function(theme){
                        for (var i = 0; i < this.menu.items[0].submenu.items.length; i++) {
                            cItem = this.menu.items[0].submenu.items[i];
                            cItem.checked = false;
                            
                            if(cItem.label==theme){
                                cItem.checked = true;
                            }
                        };
                    }.bind(this);

                    change_theme=function(theme){
                        settings.internWebBrowserStyle = theme;

                        if(theme == "default"){
                            this.window.$('[data-intern-web-browser="style"]').remove();
                        }
                        else{
                            try{
                                var head = this.window.document.head
                                  , style = this.window.document.createElement('style')

                                style.type = 'text/css';
                                style.innerHTML = fs.readFileSync(path.join(__dirname, "themes", theme+'.css')).toString();
                                style.dataset.internWebBrowser="style";
                                head.appendChild(style);

                                if(this.window.location.pathname.match(/^\/forum/) && files.indexOf(theme+"-forum.css") >= 0){
                                    forumStyle = this.window.document.createElement('style');
                                    forumStyle.type = 'text/css';
                                    forumStyle.innerHTML = fs.readFileSync(path.join(__dirname, "themes", theme+'-forum.css')).toString();
                                    forumStyle.dataset.internWebBrowser="style";
                                    head.appendChild(forumStyle);
                                }
                            }
                            catch(e){
                                console.error(e);
                            }
                        }
                    }.bind(this);

                    //load setting theme
                    change_theme(settings.internWebBrowserStyle);

                    //add theme options
                    try{
                        files = fs.readdirSync(path.join(__dirname, "themes"));
                        themes = [];
                        for(var i = 0; i < files.length; i++) {
                            if(themeName = files[i].match(/^([^-]*).css/))
                                themes.push(themeName[1]);
                        };

                        if(themes.length>0){
                            submenu = new gui.Menu();
                            //add default style
                            themes.splice(0, 0, "default");
                            for(var i = 0; i < themes.length; i++) {
                                submenu.append(
                                    new gui.MenuItem({
                                        type:'checkbox',
                                        label: themes[i],
                                        checked:settings.internWebBrowserStyle==themes[i],
                                        click:function(){
                                            this.fn(this.theme);
                                        }.bind({fn:function(theme){change_theme_menu_check(theme);change_theme(theme);}, theme:themes[i]})
                                    })
                                );
                            };
                            var menu = new gui.Menu({type: 'menubar'});
                            theme_menu = new gui.MenuItem({ label: 'Themes', submenu:submenu});
                            menu.append(theme_menu);
                            this.menu=menu;
                        }
                    }
                    catch(e){
                        console.error(e);
                    }
                }.bind(internWebBrowser))
            });
        }
        else{
            internWebBrowser.window.location.href = link;
        }
    }
}

// Create a tray icon
var tray = new gui.Tray({ title: 'Dealabs-notifier', tooltip: manifest.name , icon: 'img/icon.png' });
tray.on('click', function(){
    openLink('http://dealabs.com');
})

// Create a Menu
var menu = new gui.Menu();

var notificationItem = new gui.MenuItem({ type: 'normal', label: 'Aucune notification', enabled : false, click : function(){openLink('http://www.dealabs.com/notifications.html')} });
menu.append(notificationItem);

var alerteItem = new gui.MenuItem({ type: 'normal', label: 'Aucune alerte', enabled : false });
menu.append(alerteItem);

var MPItem = new gui.MenuItem({ type: 'normal', label: 'Aucun MP', enabled : false });
menu.append(MPItem);

var forumItem = new gui.MenuItem({ type: 'normal', label: 'Aucun nouveau message', enabled : false });
menu.append(forumItem);

menu.append(new gui.MenuItem({ type: 'separator'}));
var useInternWebBrowser = new gui.MenuItem({ type: 'checkbox', label: 'Use intern browser', checked:!!settings.useInternWebBrowser ,click : function(){settings.useInternWebBrowser = !settings.useInternWebBrowser}.bind(this) });
menu.append(useInternWebBrowser);

var exitItem = new gui.MenuItem({ type: 'normal', label: 'Exit', click : function(){win.close();}.bind(this) });
menu.append(exitItem);
var copyrightItem = new gui.MenuItem({ type: 'normal', label: 'Par thib3113', enabled: false });
menu.append(copyrightItem);

var copyright2Item = new gui.MenuItem({ type: 'normal', label: 'non affilié à Dealabs', enabled: false });
menu.append(copyright2Item);
tray.menu = menu;

var fetcherWindows = null;

function destruct(){
    if(tray != null){
        // Remove the tray
        tray.remove();
        tray = null;
    }
    if(fetcherWindows != null){
        fetcherWindows.close();
    }
    if(internWebBrowser != null){
        internWebBrowser.close();
    }
}

window.onbeforeunload=function(){
    destruct();
}
win.on('close', function() {
    debugger;
    console.log("close");
    win.hide();
    destruct();
    win.close(true);
});


function notify(title, text, icon, url){
    var options = {
        icon: icon,
        body: text
     };

    var notification = new Notification(title, options);

    if(typeof url != "undefined"){
        notification.onclick = function () {
            openLink(this.url);
        }.bind({url:url})
        
    }
}

gui.Window.open('http://www.dealabs.com/forum/notifications.html', {
  position: 'center',
  width: screen.availWidth,
  height: screen.availHeight,
  show : false
}, function(cWindows){
    fetcherWindows = cWindows;
    cWindows.cb = function(){
        cWindows.hide();
        updateNotifications(cWindows.window.$, cWindows.window);
    }
    cWindows.on('loaded', function(){
        cWindows.window.blackhole = blackhole;
        if(cWindows.window.localStorage.getItem("knows_mobile_apps_exist") != true)
            cWindows.window.localStorage.setItem("knows_mobile_apps_exist", true);
            
        var _self = cWindows;
        if(cWindows.window.location.hostname.match(/dealabs\.com$/) ){
            cWindows.cookies.getAll({}, function(cookies){
                authentified = false;
                for( name in cookies){
                    if(cookies[name].name == "dealabs_token" && cookies[name].value != ""){
                        authentified = true;
                        break;
                    }
                }
                if(authentified){
                    _self.cb(cookies);
                }
                else{
                    _self.show();
                    _self.window.switch_display('#popup_center_login', '', 'show');
                }
            });
        }
    })
});

var lastForumMenuItem = null;

function updateNotifications(jQuery, current_window){
    if(typeof jQuery == "undefined")
        throw new Error("you need to pass jQuery");

    nb_notif = parseInt(jQuery('.notif').text());
    try{
        nb_alertes = parseInt(jQuery("#alertes").text().match(/\(([0-9]*)\)/)[1]);
    }
    catch(e){
        nb_alertes = 0;
    }
    nb_notif_commentaires = nb_notif - nb_alertes;

    new_allNotifications = [];
    async.series({
        notifications: function(cb){
            //on récup les notifs 
            current_notifs = [];
            $notif_container = jQuery("#commentaires_part .item a.left_part_list");
            for (var i = $notif_container.length - 1; i >= 0; i--) {
                current_notifs.push({
                    text : jQuery($notif_container[i]).find('.text_color_blue').text(),
                    url  : jQuery($notif_container[i]).get(0).href,
                    icon : jQuery($notif_container[i]).find('img').get(0).src
                });
            };

            async.map(current_notifs, function(item, cb){
                var imagePath = path.join(os.tmpdir(), path.join(manifest.name+'-'+path.basename(item.icon)));
                fs.access(imagePath, fs.F_OK, function(err) {
                    if (!err) {
                            item.icon = imagePath;
                            cb(null, item);                        
                    } else {
                        var r = request(item.icon);
                        r.cb = cb;
                        r.item = item;
                        r.on('response',  function (res) {
                           res.pipe(fs.createWriteStream(imagePath, {flag:"w+"})); 
                        });
                        r.on('end', function(){
                            this.item.icon = imagePath;
                            this.cb(null, this.item);
                        })
                    }
                }.bind({imagePath:imagePath}));
            }, 
            function(err, result){
                menuItem = new gui.MenuItem({ type: 'normal',
                    label: (this.nb_notif_commentaires == 0? "Aucune" : this.nb_notif_commentaires)+' notification'+(this.nb_notif_commentaires>1?"s":""),
                    click : function(){
                        openLink('http://www.dealabs.com/notifications.html');
                    }
                });
                if(result.length>0){
                    submenu = new gui.Menu();
                    //on regarde si elles sont déjà affichés
                    for (var i = result.length - 1; i >= 0; i--) {
                        if(allNotifications.indexOf(result[i].url) == '-1'){
                            notify("Vous avez une nouvelle notification", result[i].text, result[i].icon, result[i].url);
                        }
                        new_allNotifications.push(result[i].url);

                        submenu.append(new gui.MenuItem({ label: result[i].text, click: function(){openLink(this.url);}.bind({url:result[i].url}) }));
                    };
                    menuItem.submenu = submenu;
                }
                cb(null, menuItem);
            }.bind({nb_notif_commentaires:this.nb_notif_commentaires}));
        }.bind({nb_notif_commentaires:nb_notif_commentaires}),
        alertes: function(cb){
            //on récup les alertes 
            current_alertes = [];
            $alert_container = jQuery("#alertes_part .item a.left_part_list");
            for (var i = $alert_container.length - 1; i >= 0; i--) {
                current_alertes.push({
                    text : jQuery($alert_container[i]).find('.text_color_blue').text(),
                    url  : jQuery($alert_container[i]).get(0).href,
                    icon : jQuery($alert_container[i]).find('img').get(0).src
                });
            };

            async.map(current_alertes, function(item, cb){
                var imagePath = path.join(os.tmpdir(), path.join(manifest.name+'-'+path.basename(item.icon)));
                fs.access(imagePath, fs.F_OK, function(err) {
                    if (!err) {
                            item.icon = imagePath;
                            cb(null, item);                        
                    } else {
                        var r = request(item.icon);
                        r.cb = cb;
                        r.item = item;
                        r.on('response',  function (res) {
                           res.pipe(fs.createWriteStream(imagePath, {flag:"w+"})); 
                        });
                        r.on('end', function(){
                            this.item.icon = imagePath;
                            this.cb(null, this.item);
                        })
                    }
                }.bind({imagePath:imagePath}));
            }, 
            function(err, result){
                menuItem = new gui.MenuItem({
                    type: 'normal',
                    label: (this.nb_alertes == 0? "Aucune" : this.nb_alertes)+' alerte'+(this.nb_alertes>1?"s":""),
                    click : function(){
                        openLink('http://www.dealabs.com/alerts/alerts.html')
                    }
                });

                if(result.length>0){
                    submenu = new gui.Menu();
                    //on regarde si elles sont déjà affichés
                    for (var i = result.length - 1; i >= 0; i--) {
                        if(allNotifications.indexOf(result[i].url) == '-1'){
                            notify("Vous avez une nouvelle alerte", result[i].text, result[i].icon, result[i].url);
                        }
                        new_allNotifications.push(result[i].url);

                        submenu.append(new gui.MenuItem({ label: result[i].text, click: function(){openLink(this.url);}.bind({url:result[i].url}) }));
                    };
                    menuItem.submenu = submenu;
                }
                cb(null, menuItem);
            }.bind({nb_alertes:this.nb_alertes}));
        }.bind({nb_alertes:nb_alertes}),
        mp: function(cb){
            $mpContainer = jQuery('.mp').first();
            nb_mp = parseInt($mpContainer.text());
            menuItem = new gui.MenuItem({
                type: 'normal',
                label: (nb_mp == 0? "Aucun" : nb_mp)+' MP'+(nb_mp>1?"s":""),
                click : function(){
                    openLink($mpContainer.attr('src'))
                }
            });
            cb(null, menuItem);
        },
        forum: function(cb){
            menuItem = new gui.MenuItem({
                type: 'normal',
                label: "Aucun nouveau message",
                click : function(){
                    openLink("http://www.dealabs.com/forum/notifications.html")
                }
            });

            if(this.location.pathname == "/forum/notifications.html"){
                $forumNotifContainer = jQuery('#body');
                $forumNotifs = $forumNotifContainer.find('.title_thread_contener');
                nb_notifs=$forumNotifs.length;
                menuItem.label = (nb_notifs == 0? "Aucun" : nb_notifs)+' nouveau'+(nb_notifs>1?'x':'')+' message'+(nb_notifs>1?"s":""); 
                if(nb_notifs>0){
                    
                    //start by download images
                    async.map($forumNotifs.find('.img_bloc img'), function(item, cb){
                        var imagePath = path.join(os.tmpdir(), path.join(manifest.name+'-'+path.basename(item.src)));
                        fs.access(imagePath, fs.F_OK, function(err) {
                            if (!err) {
                                cb(null, item);                        
                            }
                            else {
                                var r = request(item.src);
                                r.cb = cb;
                                r.item = item;
                                r.on('response',  function (res) {
                                   res.pipe(fs.createWriteStream(imagePath, {flag:"w+"})); 
                                });
                                r.on('end', function(){
                                    this.cb(null, this.item);
                                })
                            }
                        });
                    }, 
                    function(err, result){
                        submenu = new gui.Menu();
                        //on regarde si elles sont déjà affichés
                        for (var i = $forumNotifs.length - 1; i >= 0; i--) {
                            $notif = this.window.$($forumNotifs[i]);
                            notif = {
                                url : $notif.find('.auteur_pagination_div a:last').attr('href'),
                                icon : path.join(os.tmpdir(), path.join(manifest.name+'-'+path.basename($notif.find('.img_bloc img').attr('src')))),
                                text : $notif.find('.title').text().trim()+" par "+$notif.find('.info_bloc a').text().trim()
                            }
                            if(allNotifications.indexOf(notif.url) == '-1'){
                                notify("Nouveau message sur le forum", notif.text, notif.icon, notif.url);
                            }
                            new_allNotifications.push(notif.url);

                            submenu.append(new gui.MenuItem({ label: notif.text, click: function(){openLink(this.url);}.bind({url:notif.url}) }));
                        };
                        menuItem.submenu = submenu;
                        this.cb(null, menuItem);
                    }.bind({window:this,cb:cb}));
                }
            }
            else{
                if(lastForumMenuItem != null){
                    menuItem = lastForumMenuItem;
                }
                cb(null, menuItem);
            }
        }.bind(current_window)
    }, function(err, menuItem){
        //update current notifications
        allNotifications = new_allNotifications;

        var menu = new gui.Menu();
        menu.append(menuItem.notifications);
        menu.append(menuItem.alertes);
        menu.append(menuItem.mp);
        menu.append(menuItem.forum);

        menu.append(new gui.MenuItem({ type: 'separator'}));
        menu.append(useInternWebBrowser);
        menu.append(exitItem);
        menu.append(copyrightItem);
        menu.append(copyright2Item);

        // update tray ?
        need_update = false;
        //si c'est la première fois que l'on le lance
        try{
            if(tray.menu.items[0].enabled === false)
                need_update = true;
        }
        catch(e){
        }

        for (var i = 0; i < menu.items.length; i++) {
            tmpLength = [];
            if(typeof tray.menu.items[i].submenu != "undefined" && typeof tray.menu.items[i].submenu.items != "undefined") 
                tmpLength.push(tray.menu.items[i].submenu.items.length);
            if(typeof menu.items[i].submenu != "undefined" && typeof menu.items[i].submenu.items != "undefined") 
                tmpLength.push(menu.items[i].submenu.items.length);

            length = tmpLength.sort().reverse()[0];
            for (var j = 0; j < length; j++) {
                try{
                    if(tray.menu.items[i].submenu.items[j].url == menu.items[i].submenu.items[j].url)
                        continue;
                    else{
                        need_update = true;
                        break;    
                    }
                }
                catch(e){
                    need_update = true;
                    break;
                }
            };
        };
        if(need_update)
            tray.menu = menu;

        if(indexDealabsTimeout != null){
            clearTimeout(indexDealabsTimeout);
        }
        
        indexDealabsTimeout = setTimeout(function(){
            global.gc();
            this.reload();
            // if(fetcherWindows != null){
            //     // blackhole(fetcherWindows.window.document,null,  fetcherWindows.window);
            //     fetcherWindows.reload();
            // }
        }.bind(fetcherWindows), time_between_refresh);
    })
}


