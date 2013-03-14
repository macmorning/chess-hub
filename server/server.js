//////////////////////////////////////////////////
//                                              //
//      Main server for Chess Hub               //
//  http://www.github.com/macmorning/chess-hub  //
//                                              //
//////////////////////////////////////////////////

var PORT = process.env.PORT || 8080;
var ADDRESS = process.env.IP;
var SERVERDIR = "";
if (process.env.C9_PID) {
    SERVERDIR = process.env.HOME + '/' + process.env.C9_PID + '/server/';
}
var http = require('http'),
    url = require('url'),
    fs = require('fs');
var channel = require('./channel.js');


var messages = [
        { time : currTime(), user : "ADMIN", msg : "Welcome to Chess Hub !", category : "chat_sys", to : ""  }
        ];
var clients = [];                                   // init the clients array
var users = [];                                     // init the users array
var channels = [];                                  // init the channels array
var chan_main = new channel('Main channel','MAIN');   // create the main chat channel
chan_main.switchOpen(true);
channels.push(chan_main);       // push the main chat channel to the channels array

var MAXMESSAGES = 20;           // maximum number of messages sent at once
var LOGSTATIC = false;          // enable or disable static files serving logs
var LOGCONNECT = true;          // enable or disable connections logs
var LOGMESSAGING = true;        // enable or disable messaging logs
var LOGPOLLING = true;          // enable or disable polling logs

function escapeHtml(unsafe) {
    // escapes Html characters
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
    //        - game, game channel activity
    // to : target for the message : a user, a game channel id, or main channel (by default)
    var message = [];
    if (!category) category = "chat_msg";
    message = {time: currTime(), user: from, msg: msg, category: category, to: to };
    LOGMESSAGING && console.log(currTime() + ' [MESSAG] ... sendMessage : ' + message.msg);
    messages.push(message);
    var json = JSON.stringify( { counter: messages.length, append: message });
    var i = 0;
    while(clients.length > 0) {
        var client = clients.pop();
        client.end(json);
        i++;
    }
    LOGMESSAGING && console.log(currTime() + ' [MESSAG] ... sent message to ' + i + ' client(s)');
}

function currTime() {
    // write current time in HH:mm format
    var currentDate = new Date();
    var hours = currentDate.getHours();
    if (hours < 10) hours = "0" + hours;
    var minutes = currentDate.getMinutes();
    if (minutes < 10) minutes = "0" + minutes;
    return(hours + ":" + minutes);
}


http.createServer(function (req, res) {

//
// ROUTING
//
   var url_parts = url.parse(req.url);
   //console.log(url_parts);

//
// CONNECTION SERVICE
//
    if(url_parts.pathname.substr(0, 8) == '/connect') {
        LOGCONNECT && console.log(currTime() + ' [CONNEC] connect');
        var user = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = JSON.parse(data);
            user = escapeHtml(json.user);
            LOGCONNECT && console.log(currTime() + ' [CONNEC] ... connect ' + user);

            if (users.indexOf(user) == -1) {
                console.log(currTime() + ' [CONNEC] user: ' + user + ' connected, client: ' + json.clientLib + ', version: ' + json.clientVersion);
                users.push(user);
                res.writeHead(200, { 'Content-type': 'text/html'});
                res.end(JSON.stringify( {
                    returncode: 'ok',
                    returnmessage: 'Welcome ' + user,
                    user: user,
                    key: 'unique key for ' + user     // TODO : generate a GUID here
                }));
                sendMessage('ADMIN',user + ' joined','chat_activity');
            } else {
                LOGCONNECT && console.log(currTime() + ' [CONNEC] ... ' + user + ' is already reserved');
                res.writeHead(200, { 'Content-Type': 'application/json'});
                res.end(JSON.stringify( {
                    returncode: 'ko',
                    returnmessage: 'Sorry, ' + user + ' is already used. Please pick another name.',
                    user: user
                }));
            }
            LOGCONNECT && console.log(currTime() + ' [CONNEC] ... current users : ' + users);
        });
    } 

    
//
// POLLING SERVICE
//
    else if(url_parts.pathname.substr(0, 5) == '/poll') {
        // polling
        var data="";
        LOGPOLLING && console.log(currTime() + ' [POLLIN] polling')
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = JSON.parse(data);
            if (isNaN(json.counter))  {   // no counter provided, send Bad Request HTTP code
                LOGPOLLING && console.log(currTime() + ' [POLLIN] ... error, dumping data below')
                LOGPOLLING && console.log(json)
                res.writeHead(400, { 'Content-type': 'text/txt'});
                res.end('Bad request');
            }
            LOGPOLLING && console.log(currTime() + ' [POLLIN] ... counter = ' + json.counter + ' from user = ' + json.user);
            res.writeHead(200, {'Content-Type': 'application/json'});
            var n = messages.length - json.counter;
            if(n > 0) {
                var lastMessages = {};
                if ( n <= MAXMESSAGES ) {
                    lastMessages = messages.slice(json.counter)
                } else if ( n > MAXMESSAGES ) {       // if there are too many messages to send
                    lastMessages = messages.slice(messages.length - MAXMESSAGES);
                }
                LOGPOLLING && console.log(currTime() + ' [POLLIN] ... sending ' + lastMessages.length + ' new message(s)');
                res.writeHead(200, { 'Content-type': 'application/json'});
                res.end(JSON.stringify( {
                    counter: messages.length,
                    append: lastMessages
                }));
            } else {
                clients.push(res);  // if there is no message to push, keep the client in the clients array (long polling)
            }
        });
    } 
    
//
// INBOUND MESSAGES SERVICE
//
    else if(url_parts.pathname.substr(0, 4) == '/msg') {
        // message receiving via JSON POST request
        // user : user issuing the messages
        // msg : message
        LOGMESSAGING && console.log(currTime() + ' [MESSAG] new message');
        var user = "";
        var msg = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = JSON.parse(data);
            msg = escapeHtml(json.msg);         // escape html chars
            user = escapeHtml(json.user);
            
            LOGMESSAGING && console.log(currTime() + ' [MESSAG] ... msg = ' + msg + " / user = " + user);
            sendMessage(user, msg);
            res.writeHead(200, { 'Content-type': 'text/html'});
            res.end(JSON.stringify({0:'OK'}));
        });
    }
    
//
// ADMIN SERVICE
//
    else if(url_parts.pathname.substr(0) == '/admin') {
        console.log(currTime() + ' [ADMIN ] dumping objects to console');
        console.log(currTime() + ' [ADMIN ] ... users');
        console.log(users);
        //console.log(currTime() + ' [ADMIN ] ... clients');
        //console.log(clients);
        console.log(currTime() + ' [ADMIN ] ... messages');
        console.log(messages);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(currTime() + ' Objects dumped to console');
    }

//
// STATIC FILES SERVING
//
    else {
        // file serving
        LOGSTATIC && console.log(currTime() + ' [STATIC] client file request');
        var file='';
        if(url_parts.pathname == '/' || url_parts.pathname == '/client' || url_parts.pathname == '/client/') {
            file = 'main.html';
        }  else if(url_parts.pathname.substr(0, 8) == '/favicon') {
            // serving the favicon
            file = 'img/favicon.ico';
        }  else {
            if(url_parts.pathname.substr(0,7) == "/client") {   // remove the potential "/client" reference
                file = escapeHtml(url_parts.pathname.substr(8)); 
            } else {
                file = escapeHtml(url_parts.pathname); 
            }
        }
        LOGSTATIC && console.log(currTime() + ' [STATIC] ... serving ../client/' + file);
        fs.readFile(SERVERDIR+'../client/'+file, function(err, data) {
            if(err) {
                console.log(currTime() + ' [STATIC] ... ' + err);
                if(err.code == "ENOENT") {      // file is simply missing
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
