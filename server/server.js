var http = require('http'),
    url = require('url'),
    fs = require('fs');

var messages = ["testing"];
var clients = [];

http.createServer(function (req, res) {

   // parse URL
   var url_parts = url.parse(req.url);
   console.log(url_parts);

    if(url_parts.pathname.substr(0, 7) == '/client') {
        // file serving
        console.log('... client requesting ' + url_parts.pathname.substr(8));
        fs.readFile('../client/'+escape(url_parts.pathname.substr(8)), function(err, data) {
         res.end(data);
        });
    } 

    else if(url_parts.pathname.substr(0, 8) == '/favicon') {
        // serving the favicon
        console.log('... serving favicon');
        fs.readFile('../client/img/favicon.ico', function(err, data) {
         res.end(data);
        });
    } 
    
    else if(url_parts.pathname.substr(0, 5) == '/poll') {
        // polling
        var count = url_parts.pathname.replace(/[^0-9]*/, '');
        console.log('... count = ' + count);
        if(messages.length > count) {
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
        var msg = unescape(url_parts.pathname.substr(5));
        console.log('... msg = ' + msg);
        messages.push(msg);
        while(clients.length > 0) {
            var client = clients.pop();
            client.end(JSON.stringify( {
                count: messages.length,
                append: msg+"\n"
            }));
        }
        res.end();
    }
}).listen(8080, 'localhost');
console.log('Server running.');
