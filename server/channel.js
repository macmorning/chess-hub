// Channel object definition

var Channel = function(name,id) {
    this.name = name;
    this.open = false; 
    this.id = id || name;
};

Channel.prototype = {
    name: '',            // displayed name of the channel (char)
    open: false,           // is the channel open for watchers ? (true or false)
    id: '',        // id of the channel (char)
    users: [],             // current users    
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
