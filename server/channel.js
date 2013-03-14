// Channel object definition

function Channel(name,id) {
    var name = name;            // displayed name of the channel (char)
    var open = false;           // is the channel open for watchers ? (true or false)
    var id = id || name;        // id of the channel (char)

}

Channel.prototype.switchOpen = function(bool) {
    if(bool == true) {
        this.open = true;
    } else if (bool == false) {
        this.open = false;
    }
}

module.exports = Channel;
