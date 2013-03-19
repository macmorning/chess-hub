// Channel object definition
/*
*    Copyright (C) 2013
*	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Channel = function(name,id) {
    this.name = name;
    this.open = false; 
    this.id = id || name;
};

Channel.prototype = {
    name: '',               // displayed name of the channel (char)
    open: false,            // is the channel open for watchers ? (true or false)
    id: '',                 // id of the channel (char)
    users: [],              // current users    
    messages: [],           // list of messages
    clients: [],            // list of clients currently long-polling the channel
    playerA: '',            // username of the game creator
    playerB: '',            // username of the game joiner
    gameLevel: '',          // level of the game, [0,6]
    gameAcceptUpper: false, // allow player B to join even if his level is more than 1 level higher than the game level
    gameAcceptLower: false, // allow player B to join even if his level is more than 1 level lower than the game level
    switchOpen: function(bool) {
            if(bool === true) {
                this.open = true;
            } else if (bool === false) {
                this.open = false;
            }
        },
    addUser: function(user) {
            if(user && this.users.indexOf(user) < 0) {
                this.users.push(user);
                return true;
            }
            return false;
        },
    removeUser: function(user) {
            if(user && this.users.indexOf(user) >= 0) {
                this.users.splice(this.users.indexOf(user),1);
                return true;
            }
            return false;
        }
};


module.exports = Channel;
