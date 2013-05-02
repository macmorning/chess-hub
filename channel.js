// Channel object definition
/*
*    Copyright (C) 2013
*	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Channel = function(name,id) {
    this.name = name;
    this.open = true; 
    this.id = id || name;
    this.users= {};
    this.messages = [];
    this.playerA= '';
    this.playerB= '';
    this.whitePlayer= '';
    this.blackPlayer= '';
    this.gameLevel= '';
    this.gameAcceptHigher= false;
    this.gameAcceptLower= false;
    this.gameTimer = 0;
    this.gameStarted = false;
};

Channel.prototype = {
    name: '',               // displayed name of the channel (char)
    open: true,            // is the channel open for watchers ? (true or false)   (not implemented yet)
    id: '',                 // id of the channel (char)
    users: {},              // current users    
    messages: [],           // list of messages
    playerA: '',            // username of the game creator
    playerB: '',            // username of the game joiner
    whitePlayer: '',
    blackPlayer: '',
    gameLevel: '',          // level of the game, [0,6]
    gameAcceptHigher: false,// allow player B to join even if his level is more than 1 level higher than the game level
    gameAcceptLower: false, // allow player B to join even if his level is more than 1 level lower than the game level
    gameTimer: 0,           // game timer, in minutes; 0 = none
    gameStarted: false,

    switchOpen: function(bool) {
            if(bool === true) {
                this.open = true;
            } else if (bool === false) {
                this.open = false;
            }
        },

    addUser: function(user) {
            if(user && !this.users[user]) {
                this.users[user] = {lastActivity: new Date()};
                return true;
            }
            return false;
        },

    removeUser: function(user) {
            if(!user) {
                return false;
            }
            if(this.playerA === user) {
                this.playerA = '';
            } else if (this.playerB === user) {
                this.playerB = '';
            }
            if (this.blackPlayer === user || this.whitePlayer === user) {        // the user was a seated player, close the game
                this.switchOpen(false);
            }
            if(this.users[user] ) {
                delete this.users[user];
            }
            return true;
        },

    startGame: function() {
            if(this.playerA && this.playerB) {
                this.gameStarted = true;
                return true;
            }
            return false;
        },

    addMessage: function(message) {
            this.messages.push({time:message.time,user:message.user,msg:message.msg,category:message.category,to:message.to});
        }
};


module.exports = Channel;
