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

    handleDragOver: function(ev) {
        ev.preventDefault();
    },

    handleDragStart: function(ev) {
        ev.dataTransfer.setData("srcId",ev.target.id);
    },

    handleDrop: function(ev) {
        ev.preventDefault();
        var target = ev.target;
        while(target.tagName != 'TD'){
             target=target.parentNode;
        }
        console.log('target square : ' + target.title);
        document.getElementById(target.id).classList.remove('overOk');
        var child = target.childNodes[0] || '';
        for(var i=0; i<target.childNodes.length; i++) {
            if (target.childNodes[i].tagName == 'IMG') {
                var p = target.childNodes[i];
                console.log('piece taken : ' + p.title);
                document.getElementById(p.id[0]+'Graveyard').appendChild(p);
                break;
            }
        }
        target.appendChild(document.getElementById(ev.dataTransfer.getData("srcId")));
    },

    handleDragEnter: function(ev) {
        document.getElementById(ev.target.id).classList.add('overOk');
    },

    handleDragLeave: function(ev)
    {
        document.getElementById(ev.target.id).classList.remove('overOk');
    },
    
    _createPieces: function() {
        for (var c in CHESSBOARD.colors) {
            CHESSBOARD.pieces[c+'king'] = {
                    id: c+'king',
                    order: 0,
                    name : CHESSBOARD.colors[c] + ' king',
                    class : c + 'king',
                    initx : 5,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'queen'] = {
                    id: c+'queen',
                    order: 1,
                    name : CHESSBOARD.colors[c] + ' queen',
                    class : c + 'queen',
                    initx : 4,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'rooka'] = {
                    id: c+'rooka',
                    order: 2,
                    name : CHESSBOARD.colors[c] + ' rook (a)',
                    class : c + 'rook',
                    initx : 1,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'rookh'] = {
                    id: c+'rookh',
                    order: 3,
                    name : CHESSBOARD.colors[c] + ' rook (h)',
                    class : c + 'rook',
                    initx : 8,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'knightb'] = {
                    id: c+'knightb',
                    order: 4,
                    name : CHESSBOARD.colors[c] + ' knight (b)',
                    class : c + 'knight',
                    initx : 2,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'knightg'] = {
                    id: c+'knightg',
                    order: 2,
                    name : CHESSBOARD.colors[c] + ' knight (g)',
                    class : c + 'knight',
                    initx : 7,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'bishopc'] = {
                    id: c+'bishopc',
                    order: 6,
                    name : CHESSBOARD.colors[c] + ' bishop (c)',
                    class : c + 'bishop',
                    initx : 3,
                    inity : (c=="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'bishopf'] = {
                    id: c+'bishopf',
                    order: 7,
                    name : CHESSBOARD.colors[c] + ' bishop (f)',
                    class : c + 'bishop',
                    initx : 6,
                    inity : (c=="w"?1:8)
            };
            for (var i in CHESSBOARD.chessBoardColumns) {
                    CHESSBOARD.pieces[c + 'pawn' + CHESSBOARD.chessBoardColumns[i]] = {
                            id: c + 'pawn' + CHESSBOARD.chessBoardColumns[i],
                            order: 7+i,
                            name: CHESSBOARD.colors[c] + ' pawn (' + CHESSBOARD.chessBoardColumns[i] + ')',
                            class: c + 'pawn',
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
               if (CHESSBOARD.pieces[piece].id[0] == 'w') {
                    var graveyard = wGraveyard;
               } else {
                    var graveyard = bGraveyard;
               }
               graveyard.append('<img \
                        class="piece '+ CHESSBOARD.pieces[piece].class +'" \
                        src="img/transparent.png" \
                        alt="' + CHESSBOARD.pieces[piece].name + '" \
                        title="' + CHESSBOARD.pieces[piece].name + '" \
                        id="' + CHESSBOARD.pieces[piece].id + '" \
                        draggable="true" \
                        ondragstart="CHESSBOARD.handleDragStart(event)"> \
                  </img>');
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
    initChessBoard: function() {
        CHESSBOARD.pieces=[];
        CHESSBOARD._createPieces();
        CHESSBOARD._spawnPieces();
        $('#chessBoard').empty(); // remove all children (rows & colums & pieces)
        CHESSBOARD._drawBoard(); 
        for (var piece in CHESSBOARD.pieces) {
            try {
                document.getElementById('sq' + CHESSBOARD.chessBoardColumns[CHESSBOARD.pieces[piece].initx] + CHESSBOARD.pieces[piece].inity).appendChild(document.getElementById(CHESSBOARD.pieces[piece].id));
            } catch(err) { console.log('Error : sq' + CHESSBOARD.pieces[piece].initx + CHESSBOARD.pieces[piece].inity + ' was not found') };
        }
    }
}
