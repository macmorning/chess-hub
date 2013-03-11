/*
*    Copyright (C) 2013
*	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
;CHESSHUB = {
	name: 'CHESSHUB',
    user: window.location.href.substr(window.location.href.indexOf("=")+1),
    poll: function() {
        var counter = 0;
        $.getJSON('/poll/'+counter, function(response) {
            counter = response.count;
            if($.isArray(response.append)) { 
                response.append.forEach(function(message) { this.addMessage(message); });
            } else {
                this.addMessage(response.append);
            }
            this.poll();
        });
    },
    connect: function(user,successCallBack,errorCallBack) {
            var data = { user: user } ;
            $.ajax({
                type: 'POST',
                url : '/connect',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(data),
                success: function (response) { successCallBack(response);},
                error: errorCallBack()
             });
    },
    addMessage: function (message) {
        // adds a message to the chat_output div of the current page
        var output = $('#chat_output');
        console.log(message);
        if (message.category == "chat_sys") {
            output.html(
                output.html()
                + '<p class="chat_sys">'
                + message.user + " > "
                + message.msg
                + '</p>' );
        } else {
            output.html(
                output.html()
                + '<p class="'
                + message.category
                + '"><span class="chat_time">'
                + message.time
                + '</span><span class="chat_user">'
                + message.user + " > "
                + '</span><span class="chat_msg">'
                + message.msg
                + '</span></p>' );
        }
    },
    sendMessage: function (text) {
        if (!text) return;
        var data = { user: user, msg: text } ;
        var output = $('#chat_output');
        $.ajax({
            type: 'POST',
            url : '/msg',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function() {$('#input').val('');},
            error: function() { output.text(output.text() + "Error connecting you to the server :(\n"); }
         });
    }
}