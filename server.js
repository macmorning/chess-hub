//////////////////////////////////////////////////
//                                              //
//      Main server for Chess Hub               //
//  http://www.github.com/macmorning/chess-hub  //
//                                              //
//////////////////////////////////////////////////
/*
 * Copyright (c) 2013 Sylvain YVON
 * 
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:

 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE. 
 */


var PORT = process.env.PORT || 8080;
var ADDRESS = process.env.IP;
var SERVERDIR = "";
if (process.env.C9_PID) {       // for running the server on c9.io
    SERVERDIR = process.env.HOME + '/' + process.env.C9_PID + "/";
}
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    util = require('util');
var Channel = require('./channel.js');


var users = {};         // init the users objects array
var channels = [];      // init the channels array
var configFile = SERVERDIR + 'config.json';
var lastConfigMTime = 0;
var LASTANNOUNCEMENT = '';
var LASTFRONTPAGEANNOUNCEMENT = '';

// default configuration values
var MAXCLIENTS_2    = 70;          // absolute maximum number of clients; any request will be dropped once this number is reached
var MAXCLIENTS_1    = 50;          // maximum number of clients before refusing new connections
var MAXGAMES        = 20;          // maximum number of games
var MAXMESSAGES     = 20;          // maximum number of messages sent at once for the MAIN channel only

var LOGCONFIG       = true;        // enable or disable config logs
var LOGSTATIC       = false;       // enable or disable static files serving logs
var LOGCONNECT      = false;       // enable or disable connections logs
var LOGMESSAGING    = false;       // enable or disable messaging logs
var LOGPOLLING      = false;       // enable or disable polling logs
var LOGCHANNEL      = false;       // enable or disable channel activity logs
var LOGSEARCHING    = false;       // enable or disable game searches logs
var LOGSTATS        = false;       // enable or disable game stats logs
var LOGHOUSEKEEPING = false;       // enable or disable house keeping logs
var HKINTERVAL      = 10000;       // housekeeper interval

function escapeHtml(unsafe) {
    if(unsafe && isNaN(unsafe)) {// escapes Html characters
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    } else if (!isNaN(unsafe)) {
        return unsafe;
    }
    return false;
}

function s4() {
  // generate random string to use as user key
  // thank you Stack Overflow :)
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function guid() {
    return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

function checkUserKey(user,key) {
    if (!user || !key || (users[user] && users[user].key !== key)) {
        return false; 
    } else if (user && !users[user]) {  // reconnecting user
        users[user] = {};
        users[user].key = key;
        users[user].lastActivity = new Date();        
        return true; 
    } else {
        return true; 
    }
}

function currTime() {
    // write current time in HH:mm format
    var currentDate = new Date();
    var hours = currentDate.getHours();
    if (hours < 10) { hours = "0" + hours; }
    var minutes = currentDate.getMinutes();
    if (minutes < 10) { minutes = "0" + minutes; }
    return(hours + ":" + minutes);
}

function resBadRequest(res,err,data) {
    res.writeHead(400, { 'Content-type': 'text/txt'});
    res.end('Bad request');
    console.log(currTime() + ' [BADREQ] ... error : ' + err);
    console.log(data);
    return true;
}
function resNotFound(res,err,data) {
    res.writeHead(404, { 'Content-type': 'text/txt'});
    res.end('Not found');
    console.log(currTime() + ' [NOTFOU] ... error : ' + err);
    console.log(data);
    return true;
}
function resInternalError(res,err,data) {
    res.writeHead(500, { 'Content-type': 'text/txt'});
    res.end('Internal server error');
    console.log(currTime() + ' [INTERN] ... error : ' + err);
    console.log(data);
    return true;
}
function resUnauthorized(res,err,data) {
    res.writeHead(401, { 'Content-type': 'text/txt'});
    res.end('Unauthorized');
    console.log(currTime() + ' [UNAUTH] ... error : ' + err);
    console.log(data);
    return true;
}
function sendMessage(from, msg, category, to, doNotAddToHistory ) {
    // adds a message to the messages array and send it to polling clients
    // sendMessage(from, msg, [category, [to]])
    // from : user issuing the message
    // msg : message
    // category : message category : 
    //        - chat_msg (by default), simple message sent to a chat channel or a user
    //        - chat_sys, system message
    //        - chat_activity, chat channel activity : join, leave, quit
    //        - game, game channel activity : sit-[w|b] ; move-piece-square ; leave
    // to : target for the message : a user, a game channel id, or main channel (by default)
    // doNotAddToHistory : do not add the message to the history; used by announcements for example
    if (!channels[to]) {
        if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... channel ' + to + ' does not exist.');}
        return false;
    }
    var message = [];
    if (!category) { category = "chat_msg"; }
    message = {time: currTime(), user: from, msg: msg, category: category, to: to };
    if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... sendMessage : ' + message.msg);}
    if(!doNotAddToHistory) { channels[to].messages.push(message); }
    var json = JSON.stringify( { 
            counter: channels[to].messages.length,
            newMsg: true, 
            append: message, 
            whiteTimer : channels[to].whiteTimer, 
            blackTimer : channels[to].blackTimer 
        });
    var i = 0;
    for(var user in channels[to].users) {
        try { channels[to].users[user].client.end(json); }
        catch(err) {}
        delete channels[to].users[user].client;
        i++;
    }
    if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... sent message to ' + i + ' client(s)');}
    return true;
}

function loadConfig() {
    if(LOGCONFIG) { console.log(currTime() + ' [CONFIG] loading config file : ' + configFile);}
    fs.stat(configFile, function (err, stat) {
        if(err) {
            console.log(currTime() + ' [CONFIG] ... ' + err);
            return false;
        } else if (lastConfigMTime === Date.parse(stat.mtime)) {
            return true;
        } else {
            fs.readFile(configFile, function(err, data) {
                if(err) {
                    console.log(currTime() + ' [CONFIG] ... ' + err);
                    return false;
                } else {
                    var latestAnnouncement = '';
                    try { 
                        var json = JSON.parse(data); 
                        if(LOGCONFIG) { 
                            console.log(currTime() + ' [CONFIG] ... loading config: ');
                            console.log(json);
                        }
                        MAXCLIENTS_2    = json.MAXCLIENTS_2     || MAXCLIENTS_2;
                        MAXCLIENTS_1    = json.MAXCLIENTS_1     || MAXCLIENTS_1;
                        MAXGAMES        = json.MAXGAMES         || MAXGAMES;
                        MAXMESSAGES     = json.MAXMESSAGES      || MAXMESSAGES;

                        LOGCONFIG       = (json.LOGCONFIG > -1 ?        json.LOGCONFIG      : LOGCONFIG);
                        LOGSTATIC       = (json.LOGSTATIC > -1 ?        json.LOGSTATIC      : LOGSTATIC);
                        LOGCONNECT      = (json.LOGCONNECT > -1 ?       json.LOGCONNECT     : LOGCONNECT);
                        LOGMESSAGING    = (json.LOGMESSAGING > -1 ?     json.LOGMESSAGING   : LOGMESSAGING);
                        LOGPOLLING      = (json.LOGPOLLING > -1 ?       json.LOGPOLLING     : LOGPOLLING);
                        LOGCHANNEL      = (json.LOGCHANNEL > -1 ?       json.LOGCHANNEL     : LOGCHANNEL);
                        LOGSEARCHING    = (json.LOGSEARCHING > -1 ?     json.LOGSEARCHING   : LOGSEARCHING);
                        LOGSTATS        = (json.LOGSTATS > -1 ?         json.LOGSTATS       : LOGSTATS);
                        LOGHOUSEKEEPING = (json.LOGHOUSEKEEPING > -1 ?  json.LOGHOUSEKEEPING: LOGHOUSEKEEPING);
                        
                        HKINTERVAL      = json.HKINTERVAL       || HKINTERVAL;
                        
                        LASTFRONTPAGEANNOUNCEMENT = json.FRONTPAGEANNOUNCE  || LASTFRONTPAGEANNOUNCEMENT;
                        
                        latestAnnouncement = json.ANNOUNCE || '';
                        if (latestAnnouncement && latestAnnouncement !== LASTANNOUNCEMENT) {
                            LASTANNOUNCEMENT = latestAnnouncement;
                            sendMessage('SYSTEM', LASTANNOUNCEMENT, 'chat_sys', 'MAIN', true );
                        }
                        return true;
                    }
                    catch(err) {
                        console.log(currTime() + ' [CONFIG] ... ' + err);
                        return false;
                    }
                }                
            });
        }
    });
}


function joinGame(user,gameId) {
    try { 
        if (!channels[gameId].addUser(user)) {
            return false;
        }
        sendMessage(user,'join','game',gameId);    // send the information to users in that channel
        return true;
    }
    catch(err) { 
        console.log(currTime() + ' [JOIN ] Cannot join game ' + gameId);
        console.log(err);        
        return false; 
    }
}

function createGame(user, open, level, acceptLower, acceptHigher, timer) {
    // creates a new game channel; returns its id as a string
    if(Object.keys(channels).length >= MAXGAMES) {      // there are too many games, do not create a new one
        console.log(currTime() + ' [LIMIT ] Cannot create a new game, MAXGAMES reached !(' + MAXGAMES + ')');
        return false;
    } else {
        // create the new game channel and push it
        var gameId = guid();
            channels[gameId] = new Channel(user + "'s table",gameId,timer);
            channels[gameId].gameTimer = (timer >= 0 ? timer : 0);  // if user has set his pref to indifferent (-1), then don't set a timer
            channels[gameId].gameLevel = level;
            channels[gameId].playerA = user;
            channels[gameId].gameAcceptHigher = acceptHigher;
            channels[gameId].gameAcceptLower = acceptLower;
            channels[gameId].addUser(user);
            channels[gameId].switchOpen(open);
        return gameId;
    }
}

function disconnect(user,reason) {
    delete users[user];    // remove the user from the users array
    if(!reason) { reason = 'quit'; }
    for (var i in channels) {               // remove the user from any game he's in
        if(channels[i].users[user]) {
            if(channels[i].removeUser(user)) {    // remove the user from the users array
                sendMessage(user,'leave-'+reason,'game',i);    // send the information to users in that channel
            }
        }
    } 
}

function leave(user,game,reason) {
    if(!reason) { reason = 'left game'; }
    try {
        if(channels[game].removeUser(user)) {
            sendMessage(user,'leave-'+reason,'game',game);    // send the information to users in that channel
        }
    } catch(err) { console.log(err); } 
}

function leaveGame(gameId,user) {
}

function houseKeeper() {
    loadConfig();
    // disconnects inactive users and destroys empty channels
    if(LOGHOUSEKEEPING) { console.log(currTime() + ' [HOUSEK] running');}
    var limitTime = new Date() - 120000;   // drop users if their last activity is more than 2 minutes old
    for (var user in users) {
        if (users[user].lastActivity < limitTime) {
            console.log(currTime() + ' [HOUSEK] ... disconnect ' + user);
            if(LOGHOUSEKEEPING) { console.log(currTime() + ' [HOUSEK] ... last activity = ' + users[user].lastActivity);}
            if(LOGHOUSEKEEPING) { console.log(currTime() + ' [HOUSEK] ... limit time = ' + limitTime);}
            disconnect(user,'timeout');
        }
    }
    for (var game in channels) {
        if (channels[game].id !== 'MAIN' && !channels[game].playerA && !channels[game].whitePlayer && !channels[game].blackPlayer) {
            console.log(currTime() + ' [HOUSEK] ... delete game without players ' + game);
            sendMessage('SYSTEM','This game has been closed.', 'chat_sys', game);
            delete channels[game];
        }
    }
}

function checkCommand(channel,user,msg) {
    // this function verifies the validity of the game commands sent by the clients.
    // returns true if ok, false if ko
    var command = msg.split('-');
    if(command[0] === "move") {
        if (command[1]) {
            return true;
        }
    } else if (command[0] === "sit") {
        if (command[1] === 'w' || command[1] === 'b' ) {
            return true;
        }
    } else if (command[0] === "leave") {
        return true;
    }
    return false;
}

function commitGameCommand(channel,user,msg) {
    // this function commits the game commands and pushes the changes to the game channel
    var command = msg.split('-');
    if(command[0] === "move") {
        return channels[channel].endTurn(user,command[1][0]);   // we need both the user and the color of the moved piece
    } else if (command[0] === "sit") {
        if (command[1] === 'w' || command[1] === 'b' ) {
            try { return channels[channel].sitUser(user,command[1]); }
            catch(err) { 
                console.log(err); 
                return false; 
            }
        }
    } else if (command[0] === "leave") {
        return channels[channel].removeUser(user);
    }
    return false;
}



// create the main chat channel
channels['MAIN'] = new Channel('Main','MAIN');
channels['MAIN'].switchOpen(true);                  // mark the main chat channel as open for all



loadConfig();
// start the housekeeping interval, every 10s
setInterval(function() {
        houseKeeper();
    }, HKINTERVAL);




//////////////////////////////////////////////////////////////////////////////////////////
//
//                              Create http server
//
//////////////////////////////////////////////////////////////////////////////////////////

http.createServer(function (req, res) {

    if(Object.keys(users).length > MAXCLIENTS_2) {
          resInternalError(res,'Cannot accept request, MAXCLIENT_2 reached !(' + MAXCLIENTS_2 + ')','');
    }

//
// ROUTING
//
   var url_parts = url.parse(req.url);
   //console.log(url_parts);

//
// CONNECTION SERVICE
//
    if(url_parts.pathname.substr(0, 8) === '/connect') {
        if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] connect');}
        if(Object.keys(users).length > MAXCLIENTS_1) {
                console.log(currTime() + ' [LIMIT ] Cannot accept connection, MAXCLIENT_1 reached !(' + MAXCLIENTS_1 + ')');
                res.writeHead(200, { 'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                    returncode: 'ko',
                    returnmessage: 'Sorry, there are too many users right now. Please try again in a few minutes.',
                    user: '',
                    key: ''
                }));
        }
        var user = "";
        var key = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};
            try { json = JSON.parse(data); }
            catch(err) { console.log(err); console.log(data); var json= {};}
            user = escapeHtml(json.user);
            key = escapeHtml(json.key);
            
            if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] ... connect ' + user); }

            if (!user) {
                resBadRequest(res,'no username provided',data);
            } else if(!users[user]) {
                users[user] = {};
                users[user].key = guid();
                users[user].lastActivity = new Date();
                sendMessage(user,'join','game','MAIN');    // send the information to users in that channel
                channels['MAIN'].addUser(user);
                console.log(currTime() + ' [CONNEC] user: ' + user + ' connected, client: ' + json.clientLib + ', version: ' + json.clientVersion + ', user-agent: ' + req.headers['user-agent']);

                res.writeHead(200, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                    returncode: 'ok',
                    returnmessage: LASTANNOUNCEMENT,
                    user: user,
                    key: users[user].key
                }));
            } else if(users[user] && checkUserKey(user,key)){
                if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] ... ' + user + ' is already connected with this key, accepting connection'); }
                res.end(JSON.stringify( {
                    returncode: 'ok',
                    returnmessage: LASTANNOUNCEMENT,
                    user: user,
                    key: users[user].key
                }));
            } else if(users[user] && !checkUserKey(user,key)){
                if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] ... ' + user + ' is already reserved'); }
                res.writeHead(200, { 'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                    returncode: 'ko',
                    returnmessage: 'Sorry, ' + user + ' is already used. Please pick another name.',
                    user: user,
                    keyid: ''
                }));
            } 
            if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] ... current users : ' + Object.keys(users).length); }
        });
    } 

//
// DISCONNECTION SERVICE
//
    else if(url_parts.pathname.substr(0, 11) === '/disconnect') {
        if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] disconnect'); }
        var user = "";
        var key = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};
            try { json = JSON.parse(data); }
            catch(err) { console.log(err); console.log(data); var json= {};}
            user = escapeHtml(json.user);
            key = escapeHtml(json.key);
            if (!checkUserKey(user, key)) {
                resUnauthorized(res,'The provided key for user ' + user + '  does not match the registered one for the user','provided key for user ' + user + '  = ' + key);
                return false;
            }
            if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] ... disconnect user ' + user); }
            res.writeHead(200, { 'Content-Type': 'application/json'});
            res.end(JSON.stringify([]));    // first, release the client
            disconnect(user);               // then, handle the disconnection
        });
    }

    
//
// POLLING SERVICE
//
    else if(url_parts.pathname.substr(0, 5) === '/poll') {
        // polling
        var data="";
        var channel="";
        var user = "";
        var key = "";
        var counter = 0;
        if(LOGPOLLING) { console.log(currTime() + ' [POLLIN] polling'); }
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};
            try { json = JSON.parse(data); }
            catch(err) { console.log(err); console.log(data); var json= {};}
            channel = escapeHtml(json.channel);
            user = escapeHtml(json.user);
            key = escapeHtml(json.key);
            counter = json.counter;
            if (!checkUserKey(user, key)) {
                resUnauthorized(res,'The provided key for user ' + user + '  does not match the registered one for the user','provided key for user ' + user + '  = ' + key);
                return false;
            }
            if (isNaN(counter) || !channel || !channels[channel])  {   // no counter provided or no channel id, send Bad Request HTTP code
                resBadRequest(res,'bad counter or unknown channel',data);
                return false;
            }
            if(LOGPOLLING) { console.log(currTime() + ' [POLLIN] ... counter = ' + counter + ' from user = ' + user + ' for channel = ' + channel); }
            users[user].lastActivity = new Date();       // update user's last polling request
            if (!channels[channel].users[user]) {        // user is polling this channel for the first time
                if (!joinGame(user,channel)) {         // add him to the users list
                    resInternalError(res, 'error joing game ' + channel, data);
                }
            }
            channels[channel].users[user].lastActivity = new Date();       // update user's last polling request

            var n = 0;
            try { n = channels[channel].messages.length - counter; }        // try to get the messages list for the channel
            catch(err) {                                        // the channel doesn't exit
                resInternalError(res,'This channel doesnt exist or has been destroyed',data);
                return false;
            }
                        
            if(n > 0) {
                var lastMessages = {};
                if ( n <= MAXMESSAGES || channel !== 'MAIN') {       // do not limit the max number of messages for a game channel
                    lastMessages = channels[channel].messages.slice(counter);
                } else if ( n > MAXMESSAGES && channel === 'MAIN' ) {       // if there are too many messages to send
                    lastMessages = channels[channel].messages.slice(channels[channel].messages.length - MAXMESSAGES);
                }
                if(LOGPOLLING) { console.log(currTime() + ' [POLLIN] ... sending ' + lastMessages.length + ' new message(s)'); }
                res.writeHead(200, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                    counter: channels[channel].messages.length,
                    newMsg: false, 
                    append: lastMessages
                }));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                channels[channel].users[user].client = res;  // if there is no message to push, keep the client in the clients array (long polling)
            }
        });
    } 

//
// SEARCH GAME SERVICE
//
    else if(url_parts.pathname.substr(0, 11) === '/searchGame') {
        var user="";
        var key="";
        var playerLevel=0;
        var playerAcceptLower=0;
        var playerAcceptHigher=0;
        var playerTimerPref=0;
        var createFlag=false;
        var data="";
        if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] search a game'); }
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};
            try { json = JSON.parse(data); }
            catch(err) { console.log(err); console.log(data); var json= {};}
            try {
                user = escapeHtml(json.user);
                key = escapeHtml(json.key);
                playerLevel = parseInt(json.playerLevel,10);
                playerAcceptLower = parseInt(json.playerAcceptLower,10);
                playerAcceptHigher = parseInt(json.playerAcceptHigher,10);
                playerTimerPref = parseInt(json.playerTimerPref,10);
                createFlag = json.createFlag;
            } catch(err) {
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... error, incorrect format, dumping data below');}
                if(LOGSEARCHING) { console.log(json); }
                resBadRequest(res);
                return false;
            }
            if (isNaN(playerTimerPref)) { playerTimerPref = -1; }
            if (!user || isNaN(playerLevel))  {   // no username, no level => send Bad Request HTTP code
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... error, dumping data below'); }
                if(LOGSEARCHING) { console.log(json); }
                resBadRequest(res);
                return 1;
            }
            if (!checkUserKey(user, key)) {
                resUnauthorized(res,'The provided key for user ' + user + '  does not match the registered one for the user','provided key for user ' + user + '  = ' + key);
                return false;
            }
            if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... for player = ' + user + ', level = ' + playerLevel, ' timer = ' + playerTimerPref +  ' allow higher/lower = ' + playerAcceptHigher + '/' + playerAcceptLower);}
            
            // searching for an existing game
            if(!createFlag) {
                var count = 0;  // count the number of channels
                for (var i in channels) {
                    count++;
                    var channel = channels[i];
                    if(channel.open         // the channel is open
                            && channel.playerA && !channel.playerB && channel.playerA !== user     // this is a game channel with only a player A, who is not the user who searches for a game
                            && ((playerAcceptLower === 1 && channel.gameAcceptHigher === 1 && channel.gameLevel < playerLevel) || channel.gameLevel === playerLevel)      // this game allows lower level players to join, or is wihtin accepted range
                            && ((playerAcceptHigher === 1 && channel.gameAcceptLower === 1 && channel.gameLevel > playerLevel) || channel.gameLevel === playerLevel)      // this game allows higher level players to join, or is wihtin accepted range
                            && (playerTimerPref === -1 || playerTimerPref === channel.gameTimer)  // player has not set a timer pref (-1) or the game matches his search
                            ) {
                        if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... found a game ! name = ' + channel.name + ', playerA = ' + channel.playerA + ', level = ' + channel.gameLevel);}

                        var tmpChannel = {name: channel.name, 
                                                        open: channel.open, 
                                                        id: channel.id, 
                                                        messages: channel.messages, 
                                                        playerA: channel.playerA, 
                                                        playerB: channel.playerB,
                                                        whitePlayer: channel.whitePlayer,
                                                        blackPlayer: channel.blackPlayer,
                                                        gameLevel: channel.gameLevel,
                                                        gameAcceptHigher: channel.gameAcceptHigher,
                                                        gameAcceptLower: channel.gameAcceptLower,
                                                        gameTimer: channel.gameTimer,
                                                        gameStarted: channel.gameStarted};

                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify( {
                                returncode: 'joined',
                                gameDetails: tmpChannel
                            }));
                        return true;   // found a game, exit the loop
                    }
                }
            }
            
            // CREATE GAME
            // if its a request for a new game, do not open it
            var newGame = createGame(user, (createFlag ? false:true), playerLevel, playerAcceptLower, playerAcceptHigher, playerTimerPref);
            if (newGame) {
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] New game created, see details below.'); }
                if(LOGSEARCHING) { console.log(channels[newGame]); }
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                        returncode: 'new',
                        gameDetails: channels[newGame]
                    }));
                if (!createFlag) {
                    sendMessage(user,'created-'+newGame+'-'+channels[newGame].gameTimer+'-'+channels[newGame].gameLevel,'game','MAIN');    // send the information to users in the MAIN channel
                }
                return true;
            } else {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                        returncode: 'unable to create a new game',
                        gameDetails: {}
                    }));
            }            
        });
    } 

//
// LEAVING A GAME
//
    else if(url_parts.pathname.substr(0, 6) === '/leave') {
        if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] leave game'); }
        var user = "";
        var key = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};
            try { json = JSON.parse(data); }
            catch(err) { console.log(err); console.log(data); var json= {};}
            user = escapeHtml(json.user);
            key = escapeHtml(json.key);
            gameId = escapeHtml(json.gameId);
            if (!checkUserKey(user, key)) {
                resUnauthorized(res,'The provided key for user ' + user + '  does not match the registered one for the user','provided key for user ' + user + '  = ' + key);
                return false;
            }
            if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... user ' + user + ' leaves game ' + gameId); }
            res.writeHead(200, { 'Content-Type': 'application/json'});
            res.end(JSON.stringify([]));    // first, release the client
            leave(user,gameId);               // then, handle the disconnection
        });
    }

//
// GET GAME STATUS
//
    else if(url_parts.pathname.substr(0, 8) === '/getGame') {
        // user : user issuing the messages
        // key : user's key
        // channel : channel to dispatch the message to
        // category : message category; either chat_msg or game
        // msg : message
        if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] getGame'); }
        var user = "";
        var key = "";
        var gameId = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};      // then analyze the message
            try { json = JSON.parse(data); }    // we were unable to analyze the json string
            catch(err) { 
                resBadRequest(res,err,data);
                return false;
            }
            user = escapeHtml(json.user);
            key = escapeHtml(json.key);
            gameId = escapeHtml(json.gameId);
            if (!user || !gameId) {
                resBadRequest(res,'invalid user or gameId',data);
                return false;             
            }
            if (!checkUserKey(user, key)) {
                resUnauthorized(res,'The provided key for user ' + user + '  does not match the registered one for the user','provided key for user ' + user + '  = ' + key);
                return false;
            }
            if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... user ' + user + ' requests game information for ' + gameId); }
            try { 
                    var channel = channels[gameId];
                    var tmpChannel = {name: channel.name, 
                                open: channel.open, 
                                id: channel.id, 
                                messages: channel.messages, 
                                currentTurn: channel.currentTurn,
                                counter: channel.messages.length,
                                playerA: channel.playerA, 
                                playerB: channel.playerB,
                                whitePlayer: channel.whitePlayer,
                                blackPlayer: channel.blackPlayer,
                                gameLevel: channel.gameLevel,
                                gameAcceptHigher: channel.gameAcceptHigher,
                                gameAcceptLower: channel.gameAcceptLower,
                                gameTimer: channel.gameTimer,
                                gameStarted: channel.gameStarted};

                    res.writeHead(200, { 'Content-type': 'application/json'});
                    res.end(JSON.stringify( {
                            returncode: 'ok',
                            gameDetails: tmpChannel
                    }));
                    return true;
            } catch(err) {
                resNotFound(res,'game not found or closed',data);
                return false;
            }
        });
    }
//
// INBOUND MESSAGES SERVICE
//
    else if(url_parts.pathname.substr(0, 4) === '/msg') {
        // message receiving via JSON POST request
        // user : user issuing the messages
        // key : user's key
        // channel : channel to dispatch the message to
        // category : message category; either chat_msg or game
        // msg : message
        if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] new message'); }
        var user = "";
        var key = "";
        var msg = "";
        var channel = "";
        var data = "";
        var category = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};      // then analyze the message
            try { json = JSON.parse(data); }
            catch(err) {     // we were unable to analyze the json string
                resBadRequest(res,err,data);
                return false;
            }

            msg = json.msg;
            user = escapeHtml(json.user);
            key = escapeHtml(json.key);
            category = escapeHtml(json.category) || 'chat_msg' ;        // default : chat message
            channel = escapeHtml(json.channel) || 'MAIN';                  // default : main channel
            if (!msg || !user) {
                resBadRequest(res,'no message or no user provided',data);
                return false;
            }
            if (!checkUserKey(user, key)) {
                resUnauthorized(res,'The provided key for user ' + user + '  does not match the registered one for the user','provided key for user ' + user + '  = ' + key);
                return false;
            }

            // we are now testing if msg is an array of messages or a single message
            var arrayOfMsg = [];
            var tmpjson = "";
            try {   // try to parse the message
                tmpjson = JSON.parse(msg);
            } catch(err) {     // this is not a json string
                tmpjson = msg;
            }
            if (util.isArray(tmpjson)) {    // if the result is an array, then use it
                arrayOfMsg = tmpjson;
            } else {                        // if not, push it into the array
                arrayOfMsg.push(tmpjson + "");
            }

            try {
                arrayOfMsg.forEach(function(element){
                    var tmpMsg = escapeHtml(element);
                    if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... msg = ' + tmpMsg + " / user = " + user + " / channel = " + channel + " / category = " + category); }
                    if (category === 'game') {
                        if (!checkCommand(channel,user,tmpMsg)) {  // the command is invalid
                            resBadRequest(res,'invalid game command',tmpMsg);
                            console.log(currTime() + ' [MESSAG] incorrect game command from user ' + user + ' : ' + tmpMsg);
                            return false;
                        }
                        commitGameCommand(channel,user,tmpMsg);
                    }
                    sendMessage(user, tmpMsg, category, channel);
                });
            } catch (err) { resInternalError(res,'error processing array of messages', msg); }
            
            // Every thing seems alright. Forward the message via the specified channel and reply with "ok"
            res.writeHead(200, { 'Content-type': 'application/json'});
            res.end(JSON.stringify({returncode: 'ok'}));
            return 0;
        });
    }

//
// GET STATISTICS SERVICE
//
    else if(url_parts.pathname.substr(0, 6) === '/stats') {
        // request for server statistics
        // user : user issuing the messages
        // key : user's key
        if(LOGSTATS) { console.log(currTime() + ' [STATS ] get stats'); }
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            if(LOGSTATS) { console.log(currTime() + ' users : ' + Object.keys(users).length + ' / channels : ' + Object.keys(channels).length - 1); }
            res.writeHead(200, { 'Content-type': 'application/json'});
            res.end(JSON.stringify( {
                    users: Object.keys(users).length,
                    games: Object.keys(channels).length - 1,
                    announce: LASTFRONTPAGEANNOUNCEMENT
                }));
            return true;
        });
    }
    
//
// STATIC FILES SERVING
//
    else {
        // file serving
        // thanks http://blog.phyber.com/2012/03/30/supporting-cache-controls-in-node-js/ for the cache control tips
        if(LOGSTATIC) { console.log(currTime() + ' [STATIC] client file request'); }
        var file='';
        if(url_parts.pathname === '/' || url_parts.pathname === '/client' || url_parts.pathname === '/client/') {
            file = 'main.html';
        }  else if(url_parts.pathname.substr(0, 8) === '/favicon') {
            // serving the favicon
            file = 'img/favicon.ico';
        }  else if(url_parts.pathname === '/about') {
            // deprecated
            file = 'about/index.html';
        }  else {
            if(url_parts.pathname.substr(0,7) === "/client") {   // remove the potential "/client" reference
                file = escapeHtml(url_parts.pathname.substr(8)); 
            } else {
                file = escapeHtml(url_parts.pathname); 
            }
        }
        if(LOGSTATIC) { console.log(currTime() + ' [STATIC] ... serving client/' + file); }
        fs.readFile(SERVERDIR+'client/'+file, function(err, data) {
            if(err) {
                console.log(currTime() + ' [STATIC] ... ' + err);
                if(err.code === "ENOENT") {      // file is simply missing
                    resNotFound(res,'file not found',err);
                } else {                        // other error; could be EACCES or anything
                    resInternalError(res,'internal server error',err);
                }
            }
            else {
                fs.stat(SERVERDIR+'client/'+file, function (err, stat) {
                    if (err) {
                        resInternalError(res,'internal server error',err);
                    }
                    else {
                        var etag = stat.size + '-' + Date.parse(stat.mtime);
                        res.setHeader('Last-Modified', stat.mtime);
                        if(LOGSTATIC) { console.log(currTime() + ' [STATIC] ... etag : ' + etag); }
                        if(LOGSTATIC) { console.log(currTime() + ' [STATIC] ... req.if-none-match : ' + req.headers['if-none-match']); }
                        if(LOGSTATIC) { console.log(req.headers); }

                        if (req.headers['if-none-match'] === etag) {
                            res.statusCode = 304;
                            res.end();
                        }
                        else {
                            res.setHeader('Content-Length', data.length);
                            res.setHeader('Cache-Control', 'public, max-age=600');
                            res.setHeader('ETag', etag);
                            res.statusCode = 200;
                            res.end(data);
                        }
                    }
                });
            }
        });
    } 


}).listen(PORT,ADDRESS);
console.log(currTime() + ' [START ] Server running on port ' + PORT);
