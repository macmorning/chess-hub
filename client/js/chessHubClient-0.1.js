/*
*    Copyright (C) 2013
*	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/*
*   
*
*
*/
;CHESSHUB = {
	name: 'chessHubClient', // client name
	version: '0.1',         // client lib version
    user: '',               // user name
    key:'',                 // unique key provided at login time
    channels:[],            // list of polled channels
    counter: 0,             // current polling counter
    ajaxCall: {},
    //
    //  function : addChannel()
    //  adds a channel to poll
    //
    stopPoll: function() {
        ajaxCall.abort();
    },
    //
    //  function : addChannel()
    //  adds a channel to poll
    //
    addChannel: function(channel) {
        if (channel && CHESSHUB.channels.indexOf(channel)<0) {
            CHESSHUB.channels.push(channel);
            console.log('list of channels : ' + CHESSHUB.channels);
        }
    },   
    //
    //  function : removeChannel()
    //  removes a channel to poll
    //
    removeChannel: function(channel) {
        if (channel && CHESSHUB.channels.indexOf(channel)>=0) {
            CHESSHUB.channels.splice(CHESSHUB.channels.indexOf(channel));
            console.log('list of channels : ' + CHESSHUB.channels);
        }
    },   
    //
    //  function : poll()
    //  private recursive function
    //
    poll: function() {
        console.log('polling ... ' + CHESSHUB.counter);
        var data = { user: CHESSHUB.user, key: CHESSHUB.key, counter: CHESSHUB.counter, channels: CHESSHUB.channels } ;
        ajaxCall = $.ajax({
            type: 'POST',
            url : '/poll',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function (response) {              // jquery automatically parses the json answer
                if (isNaN(response.counter)) {
                    console.log('poll error - unexpected answer');
                    console.log(response);
                } else {
                    CHESSHUB.counter = response.counter;
                }
                if($.isArray(response.append)) { 
                    response.append.forEach(function(message) { addMessage(message); });
                } else {
                    addMessage(response.append);
                }
                CHESSHUB.poll();
            },
            error: function(data,status,error) {
                    console.log('poll error - ' + status);
                    console.log(error);
                    if (status == 'error') {
                        setTimeout(function() {CHESSHUB.poll();},3000); // retry after 3 seconds
                    }
            }
        });
    },
    //
    //  function : listen(context, channel)
    //  
    //
    listen: function() {
        this.poll();
    },
    //
    //  function : connect(user, successCallBack, errorCallBack)
    //  
    //
    connect: function(user, successCallBack, errorCallBack) {
            var data = { user: user, clientLib: CHESSHUB.name, clientVersion: CHESSHUB.version } ;
            $.ajax({
                type: 'POST',
                url : '/connect',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(data),
                success: function (response) { 
                        if (response.returncode == 'ok') {
                            CHESSHUB.user = response.user;
                            CHESSHUB.key = response.key;
                        }
                        successCallBack(response);
                    },
                error: errorCallBack()
             });
    },
    //
    //  function : sendMessage(context, text, successCallBack, errorCallBack)
    //  
    //
    sendMessage: function (text, to, successCallBack, errorCallBack) {
        if(!CHESSHUB.user) {
            console.log('sendMessage error - Not connected');
            return;
        }
        var data = { user: CHESSHUB.user, to: to, key: CHESSHUB.key, msg: text } ;
        $.ajax({
            type: 'POST',
            url : '/msg',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function() { successCallBack(); },
            error: function(data,status,error) { 
                console.log('sendMessage error - ' + status);
                console.log(error);
                errorCallBack(); 
            }
         });
    }
}
