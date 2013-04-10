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

var LOGSTATIC       = false;       // enable or disable static files serving logs
var LOGCONNECT      = true;        // enable or disable connections logs
var LOGMESSAGING    = true;        // enable or disable messaging logs
var LOGPOLLING      = false;       // enable or disable polling logs
var LOGCHANNEL      = true;        // enable or disable channel activity logs
var LOGSEARCHING    = false;       // enable or disable game searches logs
var LOGSTATS        = false;       // enable or disable game stats logs
var LOGHOUSEKEEPING = false;        // enable or disable house keeping logs

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

function currTime() {
    // write current time in HH:mm format
    var currentDate = new Date();
    var hours = currentDate.getHours();
    if (hours < 10) { hours = "0" + hours; }
    var minutes = currentDate.getMinutes();
    if (minutes < 10) { minutes = "0" + minutes; }
    return(hours + ":" + minutes);
}

function sendMessage(from, msg, category, to ) {
    // adds a message to the messages array and send it to polling clients
    // sendMessage(from, msg, [category, [to]])
    // from : user issuing the message
    // msg : message
    // category : message category : 
    //        - chat_msg (by default), simple message sent to a chat channel or a user
    //        - chat_sys, system message to be broadcasted in all opened chat channels
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

function disconnect(user,reason) {
    delete users[user];    // remove the user from the users array
    if(!reason) { reason = 'quit'; }
    for (var i in channels) {               // remove the user from any game he's in
        if(channels[i].users[user]) {
            var channel = channels[i];
            channel.removeUser(user);    // remove the user from the users array
            sendMessage(user,'leave-'+reason,'game',channel.id);    // send the information to users in that channel
            if(channel.playerA === user) {
                channel.playerA = '';
            } else if (channel.playerB === user) {
                channel.playerB = '';
            }
            if (channel.blackPlayer === user || channel.whitePlayer === user) {        // the user was a seated player, close the game
                channel.switchOpen(false);
            }
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
}
// create the main chat channel
channels['MAIN'] = new Channel('Main','MAIN');
channels['MAIN'].addMessage({ time : currTime(), user : "ADMIN", msg : "Welcome to Chess Hub !", category : "chat_sys", to : ""  });
channels['MAIN'].switchOpen(true);                  // mark the main chat channel as open for all


// start the housekeeping interval, every 1000ms
setInterval(function() {
        houseKeeper();
    }, 10000);


http.createServer(function (req, res) {

    if(Object.keys(users).length > MAXCLIENTS_2) {
          console.log(currTime() + ' [LIMIT ] Cannot accept request, MAXCLIENT_2 reached !(' + MAXCLIENTS_2 + ')');
          res.writeHead(500, { 'Content-type': 'text/txt'});
          res.end('Sorry, there are too many users right now ! Please try again later.');
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
                    user: ''
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
                channels['MAIN'].users[user] = {};
                console.log(currTime() + ' [CONNEC] user: ' + user + ' connected, client: ' + json.clientLib + ', version: ' + json.clientVersion);
                users[user].lastActivity = new Date();
                res.writeHead(200, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                    returncode: 'ok',
                    returnmessage: 'Welcome ' + user,
                    user: user,
                    key: 'unique key for ' + user     // TODO : generate a GUID here
                }));
            } else {
                if(LOGCONNECT) { console.log(currTime() + ' [CONNEC] ... ' + user + ' is already reserved'); }
                res.writeHead(200, { 'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                    returncode: 'ko',
                    returnmessage: 'Sorry, ' + user + ' is already used. Please pick another name.',
                    user: user
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
                if(LOGPOLLING) { console.log(currTime() + ' [POLLIN] ... error, dumping data below');}
                if(LOGPOLLING) { console.log(json); }
                res.writeHead(400, { 'Content-type': 'text/txt'});
                res.end('Bad request');
                return 1;
            }
            if (!users[user]) {
                if(LOGPOLLING) { console.log(currTime() + ' [POLLIN] ... unknown user');}
                if(LOGPOLLING) { console.log(json); }
                res.writeHead(401, { 'Content-type': 'text/txt'});
                res.end('Unauthorized');
                return 1;
            }
            if(LOGPOLLING) { console.log(currTime() + ' [POLLIN] ... counter = ' + counter + ' from user = ' + user + ' for channel = ' + channel); }
            users[user].lastActivity = new Date();       // update user's last polling request
            channels[channel].users[user].lastActivity = new Date();       // update user's last polling request

            var n = 0;
            try { n = channels[channel].messages.length - counter; }        // try to get the messages list for the channel
            catch(err) {                                        // the channel doesn't exit
                res.writeHead(500, {'Content-Type': 'text/txt'});
                res.end("This channel doesn't exist or has been destroyed.");
                return 1;
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
                res.writeHead(400, { 'Content-type': 'text/txt'});
                res.end('Bad request');
                return 1;                
            }
            if (isNaN(playerTimerPref)) { playerTimerPref = -1; }
            if (!player || isNaN(playerLevel))  {   // no username, no level => send Bad Request HTTP code
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... error, dumping data below'); }
                if(LOGSEARCHING) { console.log(json); }
                res.writeHead(400, { 'Content-type': 'text/txt'});
                res.end('Bad request');
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
                    channel.addUser(player);
                    channel.playerB = player;
                    if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] ... playerB = ' + channel.playerB);}
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    console.log(channel);
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
                                                    gameStarted: false};
                    res.end(JSON.stringify( {
                            returncode: 'joined',
                            gameDetails: tmpChannel
                        }));
                    return 0;   // found a game, exit the loop
                }
            }

            // no game found, create one if MAXGAMES has not been reached yet
            if(count > MAXGAMES) {      // there are too many games, send http/500 and return
                console.log(currTime() + ' [LIMIT ] Cannot create a new game, MAXGAMES reached !(' + MAXGAMES + ')');
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end('Sorry, there are to many games right now. Please try again later');
                return 0;
            } else {
                // create the new game channel and push it
                GAMEINDEX++;
                var gameId = "GAME" + GAMEINDEX;
                    channels[gameId] = new Channel(player + "'s table",gameId);
                    channels[gameId].gameTimer = (playerTimerPref >= 0 ? playerTimerPref : 0);  // if user has set his pref to indifferent (-1), then don't set a timer
                    channels[gameId].gameLevel = playerLevel;
                    channels[gameId].playerA = player;
                    channels[gameId].gameAcceptHigher = playerAcceptHigher;
                    channels[gameId].gameAcceptLower = playerAcceptLower;
                    channels[gameId].addUser(player);
                if(LOGSEARCHING) { console.log(currTime() + ' [SEARCH] New game created, see details below.'); }
                if(LOGSEARCHING) { console.log(channels[gameId]); }
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                        returncode: 'new',
                        gameDetails: channels[gameId]
                    }));
                return 0;
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
                res.writeHead(400, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                        returncode: 'ko'
                }));
                console.log(err); 
                console.log(data); 
                return 1;                
            }
            msg = escapeHtml(json.msg);         // escaping html chars
            user = escapeHtml(json.user);
            category = escapeHtml(json.category) || 'chat_msg' ;        // default : chat message
            channel = escapeHtml(json.channel) || 'MAIN';                  // default : main channel
            if (!msg || !user) {
                res.writeHead(400, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                        returncode: 'ko'
                }));
                return 1;                
            }
            
            if(LOGMESSAGING) { console.log(currTime() + ' [MESSAG] ... msg = ' + msg + " / user = " + user + " / channel = " + channel + " / category = " + category); }
            if (category === 'game') {
                // TODO : check game commands here
            }

            sendMessage(user, msg, category, channel);
            res.writeHead(200, { 'Content-type': 'application/json'});
            res.end(JSON.stringify({returncode: 'ok'}));
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
        var user = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = {};
            try { json = JSON.parse(data); }
            catch(err) { console.log(err); console.log(data); var json= {};}
            user = escapeHtml(json.user);
            var gamesTimed10Started = 0;
            var gamesTimed10Pending = 0;
            var gamesTimed5Started = 0;
            var gamesTimed5Pending = 0;
            var gamesNonTimedStarted = 0;
            var gamesNonTimedPending = 0;
            for (var i in channels) {
                if (channels[i].id === "MAIN") {
                    continue;
                } else if (channels[i].gameStarted === true) {
                    if (channels[i].gameTimer === 10) {
                        gamesTimed10Started++;
                    } if (channels[i].gameTimer === 5) {
                        gamesTimed5Started++;                        
                    } else {
                        gamesNonTimedStarted++;                        
                    }
                } else if (channels[i].gameStarted === false) {
                    if (channels[i].gameTimer === 10) {
                        gamesTimed10Pending++;
                    } if (channels[i].gameTimer === 5) {
                        gamesTimed5Pending++;                        
                    } else {
                        gamesNonTimedPending++;                        
                    }
                }
            }
            if(LOGSTATS) { console.log(currTime() + " [STATS ] ... user = " + user); }
            res.writeHead(200, { 'Content-type': 'text/html'});
            res.end(JSON.stringify( {
                    users: Object.keys(users).length,
                    gamesTimed10Started: gamesTimed10Started,
                    gamesTimed10Pending: gamesTimed10Pending,
                    gamesTimed5Started: gamesTimed5Started,
                    gamesTimed5Pending: gamesTimed5Pending,
                    gamesNonTimedStarted: gamesNonTimedStarted,
                    gamesNonTimedPending: gamesNonTimedPending
                }));
            return 0;
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
                    res.writeHead(404, { 'Content-type': 'text/txt'});
                    res.end('file not found');
                } else {                        // other error; could be EACCES or anything
                    res.writeHead(503, { 'Content-type': 'text/txt'});
                    res.end('Unhandled server error (' + err.code + ')');
                }
            }
            res.end(data);
        });
    } 


}).listen(PORT,ADDRESS);
console.log(currTime() + ' [START ] Server running on port ' + PORT);
