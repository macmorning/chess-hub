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
 
CHESSHUB = {
	name: 'chessHubClient', // client name
	version: '0.1',         // client lib version
    user: '',               // user name
    key:'',                 // unique key provided at login time
    channels:[],            // list of polled channels; each channel is an object : { counter: last message count, name : display name, history: messages history }
    ajaxPoll: {},         // references the current polling ajax call
    ajaxSearchGame: {},     // references the current search game ajax call

    //
    //  function : init()
    //  initialize the CHESSHUB namespace
    //
    init: function() {
        if(CHESSHUB.user) {
            CHESSHUB.disconnect(function(){
                    // nothing to do
                },
                function() {
                    //nothing to do
                } );
        }
        CHESSHUB._abortAjaxCalls();
        CHESSHUB.user = '';
        CHESSHUB.key = '';
        CHESSHUB.channels = [];
    },

    //
    //  private function : _stopPoll()
    //  attempts to stop the current ajaxPoll
    //
    _abortAjaxCalls: function() {
        try { CHESSHUB.ajaxPoll.abort(); }  // try to abort latest ajax polling request
            catch(err) { }     // if no polling has to be aborted
        try { CHESSHUB.ajaxSearchGame.abort(); }  // try to abort latest ajax polling request
            catch(err) { }     // if no polling has to be aborted
    },

    //
    //  private function : _poll()
    //  recursive long polling function
    //
    _poll: function(channel,newMessageCallBack) {
        //console.log(CHESSHUB.channels[channel]);

        if(!CHESSHUB.channels[channel] || CHESSHUB.channels[channel].counter.isNaN)
        {
            return false;
        }
        var data = { user: CHESSHUB.user, key: CHESSHUB.key, counter: CHESSHUB.channels[channel].counter, channel: channel } ;
        CHESSHUB.ajaxPoll = $.ajax({
            type: 'POST',
            url : '/poll',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function (response) {              // jquery automatically parses the json answer
                if (isNaN(response.counter)) {
                    console.log('CHESSHUB._poll : error - unexpected answer');
                } else {
                    CHESSHUB.channels[channel].counter = response.counter;
                }
                if($.isArray(response.append)) { 
                    //console.log(response.append);
                    response.append.forEach(function(message) { newMessageCallBack(message,response.newMsg,response.whiteTimer,response.blackTimer,response.counter); });
                } else {
                    //console.log('string : ' + response.append);
                    newMessageCallBack(response.append,response.newMsg,response.whiteTimer,response.blackTimer,response.counter);
                }
                CHESSHUB._poll(channel,newMessageCallBack);
            },
            error: function(data,status,error) {
                    // the error event can be triggered because the node server is down (status = error)
                    // or if the request is aborted (status = abort)
                    console.log('CHESSHUB._poll : error - ' + status);
                    console.log(error);
                    if (error !== 'Bad Request') {
                        setTimeout(function() {CHESSHUB._poll(channel,newMessageCallBack);},10000); // retry after 10 seconds
                    }
            }
        });
    },

    //
    //  function : listUsers(channel)
    //  queries the server for the users list for the specified channel
    //
    listUsers: function(channel) {
        console.log('CHESSHUB.listUsers'); // TODO: everything ^^;
    },

    //
    //  function : searchGame(playerLevel,playerAcceptLower,playerAcceptHigher)
    //  asks for a game
    //
    searchGame: function(playerLevel,playerAcceptLower,playerAcceptHigher,playerTimerPref,createFlag,successCallBack,errorCallBack) {
        var data = { user: CHESSHUB.user, key: CHESSHUB.key, playerLevel: playerLevel, playerAcceptLower: playerAcceptLower, playerAcceptHigher: playerAcceptHigher, playerTimerPref: playerTimerPref, createFlag : createFlag } ;
        CHESSHUB.ajaxSearchGame = $.ajax({
            type: 'POST',
            url : '/searchGame',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function (response) {              // jquery automatically parses the json answer
                    successCallBack(response);
            },
            error: function(data,status,error) {
                    // the error event can be triggered because the node server is down (status = error)
                    // or if the request is aborted (status = abort)
                    console.log('CHESSHUB.searchGame : error - ' + status);
                    console.log(error);
                    errorCallBack();
            }
        });
    },

    //
    //  function : listen(channel)
    //  starts polling for the specified channel
    //
    listen: function(channel,newMessageCallBack) {
        CHESSHUB.channels[channel] = { counter : 0, name : channel, history : [] };
        if(!newMessageCallBack || Object.getPrototypeOf(newMessageCallBack) !== Function.prototype) { 
            console.log('listen : no handler provided for message');
            newMessageCallBack = function(message) { 
                console.log('listen : no handler provided for message');
            };
        }
        this._poll(channel,newMessageCallBack);
    },

    //
    //  function : leave(channel)
    //  stops polling for the specified channel
    //
    leave: function(channel) {
        console.log('leaving channel ' + channel);
        CHESSHUB._abortAjaxCalls();
        CHESSHUB.channels[channel] = {};
        var data = { user: CHESSHUB.user, key: CHESSHUB.key, gameId: channel } ;
        $.ajax({
            type: 'POST',
            url : '/leave',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            error: function(data,status,error) {
                    console.log('CHESSHUB.leave error - ' + status);
                    console.log(error);
                }
         });
    },

    //
    //  function : connect(user, successCallBack, errorCallBack)
    //  connects a user to the chesshub server
    //
    connect: function(user, key, successCallBack, errorCallBack) {
            CHESSHUB.init();
            var data = { user: user, key: key, clientLib: CHESSHUB.name, clientVersion: CHESSHUB.version } ;
            $.ajax({
                type: 'POST',
                url : '/connect',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(data),
                success: function (response) { 
                        if (response.returncode === 'ok') {
                            CHESSHUB.user = response.user;
                            CHESSHUB.key = response.key;
                        }
                        successCallBack(response);
                    },
                error: function(data,status,error) {
                        console.log('CHESSHUB.connect error - ' + status);
                        console.log(error);
                        errorCallBack();
                    }
             });
    },

    //
    //  function : disconnect()
    //  disconnects a user from to the chesshub server
    //
    disconnect: function() {
            if (!CHESSHUB.user) {
                return false;
            }
            var data = { user: CHESSHUB.user, key: CHESSHUB.key } ;
            CHESSHUB.channels = [];
            $.ajax({
                type: 'POST',
                url : '/disconnect',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(data),
                success: function () { },
                error: function(data,status,error) {
                        console.log('CHESSHUB.disconnect error - ' + status);
                        console.log(error);
                    }
             });
    },
 
    //
    //  function : sendMessage(text, channel, category, successCallBack, errorCallBack)
    //  
    //
    sendMessage: function (text, channel, category, successCallBack, errorCallBack) {
        if(!CHESSHUB.user) {
            console.log('CHESSHUB.sendMessage error - Not connected');
            return;
        }
        if(!channel) { channel = 'MAIN';}
        if(!category) { category = 'chat_msg';}
        var data = { user: CHESSHUB.user, channel: channel, key: CHESSHUB.key, msg: text, category: category } ;
        $.ajax({
            type: 'POST',
            url : '/msg',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function() { successCallBack(); },
            error: function(data,status,error) { 
                console.log('CHESSHUB.sendMessage error - ' + status);
                console.log(error);
                errorCallBack(); 
            }
         });
    },

    //
    //  function : getStats(successCallBack, errorCallBack)
    //  
    //
    getStats: function (successCallBack, errorCallBack) {
        var data = { user: CHESSHUB.user,key: CHESSHUB.key } ;
        $.ajax({
            type: 'POST',
            url : '/stats',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function(response) { successCallBack(response); },
            error: function(data,status,error) { 
                console.log('CHESSHUB.getStats error - ' + status);
                console.log(error);
                errorCallBack(); 
            }
         });
    },

    //
    //  function : joinGame(gameId,successCallBack, errorCallBack)
    //  
    //
    joinGame: function (gameId, successCallBack, errorCallBack) {
        var data = { user: CHESSHUB.user, key: CHESSHUB.key, gameId: gameId} ;
        $.ajax({
            type: 'POST',
            url : '/getGame',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function(response) { successCallBack(response); },
            error: function(data,status,error) { 
                console.log('CHESSHUB.joinGame error - ' + status);
                console.log(error);
                errorCallBack(); 
            }
         });
    }
};
