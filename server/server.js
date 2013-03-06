var PORT = 8080;
var http = require('http'),
    url = require('url'),
    fs = require('fs');


var messages = [
        { time : currTime(), user : "ADMIN", msg : "Welcome to Chess Hub !", category : "chat_sys", to : ""  }
        ];
var clients = [];
var users = [];

var LOGSTATIC = false;
var LOGCONNECT = true;
var LOGMESSAGING = true;
var LOGPOLLING = true;

function sendMessage(from, msg, category, to ) {
    // adds a message to the messages array and send it to polling clients
    // sendMessage(from, msg, [category, [to]])
    // from : user issuing the message
    // msg : message
    // category : message category : chat_msg (by default), chat_sys, chat_me, chat_activity, or game
    // to : target for the message : a user, a game channel id, or main channel (by default)
    var message = [];
    if (!category) category = "chat_msg";
    message = {time: currTime(), user: from, msg: msg, category: category, to: to };
    LOGMESSAGING && console.log(currTime() + ' [MESSAG] ... sendMessage : ' + message.msg);
    messages.push(message);
    var json = JSON.stringify( { count: messages.length, append: message });
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

   // parse URL
   var url_parts = url.parse(req.url);
   //console.log(url_parts);

    if(url_parts.pathname.substr(0, 8) == '/connect') {
        // connect a user
        LOGCONNECT && console.log(currTime() + ' [CONNEC] connect');
        var user = "";
        var data = "";
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = JSON.parse(data);
            user = json.user;
            LOGCONNECT && console.log(currTime() + ' [CONNEC] ... connect ' + user);

            if (users.indexOf(user) == -1) {
                LOGCONNECT && console.log(currTime() + ' [CONNEC] ... adding ' + user);
                users.push(user);
                res.writeHead(200, { 'Content-type': 'text/html'});
                res.end(JSON.stringify( {
                    returncode: 'ok',
                    returnmessage: 'Welcome ' + user
                }));
                sendMessage('ADMIN',user + ' joined','join');
            } else {
                LOGCONNECT && console.log(currTime() + ' [CONNEC] ... ' + user + ' is already reserved');
                res.writeHead(200, { 'Content-type': 'text/html'});
                res.end(JSON.stringify( {
                    returncode: 'ko',
                    returnmessage: 'Sorry, ' + user + ' is already used. Please pick another name.'
                }));
            }
            LOGCONNECT && console.log(currTime() + ' [CONNEC] ... current users : ' + users);
        });
    } 


    if(url_parts.pathname.substr(0, 7) == '/client' || url_parts.pathname == '/' || url_parts.pathname.substr(0, 8) == '/favicon') {
        // file serving
        LOGSTATIC && console.log(currTime() + ' [STATIC] client file request');
        var file='';
        if(url_parts.pathname == '/' || url_parts.pathname == '/client' || url_parts.pathname == '/client/') {
            file = 'index.html';
        }  else if(url_parts.pathname.substr(0, 8) == '/favicon') {
            // serving the favicon
            file = 'img/favicon.ico';
        }  else {
            file = escape(url_parts.pathname.substr(8));
        }
        LOGSTATIC && console.log(currTime() + ' [STATIC] ... serving ../client/' + file);
        fs.readFile('../client/'+file, function(err, data) {
         res.end(data);
        });
    } 


    
    else if(url_parts.pathname.substr(0, 5) == '/poll') {
        // polling
        LOGPOLLING && console.log(currTime() + ' [POLLIN] polling')
        var count = url_parts.pathname.replace(/[^0-9]*/, '');
        LOGPOLLING && console.log(currTime() + ' [POLLIN] ... count = ' + count);
        res.writeHead(200, {'Content-Type': 'application/json'});
        if(messages.length > count) {
            LOGPOLLING && console.log(currTime() + ' [POLLIN] ... sending ' + (messages.length - count) + ' new message(s)');
            res.end(JSON.stringify( {
            count: messages.length,
            append: messages.slice(count)
          }));
        } else {
            clients.push(res);
        }
    } 
    
    
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
            msg = json.msg;
            user = json.user;
            
            LOGMESSAGING && console.log(currTime() + ' [MESSAG] ... msg = ' + msg + " / user = " + user);
            sendMessage(user, msg);
            res.writeHead(200, { 'Content-type': 'text/html'});
            res.end();
        });
    }
    

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
}).listen(PORT);
console.log(currTime() + ' [START ] Server running on port ' + PORT);
