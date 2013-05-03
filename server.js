//////////////////////////////////////////////////
//                                              //
//      Main server for Chess Hub               //
//  http://www.github.com/macmorning/chess-hub  //
//                                              //
//////////////////////////////////////////////////
/*
*    Copyright (C) 2013
*	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


var PORT = process.env.PORT || 8080;
var ADDRESS = process.env.IP;
var SERVERDIR = "";
if (process.env.C9_PID) {       // for running the server on c9.io
    SERVERDIR = process.env.HOME + '/' + process.env.C9_PID + "/";
}
var http = require('http'),
    url = require('url'),
    fs = require('fs');
var Channel = require('./channel.js');


var GAMEINDEX=0;        // IDs for newly created games
var users = {};         // init the users objects array
var channels = [];      // init the channels array

var MAXCLIENTS_2    = 70;          // absolute maximum number of clients; any request will be dropped once this number is reached
var MAXCLIENTS_1    = 50;          // maximum number of clients before refusing new connections
var MAXGAMES        = 20;          // maximum number of games
var MAXMESSAGES     = 20;          // maximum number of messages sent at once

var LOGSTATIC       = true;       // enable or disable static files serving logs
var LOGCONNECT      = true;        // enable or disable connections logs
var LOGMESSAGING    = false;       // enable or disable messaging logs
var LOGPOLLING      = false;       // enable or disable polling logs
var LOGCHANNEL      = false;       // enable or disable channel activity logs
var LOGSEARCHING    = false;       // enable or disable game searches logs
var LOGSTATS        = false;       // enable or disable game stats logs
var LOGHOUSEKEEPING = false;       // enable or disable house keeping logs

function escapeHtml(unsafe) {
    if(unsafe && isNaN(unsafe)) {// escapes Html characters
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
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
}
function resNotFound(res,err,data) {
    res.writeHead(404, { 'Content-type': 'text/txt'});
    res.end('Not found');
    console.log(currTime() + ' [NOTFOU] ... error : ' + err);
    console.log(data);
}
function resInternalError(res,err,data) {
    res.writeHead(500, { 'Content-type': 'text/txt'});
    res.end('Internal server error');
    console.log(currTime() + ' [INTERN] ... error : ' + err);
    console.log(data);
}

function sendMessage(from, msg, category, to ) {
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
    var message = [];
    if (!category) { category = "chat_msg"; }
    message = {time: currTime(), user: from, msg: msg, category: category, to: to };
    if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... sendMessage : ' + message.msg);}
    channels[to].messages.push(message);
    var json = JSON.stringify( { counter: channels[to].messages.length, append: message });
    var i = 0;
    for(var user in channels[to].users) {
        try { channels[to].users[user].client.end(json); }
        catch(err) {}
        delete channels[to].users[user].client;
        i++;
    }
    if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... sent message to ' + i + ' client(s)');}
}

function leaveGame(i,user) {
    return channels[i].removeUser(user);    // remove the user from the users array
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
        GAMEINDEX++;
        var gameId = "GAME" + GAMEINDEX;
            channels[gameId] = new Channel(user + "'s table",gameId);
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
            leaveGame(i,user);
            sendMessage(user,'leave-'+reason,'game',i);    // send the information to users in that channel
        }
    } 
}

function houseKeeper() {
    // disconnects inactive users and destroys empty channels
    if(LOGHOUSEKEEPING) { console.log(currTime() + ' [HOUSEK] running');}
    var limitTime = new Date() - 120000;   // drop users if their last activity is more than 2 minutes old
    for (var user in users) {
        if (users[user].lastActivity < limitTime) {
            console.log(currTime() + ' [HOUSEK] ... disconnect ' + user);
            if(LOGHOUSEKEEPING) { console.log(currTime() + ' [HOUSEK] ... last activity = ' + users[user].lastActivity);}
            if(LOGHOUSEKEEPING) { console.log(currTime() + ' [HOUSEK] ... limit time = ' + limitTime);}
            disconnect(user);
        }
    }
    for (var game in channels) {
        if (channels[game].id !== 'MAIN' && !channels[game].playerA && !channels[game].playerB) {
            console.log(currTime() + ' [HOUSEK] ... delete game without players ' + game);
            delete channels[game];
        }
    }
}

function checkCommand(channel,user,msg) {
    // this function verifies the validity of the game commands sent by the clients.
    // returns 0 if ok, 1 if ko
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



// create the main chat channel
channels['MAIN'] = new Channel('Main','MAIN');
channels['MAIN'].addMessage({ time : currTime(), user : "ADMIN", msg : "Welcome to Chess Hub !", category : "chat_sys", to : ""  });
channels['MAIN'].switchOpen(true);                  // mark the main chat channel as open for all


// start the housekeeping interval, every 10s
setInterval(function() {
        houseKeeper();
    }, 10000);


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
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = JSON.parse(data);
            user = escapeHtml(json.user);
            if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] ... connect ' + user); }

            if (!users[user]) {
                users[user] = {};
                users[user].lastActivity = new Date();
                sendMessage(user,'join','game','MAIN');    // send the information to users in that channel
                channels['MAIN'].addUser(user);
                console.log(currTime() + ' [CONNEC] user: ' + user + ' connected, client: ' + json.clientLib + ', version: ' + json.clientVersion);
                var uuid = guid();
                res.writeHead(200, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                    returncode: 'ok',
                    returnmessage: 'Welcome ' + user,
                    user: user,
                    key: uuid
                }));
            } else {
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
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = JSON.parse(data);
            user = escapeHtml(json.user);
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
            var json = JSON.parse(data);
            channel = escapeHtml(json.channel);
            user = escapeHtml(json.user);
            key = escapeHtml(json.key);
            counter = json.counter;
            if (isNaN(counter) || !channel || !channels[channel])  {   // no counter provided or no channel id, send Bad Request HTTP code
                resBadRequest(res,'bad counter or unknown channel',data);
                return false;
            }
            if (!users[user]) {
                res.writeHead(401, { 'Content-type': 'text/txt'});
                res.end('Unauthorized');
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
                if ( n <= MAXMESSAGES ) {
                    lastMessages = channels[channel].messages.slice(counter);
                } else if ( n > MAXMESSAGES ) {       // if there are too many messages to send
                    lastMessages = channels[channel].messages.slice(channels[channel].messages.length - MAXMESSAGES);
                }
                if(LOGPOLLING) { console.log(currTime() + ' [POLLIN] ... sending ' + lastMessages.length + ' new message(s)'); }
                res.writeHead(200, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                    counter: channels[channel].messages.length,
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
        var player="";
        var playerLevel=0;
        var playerAcceptLower=0;
        var playerAcceptHigher=0;
        var playerTimerPref=0;
        var data="";
        if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] search a game'); }
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};
            try { json = JSON.parse(data); }
            catch(err) { console.log(err); console.log(data); var json= {};}
            player = escapeHtml(json.user);
            try {
                playerLevel = parseInt(json.playerLevel,10);
                playerAcceptLower = parseInt(json.playerAcceptLower,10);
                playerAcceptHigher = parseInt(json.playerAcceptHigher,10);
                playerTimerPref = parseInt(json.playerTimerPref,10);
            } catch(err) {
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... error, incorrect format, dumping data below');}
                if(LOGSEARCHING) { console.log(json); }
                resBadRequest(res);
                return false;
            }
            if (isNaN(playerTimerPref)) { playerTimerPref = -1; }
            if (!player || isNaN(playerLevel))  {   // no username, no level => send Bad Request HTTP code
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... error, dumping data below'); }
                if(LOGSEARCHING) { console.log(json); }
                resBadRequest(res);
                return 1;
            }
            if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... for player = ' + player + ', level = ' + playerLevel, ' timer = ' + playerTimerPref +  ' allow higher/lower = ' + playerAcceptHigher + '/' + playerAcceptLower);}
            
            // searching for an existing game
            var count = 0;  // count the number of channels
            for (var i in channels) {
                count++;
                var channel = channels[i];
                if(channel.open         // the channel is open
                        && channel.playerA && !channel.playerB && channel.playerA !== player     // this is a game channel with only a player A, who is not the user who searches for a game
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
                    return 0;   // found a game, exit the loop
                }
            }

            // CREATE GAME
            var newGame = createGame(player, true, playerLevel, playerAcceptLower, playerAcceptHigher, playerTimerPref);
            if (newGame) {
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] New game created, see details below.'); }
                if(LOGSEARCHING) { console.log(channels[newGame]); }
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                        returncode: 'new',
                        gameDetails: channels[newGame]
                    }));
                sendMessage(player,'created-'+newGame+'-'+channels[newGame].gameTimer+'-'+channels[newGame].gameLevel,'game','MAIN');    // send the information to users in the MAIN channel
                return 0;
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
// GET GAME STATUS
//
    else if(url_parts.pathname.substr(0, 8) === '/getGame') {
        // user : user issuing the messages
        // key : user's key
        // channel : channel to dispatch the message to
        // category : message category; either chat_msg or game
        // msg : message
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
            try { if(channels[gameId].open) {
                    var channel = channels[gameId];
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

                    res.writeHead(200, { 'Content-type': 'application/json'});
                    res.end(JSON.stringify( {
                            returncode: 'ok',
                            gameDetails: tmpChannel
                    }));
                    return true;
                }
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
        var msg = "";
        var channel = "";
        var data = "";
        var category = "";
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
            msg = escapeHtml(json.msg);         // escaping html chars
            user = escapeHtml(json.user);
            category = escapeHtml(json.category) || 'chat_msg' ;        // default : chat message
            channel = escapeHtml(json.channel) || 'MAIN';                  // default : main channel
            if (!msg || !user) {
                resBadRequest(res,'no message or no user provided',data);
                return false;
            }
            
            if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... msg = ' + msg + " / user = " + user + " / channel = " + channel + " / category = " + category); }
            if (category === 'game') {
                if (!checkCommand(channel,user,msg)) {  // the command is invalid
                    resBadRequest(res,'invalid game command',msg);
                    console.log(currTime() + ' [MESSAG] incorrect game command from user ' + user + ' : ' + msg);
                    return false;
                }
            }

            // Every thing seems alright. Forward the message via the specified channel and reply with "ok"
            sendMessage(user, msg, category, channel);
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
                    games: Object.keys(channels).length - 1
                }));
            return true;
        });
    }
    
//
// ADMIN SERVICE
//
    else if(url_parts.pathname.substr(0) === '/admin') {
        console.log(currTime() + ' [ADMIN ] dumping objects to console');
        console.log(currTime() + ' [ADMIN ] ... users');
        console.log(users);
        //console.log(currTime() + ' [ADMIN ] ... clients');
        //console.log(clients);
        console.log(currTime() + ' [ADMIN ] ... channels');
        console.log(channels);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(currTime() + ' Objects dumped to console');
    }

//
// STATIC FILES SERVING
//
    else {
        // file serving
        // thanks http://blog.phyber.com/2012/03/30/supporting-cache-controls-in-node-js/ for the cache control code
        if(LOGSTATIC) { console.log(currTime() + ' [STATIC] client file request'); }
        var file='';
        if(url_parts.pathname === '/' || url_parts.pathname === '/client' || url_parts.pathname === '/client/') {
            file = 'main.html';
        }  else if(url_parts.pathname.substr(0, 8) === '/favicon') {
            // serving the favicon
            file = 'img/favicon.ico';
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
                        if(LOGSTATIC) { console.log(currTime() + ' [STATIC] ... req if-none-match : ' + req.headers['If-None-Match']); }
                        if(LOGSTATIC) { console.log(req.headers); }

                        if (req.headers['If-None-Match'] === etag) {
                            res.statusCode = 304;
                            res.end();
                        }
                        else {
                            res.setHeader('Content-Length', data.length);
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
