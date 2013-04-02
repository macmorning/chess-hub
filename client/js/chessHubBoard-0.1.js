/*
*    Copyright (C) 2013
*	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
;CHESSBOARD = {
    chessBoardColumns: {1:'a', 2:'b', 3:'c', 4:'d', 5:'e', 6:'f', 7:'g', 8:'h'},
    chessBoardRows: [8, 7, 6, 5, 4, 3, 2, 1],
    colors: {'w':'white','b':'black'},
    pieces: [],
    gameID: '',
    selectedPiece: '',      // selector for the piece held by the user
    playerA: '',            // playerA username
    playerB: '',            // playerB username
    blackPlayer: '',        // blackPlayer username
    blackCanCastleKingSide: true,
    blackCanCastleQueenSide: true,
    whitePlayer: '',        // whitePlayer username
    whiteCanCastleKingSide: true,
    whiteCanCastleQueenSide: true,
    currentGameTurn: '', // 'white' or 'black'

    mouseDownHandler: function(ev) {            // using a mouse down event here : it's more user friendly than drag&drop when you are using a touch-enabled device
        ev.stopPropagation();   // stop propagation : we don't want the click event to bubble
        
        // user is not holding a piece yet and is clicking on one
        if (ev.target.tagName == 'IMG' && !CHESSBOARD.selectedPiece) {
            CHESSBOARD.selectedPiece = $("#" + ev.target.id);
            $("#"+CHESSBOARD.pieces[ev.target.id].sqId).addClass("selected");
        } 
        
        // user is holding a piece and is selecting another one, of the same color
        else if(ev.target.tagName == 'IMG'
                    && CHESSBOARD.selectedPiece 
                    && CHESSBOARD.selectedPiece.attr('id') != ev.target.id
                    && CHESSBOARD.selectedPiece.attr('id')[0] == ev.target.id[0]) {     
            $("#"+CHESSBOARD.pieces[CHESSBOARD.selectedPiece.attr('id')].sqId).removeClass("selected");
            CHESSBOARD.selectedPiece = $("#" + ev.target.id);
            $("#"+CHESSBOARD.pieces[ev.target.id].sqId).addClass("selected");
        } 
        
        // user is holding a piece and is selecting the same piece again
        else if(ev.target.tagName == 'IMG'
                    && CHESSBOARD.selectedPiece 
                    && CHESSBOARD.selectedPiece.attr('id') == ev.target.id) {
            $("#"+CHESSBOARD.pieces[CHESSBOARD.selectedPiece.attr('id')].sqId).removeClass("selected");
            CHESSBOARD.selectedPiece = '';
        } 
        
        // user is holding a piece and is clicking on a square or a piece of different color
        else if((ev.target.tagName == 'DIV' || ev.target.tagName == 'IMG' && CHESSBOARD.selectedPiece.attr('id')[0] != ev.target.id[0] && CHESSBOARD.pieces[ev.target.id].sqId != '') 
                            && CHESSBOARD.selectedPiece) {
                    var target = ev.target;
                    while(target.tagName != 'DIV'){     // if the target was not a DIV, go up in the DOM to find the first DIV
                        target=target.parentNode;
                    }
                    for(var i=0; i<target.childNodes.length; i++) {
                        if (target.childNodes[i].tagName == 'IMG' && target.childNodes[i].id != CHESSBOARD.selectedPiece.attr('id')) {
                            var p = target.childNodes[i];
                            console.log('piece taken : ' + p.title);
                            var pieceSelector = $('#'+p.id);
                            var destinationSelector = $('#'+p.id[0]+'Graveyard');
                            CHESSBOARD.move(pieceSelector,destinationSelector);
                            CHESSHUB.sendMessage(pieceSelector.attr('id') + "-" + destinationSelector.attr('id'),
                                 CONTEXT.currentGameID,
                                 'game',
                                 function() {},
                                 function() {}
                                 );
                            break;
                        }
                    }
                    $("#"+CHESSBOARD.pieces[CHESSBOARD.selectedPiece.attr('id')].sqId).removeClass("selected");
                    CHESSBOARD.move(CHESSBOARD.selectedPiece,$('#' + target.id));
                    CHESSHUB.sendMessage(CHESSBOARD.selectedPiece.attr('id') + "-" + target.id,
                         CONTEXT.currentGameID,
                         'game',
                         function() {},
                         function() {}
                         );
                    CHESSBOARD.selectedPiece='';
        } 
        
        // unexpected click event
        else {
            console.log('Unhandled case : ' + ev.target.id);
        }
    },
    
    move: function(pieceSelector,destinationSelector) {
    // moves a piece "piece" from its current position to a target square "destination"
    // first the piece/img is moved, then it's appended to target square/div, and finally it's repositioned at 0:0 relatively to its new parent
            var marginLeft = destinationSelector.width() * 0.05;  // change this if you change the width of the pieces in chessboard.css
            pieceSelector.animate({ top: "+=" + (destinationSelector.position().top - pieceSelector.position().top) +"px" , left : "+=" + (destinationSelector.position().left - pieceSelector.position().left + marginLeft) +"px" }, 
                        "slow", 
                        undefined, 
                        function () {
                            pieceSelector.prependTo(destinationSelector);
                            pieceSelector.css( { top : "0px", left : "0px"} );
                        }
                    );
            CHESSBOARD.pieces[pieceSelector.attr('id')].sqId = destinationSelector.attr('id');
    },
        
    _createPieces: function() {
        for (var c in CHESSBOARD.colors) {
            CHESSBOARD.pieces[c+'king'] = {
                    id: c+'king',
                    order: 0,
                    name : CHESSBOARD.colors[c] + ' king',
                    class : c + 'king',
                    sqId : 'sq' + 'e' + (c=="w"?1:8),
                    initx : 5,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'queen'] = {
                    id: c+'queen',
                    order: 1,
                    name : CHESSBOARD.colors[c] + ' queen',
                    class : c + 'queen',
                    sqId : 'sq' + 'd' + (c=="w"?1:8),
                    initx : 4,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'rooka'] = {
                    id: c+'rooka',
                    order: 2,
                    name : CHESSBOARD.colors[c] + ' rook (a)',
                    class : c + 'rook',
                    sqId : 'sq' + 'a' + (c=="w"?1:8),
                    initx : 1,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'rookh'] = {
                    id: c+'rookh',
                    order: 3,
                    name : CHESSBOARD.colors[c] + ' rook (h)',
                    class : c + 'rook',
                    sqId : 'sq' + 'h' + (c=="w"?1:8),
                    initx : 8,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'knightb'] = {
                    id: c+'knightb',
                    order: 4,
                    name : CHESSBOARD.colors[c] + ' knight (b)',
                    class : c + 'knight',
                    sqId : 'sq' + 'b' + (c=="w"?1:8),
                    initx : 2,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'knightg'] = {
                    id: c+'knightg',
                    order: 2,
                    name : CHESSBOARD.colors[c] + ' knight (g)',
                    class : c + 'knight',
                    sqId : 'sq' + 'g' + (c=="w"?1:8),
                    initx : 7,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'bishopc'] = {
                    id: c+'bishopc',
                    order: 6,
                    name : CHESSBOARD.colors[c] + ' bishop (c)',
                    class : c + 'bishop',
                    sqId : 'sq' + 'c' + (c=="w"?1:8),
                    initx : 3,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'bishopf'] = {
                    id: c+'bishopf',
                    order: 7,
                    name : CHESSBOARD.colors[c] + ' bishop (f)',
                    class : c + 'bishop',
                    sqId : 'sq' + 'f' + (c=="w"?1:8),
                    initx : 6,
                    inity : (c=="w"?1:8)
            };
            for (var i in CHESSBOARD.chessBoardColumns) {
                    CHESSBOARD.pieces[c + 'pawn' + CHESSBOARD.chessBoardColumns[i]] = {
                            id: c + 'pawn' + CHESSBOARD.chessBoardColumns[i],
                            order: 7+i,
                            name: CHESSBOARD.colors[c] + ' pawn (' + CHESSBOARD.chessBoardColumns[i] + ')',
                            class: c + 'pawn',
                            sqId : 'sq' + CHESSBOARD.chessBoardColumns[i] + (c=="w"?2:7),
                            initx : i,
                            inity : (c=="w"?2:7)
                    };
            };
        }
    },
    _spawnPieces:function() {
        var bGraveyard = $('#bGraveyard');
        var wGraveyard = $('#wGraveyard');
        for (var piece in CHESSBOARD.pieces) {
               var pieceRepresentation = '<img \
                        class="piece '+ CHESSBOARD.pieces[piece].class +'" \
                        src="/client/img/transparent.png" \
                        alt="' + CHESSBOARD.pieces[piece].name + '" \
                        title="' + CHESSBOARD.pieces[piece].name + '" \
                        id="' + CHESSBOARD.pieces[piece].id + '"> \
                  </img>';
               if (CHESSBOARD.pieces[piece].id[0] == 'w' && CHESSBOARD.pieces[piece].sqId == '' ) {   // piece is white and captured
                    wGraveyard.append(pieceRepresentation);
               } else if (CHESSBOARD.pieces[piece].id[0] == 'b' && CHESSBOARD.pieces[piece].sqId == '' ) {  // piece is black and captured
                    bGraveyard.append(pieceRepresentation);
               } else {
                    $('#' + CHESSBOARD.pieces[piece].sqId).append(pieceRepresentation);
               }
        }
        $(".piece").bind('vmousedown',function(event) { CHESSBOARD.mouseDownHandler(event); })  // add the vmousedown (jQuery Mobile) event to all pieces
            .on('dragstart', function(event) { event.preventDefault(); });                      // prevent dragging the image
    },

    _drawBoard:function() {
         var board = $('#chessBoard');
         for (var row in CHESSBOARD.chessBoardRows) {
            var htmlRow = '<div class="chessBoardRow">';
             for (var column in CHESSBOARD.chessBoardColumns) {
                htmlRow += '<div title="' + CHESSBOARD.chessBoardColumns[column] + CHESSBOARD.chessBoardRows[row] + '" \
                            id="sq' + CHESSBOARD.chessBoardColumns[column] + CHESSBOARD.chessBoardRows[row] +'" \
                            class="chessBoardSquare chessBoardSquare'+ ((parseInt(column)+parseInt(row))%2) +'"></div>';
            }
            htmlRow += '</div>';
            board.append(htmlRow);
         }
         $(".chessBoardSquare").bind('vmousedown',function(event) { CHESSBOARD.mouseDownHandler(event); });
    },
    
    flip: function() {
    // inverses the board without reinitializing it
        var tmpchessBoardColumns = {1:CHESSBOARD.chessBoardColumns[8], 
                                   2:CHESSBOARD.chessBoardColumns[7],
                                   3:CHESSBOARD.chessBoardColumns[6], 
                                   4:CHESSBOARD.chessBoardColumns[5], 
                                   5:CHESSBOARD.chessBoardColumns[4], 
                                   6:CHESSBOARD.chessBoardColumns[3], 
                                   7:CHESSBOARD.chessBoardColumns[2], 
                                   8:CHESSBOARD.chessBoardColumns[1]};
        CHESSBOARD.chessBoardColumns = tmpchessBoardColumns;
        CHESSBOARD.chessBoardRows.reverse();
        $('#chessBoard').empty(); // remove all children (rows & colums & pieces)
        $('#wGraveyard').empty();
        $('#bGraveyard').empty();
        CHESSBOARD._drawBoard(); 
        CHESSBOARD._spawnPieces();
    },
    
    initChessBoard: function() {
        CHESSBOARD.pieces=[];
        $('#chessBoard').empty(); // remove all children (rows & colums & pieces)
        $('#wGraveyard').empty();
        $('#bGraveyard').empty();
        CHESSBOARD._drawBoard(); 
        CHESSBOARD._createPieces();
        CHESSBOARD._spawnPieces();
    }
}
