var http = require('http'),
    url = require('url'),
    fs = require('fs');

var messages = ["testing"];
var clients = [];
var users = [];

var LOGSTATIC = false;
var LOGCONNECT = true;
var LOGMESSAGING = true;
var LOGPOLLING = true;


http.createServer(function (req, res) {

   // parse URL
   var url_parts = url.parse(req.url);
   //console.log(url_parts);

    if(url_parts.pathname.substr(0, 8) == '/connect') {
        LOGCONNECT && console.log(new Date() + ' [CONNEC] connect');
        // connect a user
        var user = url_parts.pathname.substr(9);
        LOGCONNECT && console.log(new Date() + ' [CONNEC] ... connect ' + user);
        LOGCONNECT && console.log(new Date() + ' [CONNEC] ... current users : ' + users);

        if (users.indexOf(user) == -1) {
            LOGCONNECT && console.log(new Date() + ' [CONNEC] ... adding ' + user);
            users.push(user);
            res.writeHead(200, { 'Content-type': 'text/html'});
            res.end(JSON.stringify( {
                returncode: 'ok',
                returnmessage: 'Welcome ' + user
            }));
        } else {
            LOGCONNECT && console.log(new Date() + ' [CONNEC] ... ' + user + ' is already reserved');
            res.writeHead(200, { 'Content-type': 'text/html'});
            res.end(JSON.stringify( {
                returncode: 'ko',
                returnmessage: 'Sorry, ' + user + ' is already used. Please pick another name.'
            }));
        }
    } 


    if(url_parts.pathname.substr(0, 7) == '/client' || url_parts.pathname == '/' || url_parts.pathname.substr(0, 8) == '/favicon') {
        // file serving
        LOGSTATIC && console.log(new Date() + ' [STATIC] client file request');
        var file='';
        if(url_parts.pathname == '/' || url_parts.pathname == '/client' || url_parts.pathname == '/client/') {
            file = 'index.html';
        }  else if(url_parts.pathname.substr(0, 8) == '/favicon') {
            // serving the favicon
            file = 'img/favicon.ico';
        }  else {
            file = escape(url_parts.pathname.substr(8));
        }
        LOGSTATIC && console.log(new Date() + ' [STATIC] ... serving ../client/' + file);
        fs.readFile('../client/'+file, function(err, data) {
         res.end(data);
        });
    } 


    
    else if(url_parts.pathname.substr(0, 5) == '/poll') {
        // polling
        LOGPOLLING && console.log(new Date() + ' [POLLIN] polling')
        var count = url_parts.pathname.replace(/[^0-9]*/, '');
        LOGPOLLING && console.log(new Date() + ' [POLLIN] ... count = ' + count);
        if(messages.length > count) {
            LOGPOLLING && console.log(new Date() + ' [POLLIN] ... sending ' + (messages.length - count) + ' new message(s)');
            res.end(JSON.stringify( {
            count: messages.length,
            append: messages.slice(count).join("\n")+"\n"
          }));
        } else {
            clients.push(res);
        }
    } 
    
    else if(url_parts.pathname.substr(0, 4) == '/msg') {
        // message receiving
        LOGMESSAGING && console.log(new Date() + ' [MESSAG] new message');
        var msg = unescape(url_parts.pathname.substr(5));
        LOGMESSAGING && console.log(new Date() + ' [MESSAG] ... msg = ' + msg);
        messages.push(msg);
        var i=0;
        while(clients.length > 0) {
            i++;
            var client = clients.pop();
            client.end(JSON.stringify( {
                count: messages.length,
                append: msg+"\n"
            }));
        }
        LOGMESSAGING && console.log(new Date() + ' [MESSAG] ... sent message to ' + i + ' clients');
        res.end();
    }
}).listen(8080, 'localhost');
console.log('Server running.');
