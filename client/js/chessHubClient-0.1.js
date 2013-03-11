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
	name: 'chessHubClient',
	version: 0.1,
    user: '',
    key:'',
    counter: 0,    
    //
    //  function : poll()
    //  private recursive function
    //
    poll: function() {
        console.log('polling ... ' + CHESSHUB.counter);
        $.getJSON('/poll/'+ CHESSHUB.counter, function(response) {
            CHESSHUB.counter = response.count;
            if($.isArray(response.append)) { 
                response.append.forEach(function(message) { addMessage(message); });
            } else {
                addMessage(response.append);
            }
            CHESSHUB.poll();
        });
    },
    //
    //  function : listen(context, channel)
    //  
    //
    listen: function(context, channel) {
        this.poll();
    },
    //
    //  function : connect(user, successCallBack, errorCallBack)
    //  
    //
    connect: function(user, successCallBack, errorCallBack) {
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
    //
    //  function : sendMessage(context, text, successCallBack, errorCallBack)
    //  
    //
    sendMessage: function (context, text, successCallBack, errorCallBack) {
        var data = { user: context.user, msg: text } ;
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
