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
    playerA: '',
    playerB: '',
    blackPlayer: '',
    whitePlayer: '',
    blackHasRoocked: '',
    whiteHasRoocked: '',
    currentGameTurn: '', // 'white' or 'black'
    

    handleDragOver: function(ev) {
        ev.preventDefault();
    },

    handleDragStart: function(ev) {
        ev.dataTransfer.setData("srcId",ev.target.id);
    },

    handleDrop: function(ev) {
        ev.preventDefault();
        var target = ev.target;
        var pieceSelector = $("#" + ev.dataTransfer.getData("srcId"));
        while(target.tagName != 'DIV'){
             target=target.parentNode;      // if we take a piece, chances are the user has dropped his own piece over another piece object
        }
        document.getElementById(target.id).classList.remove('overOk');
        var child = target.childNodes[0] || '';
        for(var i=0; i<target.childNodes.length; i++) {
            if (target.childNodes[i].tagName == 'IMG' && target.childNodes[i].id != pieceSelector.attr('id')) {
                var p = target.childNodes[i];
                console.log('piece taken : ' + p.title);
                CHESSBOARD.pieces[p.id].sqId = '';
                CHESSBOARD._move(p.id,p.id[0]+'Graveyard');
                break;
            }
        }
        CHESSBOARD._move(pieceSelector.attr('id'),target.id);
        CHESSBOARD.pieces[pieceSelector.attr('id')].sqId = target.id;
    },

    handleDragEnter: function(ev) {
        document.getElementById(ev.target.id).classList.add('overOk');
    },

    handleDragLeave: function(ev) {
        document.getElementById(ev.target.id).classList.remove('overOk');
    },

    _move: function(piece,destination) {
    // moves a piece "piece" from its current position to a target square "destination"
    // first the piece/img is moved, then it's appended to target square/div, and finally it's repositioned at 0:0 relatively to its new parent
            var pieceSelector = $("#" + piece);
            var destinationSelector = $("#" + destination);
            pieceSelector.animate({ top: "+=" + (destinationSelector.position().top - pieceSelector.position().top) +"px" , left : "+=" + (destinationSelector.position().left - pieceSelector.position().left) +"px" }, 
                        "slow", 
                        undefined, 
                        function () {
                            pieceSelector.prependTo(destinationSelector);
                            pieceSelector.css( { top : "0px", left : "0px"} );
                        }
                    );
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
                        src="img/transparent.png" \
                        alt="' + CHESSBOARD.pieces[piece].name + '" \
                        title="' + CHESSBOARD.pieces[piece].name + '" \
                        id="' + CHESSBOARD.pieces[piece].id + '" \
                        draggable="true" \
                        ondragstart="CHESSBOARD.handleDragStart(event)"> \
                  </img>';
               if (CHESSBOARD.pieces[piece].id[0] == 'w' && CHESSBOARD.pieces[piece].sqId == '' ) {   // piece is white and captured
                    wGraveyard.append(pieceRepresentation);
               } else if (CHESSBOARD.pieces[piece].id[0] == 'b' && CHESSBOARD.pieces[piece].sqId == '' ) {  // piece is black and captured
                    bGraveyard.append(pieceRepresentation);
               } else {
                    $('#' + CHESSBOARD.pieces[piece].sqId).append(pieceRepresentation);
               }
        }
    },

    _drawBoard:function() {
         var board = $('#chessBoard');
         for (var row in CHESSBOARD.chessBoardRows) {
            var htmlRow = '<div class="chessBoardRow">';
             for (var column in CHESSBOARD.chessBoardColumns) {
                htmlRow += '<div title="' + CHESSBOARD.chessBoardColumns[column] + CHESSBOARD.chessBoardRows[row] + '" \
                            id="sq' + CHESSBOARD.chessBoardColumns[column] + CHESSBOARD.chessBoardRows[row] +'" \
                            class="chessBoardSquare chessBoardSquare'+ ((parseInt(column)+parseInt(row))%2) +'" \
                            ondrop="CHESSBOARD.handleDrop(event)" \
                            ondragover="CHESSBOARD.handleDragOver(event)" \
                            ondragleave="CHESSBOARD.handleDragLeave(event)" \
                            ondragenter="CHESSBOARD.handleDragEnter(event)"></div>';
            }
            htmlRow += '</div>';
            board.append(htmlRow);
         }
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
        CHESSBOARD._drawBoard(); 
        CHESSBOARD._spawnPieces();
    },
    
    initChessBoard: function() {
        CHESSBOARD.pieces=[];
        $('#chessBoard').empty(); // remove all children (rows & colums & pieces)
        CHESSBOARD._drawBoard(); 
        CHESSBOARD._createPieces();
        CHESSBOARD._spawnPieces();
    }
}
