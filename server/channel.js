// Channel object definition

function Channel(name,id) {
    var name = name;            // displayed name of the channel (char)
    var open = false;           // is the channel open for watchers ? (true or false)
    var id = id || name;        // id of the channel (char)
    var users = [];             // current users
}

Channel.prototype.switchOpen = function(bool) {
    if(bool == true) {
        this.open = true;
    } else if (bool == false) {
        this.open = false;
    }
}

Channel.prototype.addUser = function(user) {
    if(user && this.users.indexOf(user) < 0) {
        this.users.push(user);
        return true;
    }
    return false;
}

Channel.prototype.removeUser = function(user) {
    if(user && this.users.indexOf(user) >= 0) {
        this.users.splice(this.users.indexOf(user),1);
        return true;
    }
    return false;
}

module.exports = Channel;
