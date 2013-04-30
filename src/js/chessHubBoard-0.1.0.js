/*
*    Copyright (C) 2013
*	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var CHESSBOARD = {
    chessBoardColumns: {1:'a', 2:'b', 3:'c', 4:'d', 5:'e', 6:'f', 7:'g', 8:'h'},
    chessBoardRows: [8, 7, 6, 5, 4, 3, 2, 1],
    colors: {'w':'white','b':'black'},
    pieces: [],
    gameID: '',
    selectedPiece: '',              // selector for the piece held by the user
    playerA: '',                    // playerA username
    playerB: '',                    // playerB username
    blackPlayer: '',                // blackPlayer username
    blackCanCastleKingSide: true,
    blackCanCastleQueenSide: true,
    whitePlayer: '',                // whitePlayer username
    whiteCanCastleKingSide: true,
    whiteCanCastleQueenSide: true,
    currentGameTurn: '',            // 'w' or 'b'
    gameHistory: [],                // turns history
    chessBoard: { 11:'', 12:'', 13:'', 14:'', 15:'', 16:'', 17:'', 18:'', 
                    21:'', 22:'', 23:'', 24:'', 25:'', 26:'', 27:'', 28:'', 
                    31:'', 32:'', 33:'', 34:'', 35:'', 36:'', 37:'', 38:'', 
                    41:'', 42:'', 43:'', 44:'', 45:'', 46:'', 47:'', 48:'', 
                    51:'', 52:'', 53:'', 54:'', 55:'', 56:'', 57:'', 58:'', 
                    61:'', 62:'', 63:'', 64:'', 65:'', 66:'', 67:'', 68:'', 
                    71:'', 72:'', 73:'', 74:'', 75:'', 76:'', 77:'', 78:'', 
                    81:'', 82:'', 83:'', 84:'', 85:'', 86:'', 87:'', 88:'' },
    
    
    ///////////////////////////////
    // UTILITIES
    ///////////////////////////////
    numericColumns: {'a':10,'b':20,'c':30,'d':40,'e':50,'f':60,'g':70,'h':80},
    unnumericColumns: {1:"a",2:"b",3:"c",4:"d",5:"e",6:"f",7:"g",8:"h"},

	_numeric: function(id) {
	// returns a numeric value for the id (ex: "sqa1")
        var value = parseInt(CHESSBOARD.numericColumns[id[2]],10) + parseInt(id[3],10);
		return value;
	},
	
	_unnumeric: function(value)	{
	// returns the id of a square from its numeric value
        var textValue = value + "";
		return 'sq' + CHESSBOARD.unnumericColumns[textValue[0]] + textValue[1];
	},



    ///////////////////////////////
    // VIEW 
    ///////////////////////////////
    _markSquare: function(squareId,cssClass,bool) {
        if(bool) {
            try {
                if (squareId === 'ALL') {
                    $('.chessBoardSquare').addClass(cssClass); // JQUERY
                } else { 
                    $("#"+squareId).addClass(cssClass); // JQUERY
                }
            } catch(err) {
                console.log(squareId + ' cannot be marked as ' + cssClass);
                return false;
            }
            return true;
        } else {
            try {
                if (squareId === 'ALL') {
                    $('.chessBoardSquare').removeClass(cssClass); // JQUERY
                } else { 
                    $("#"+squareId).removeClass(cssClass);  // JQUERY
                }
            } catch(err) {
                console.log(squareId + ' cannot be unmarked as ' + cssClass);
                return false;
            }
            return true;
        }
    },

    move: function(pieceSelector,destinationSelector) {
    // moves a piece "piece" from its current position to a target square "destination"
    // first the piece/img is moved, then it's appended to target square/div, and finally it's repositioned at 0:0 relatively to its new parent
 
            // player moves his king or a rook, castling is now forbidden
            if (pieceSelector.attr('id') === 'wking' ) { 
                CHESSBOARD.whiteCanCastleKingSide = false;
                CHESSBOARD.whiteCanCastleQueenSide = false;
            } else if (pieceSelector.attr('id') === 'bking' ) {
                CHESSBOARD.blackCanCastleKingSide = false;
                CHESSBOARD.blackCanCastleQueenSide = false;
            } else if (pieceSelector.attr('id') === 'wrooka' ) {
                CHESSBOARD.whiteCanCastleQueenSide = false;
            } else if (pieceSelector.attr('id') === 'wrookh' ) {
                CHESSBOARD.whiteCanCastleKingSide = false;
            } else if (pieceSelector.attr('id') === 'brooka' ) {
                CHESSBOARD.blackCanCastleQueenSide = false;
            } else if (pieceSelector.attr('id') === 'brookh' ) {
                CHESSBOARD.blackCanCastleKingSide = false;
            }

            // reflect the move into the chessBoard array
            CHESSBOARD.chessBoard[CHESSBOARD._numeric(CHESSBOARD.pieces[pieceSelector.attr('id')].sqId)] = '';
            if (destinationSelector.attr('id')[0] === 's') { // it's a square, not a graveyard
                CHESSBOARD.chessBoard[CHESSBOARD._numeric(destinationSelector.attr('id'))] = CHESSBOARD.pieces[pieceSelector.attr('id')].id;
            }

            var marginLeft = destinationSelector.width() * 0.05;  // change this if you change the width of the pieces in chessboard.css
            // JQUERY
            pieceSelector.animate({ top: "+=" + (destinationSelector.position().top - pieceSelector.position().top) +"px" , left : "+=" + (destinationSelector.position().left - pieceSelector.position().left + marginLeft) +"px" }, 
                        "slow", 
                        undefined, 
                        function () {
                            pieceSelector.prependTo(destinationSelector);
                            pieceSelector.css( { top : "0px", left : "0px"} );
                        }
                    );
                                
            CHESSBOARD.pieces[pieceSelector.attr('id')].sqId = destinationSelector.attr('id');
            if(destinationSelector.attr('id') !== 'wGraveyard' && destinationSelector.attr('id') !== 'bGraveyard') {
                CHESSBOARD.gameHistory.push(pieceSelector.attr('id') + '-' + destinationSelector.attr('id'));
                CHESSBOARD.currentGameTurn=(CHESSBOARD.currentGameTurn === 'w' ? 'b' : 'w'); // switch game turn
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
        // JQUERY
        $('#chessBoard').empty(); // remove all children (rows & colums & pieces)
        $('#wGraveyard').empty();
        $('#bGraveyard').empty();
        CHESSBOARD._drawBoard(); 
        CHESSBOARD._spawnPieces();
    },
    

    ///////////////////////////////
    // CONTROLLER
    ///////////////////////////////

    mouseDownHandler: function(ev) {            // using a mouse down event here : it's more user friendly than drag&drop when you are using a touch-enabled device
        ev.stopPropagation();   // stop propagation : we don't want the click event to bubble

        // user is not holding a piece yet and is clicking on one, but the clicked piece is not the right color
        if (ev.target.tagName === 'IMG' && !CHESSBOARD.selectedPiece 
            && (ev.target.id[0] !== CHESSBOARD.currentGameTurn 
                || CHESSBOARD.pieces[ev.target.id].sqId === 'wGraveyard' || CHESSBOARD.pieces[ev.target.id].sqId === 'bGraveyard'
                || ev.target.id[0] === "w" && CHESSBOARD.whitePlayer !== CONTEXT.user  
                || ev.target.id[0] === "b" && CHESSBOARD.blackPlayer !== CONTEXT.user)) {
            return false;
        }
        
        // user is not holding a piece yet and is clicking on one
        if (ev.target.tagName === 'IMG' && !CHESSBOARD.selectedPiece) {
            CHESSBOARD.selectedPiece = $("#" + ev.target.id);   // JQUERY
            CHESSBOARD._markSquare(CHESSBOARD.pieces[ev.target.id].sqId,"selected",true);
        } 
        
        // user is holding a piece and is selecting another one, of the same color
        else if(ev.target.tagName === 'IMG' && CHESSBOARD.selectedPiece && CHESSBOARD.selectedPiece.attr('id') !== ev.target.id && CHESSBOARD.selectedPiece.attr('id')[0] === ev.target.id[0]) {     
            CHESSBOARD._markSquare(CHESSBOARD.pieces[CHESSBOARD.selectedPiece.attr('id')].sqId,"selected",false);
            CHESSBOARD.selectedPiece = $("#" + ev.target.id);   // JQUERY
            CHESSBOARD._markSquare(CHESSBOARD.pieces[ev.target.id].sqId,"selected",true);
        } 
        
        // user is holding a piece and is selecting the same piece again
        else if(ev.target.tagName === 'IMG' && CHESSBOARD.selectedPiece && CHESSBOARD.selectedPiece.attr('id') === ev.target.id) {
            CHESSBOARD._markSquare(CHESSBOARD.pieces[CHESSBOARD.selectedPiece.attr('id')].sqId,"selected",false);
            CHESSBOARD.selectedPiece = '';
        } 
        
        // user is holding a piece and is clicking on an empty square or a piece of different color
        else if((ev.target.tagName === 'DIV' || ev.target.tagName === 'IMG' && CHESSBOARD.selectedPiece.attr('id')[0] !== ev.target.id[0] && CHESSBOARD.pieces[ev.target.id].sqId !== '') && CHESSBOARD.selectedPiece) {
                    var target = ev.target;
                    while(target.tagName !== 'DIV'){     // if the target was not a DIV, go up in the DOM to find the first DIV
                        target=target.parentNode;
                    }
                    
                    var canMoveResult = CHESSBOARD._canMove(CHESSBOARD.selectedPiece.attr('id'),target.id);
                    
                    if (!canMoveResult) { 
                        // if held piece cannot be moved to target square, exit
                        return false;
                    }
                    if (CHESSBOARD._isCheck(CHESSBOARD.selectedPiece.attr('id'),target.id)) {
                        // is the current player's king in check if he moves this piece to this destination ? if so, reject the move.
                        return false;
                    }
                    var emptyFunction = function() {};

                    var targetPiece = CHESSBOARD.chessBoard[CHESSBOARD._numeric(target.id)];
                    if ( targetPiece !== '') {
                        var pieceSelector = $('#' + targetPiece);
                        var destinationSelector = $('#'+CHESSBOARD.pieces[targetPiece].id[0]+'Graveyard');
                        CHESSBOARD.move(pieceSelector,destinationSelector);
                        CHESSHUB.sendMessage("move-" + pieceSelector.attr('id') + "-" + destinationSelector.attr('id'),
                             CHESSBOARD.gameID,
                             'game',
                             emptyFunction,
                             emptyFunction
                             );
                    } 

                    CHESSBOARD._markSquare(CHESSBOARD.pieces[CHESSBOARD.selectedPiece.attr('id')].sqId,"selected",false);
                    CHESSBOARD.move(CHESSBOARD.selectedPiece,$('#' + target.id));   // JQUERY
                    CHESSBOARD._verifyCheck();
                    // send the move to the server
                    CHESSHUB.sendMessage('move-' + CHESSBOARD.selectedPiece.attr('id') + "-" + target.id,
                         CHESSBOARD.gameID,
                         'game',
                         emptyFunction,
                         emptyFunction
                         );
                    CHESSBOARD.selectedPiece='';
        } 
        
        // unexpected click event
        else {
            console.log('Unhandled case : ' + ev.target.id);
        }
    },
    
    
    _canMove: function(pieceId, destinationId, captureOnly) {
    // check if the selected piece can be moved to the destination
    // set captureOnly to true if only capture move is allowed (useful for pawns)
    // returns true if yes, false if no
        var operator = 0;
        var i = "";
        var targetPiece = CHESSBOARD.chessBoard[CHESSBOARD._numeric(destinationId)];
//                if (targetPiece === 'wking' || targetPiece === 'bking' ) {
//                    return false;
//                }

        var from = CHESSBOARD.pieces[pieceId].sqId;
		var numericFrom = parseInt(CHESSBOARD._numeric(from),10);
		var numericTo = parseInt(CHESSBOARD._numeric(destinationId),10); 
		var numericMove = numericTo - numericFrom;
		
//      We use numeric values for the squares to compute the pieces allowed moves
//		a1 = 11
//		b1 = 21
//		c2 = 32
//      For example, a white pawn can move forward, one case at a time, which means its move must be equal to 1 (a3 - a2 == 13 - 12 == 1),
//      except if has not moved yet, in which case its move can be 2, or if it's taking a black piece. Its numerical move will then be either 11 or -9
		
		
        switch(CHESSBOARD.pieces[pieceId].type) {
            case 'pawn':
                // simple or double move
                // ... for white pawns
                if (!captureOnly && pieceId[0] === "w" && (numericMove === 1 || numericMove === 2 && from[3] === "2")) {
                    if (targetPiece) {
                        return false;   // there is a piece here, but the pawn cannot take it this way
                    }						
                    if ( numericMove === 2 ) { // double move : check that there is not something blocking the way
                        if (CHESSBOARD.chessBoard[numericFrom + 1]) {
                            return false;
                        }
                    }
                    return true;
                }
                // ... for black pawns
                else if (!captureOnly && pieceId[0] === "b" && (numericMove === -1 || numericMove === -2 && from[3] === "7")) {
                    if (targetPiece) {
                        return false;   // there is a piece here, but the pawn cannot take it this way
                    }						
                    if ( numericMove === -2 ) { // double move : check that there is not something blocking the way
                        if (CHESSBOARD.chessBoard[numericFrom - 1]) {
                            return false;
                        }
                    }
                    return true;
                }
                // capturing a piece sideways
                else if ((pieceId[0] === "w" && (numericMove === 11 || numericMove === -9)) || (pieceId[0] === "b" && (numericMove === -11 || numericMove === 9))) {
                    console.log('canMove ' + pieceId + ' => ' + destinationId + ' ? targetPiece = ' + targetPiece); //TEST
                    if (targetPiece) {
                        console.log('canMove ... yes'); //TEST
                        return true;
                    }
                    return false;
                } else {
                    return false;
                }
                break;
			
			case "knight":
                // surprisingly, the knight's move is the easiest to test because it "jumps" to the target square
                if (numericMove === 21 
                    || numericMove === -21  
                    || numericMove === 19  
                    || numericMove === -19  
                    || numericMove === 12  
                    || numericMove === -12
                    || numericMove === 8
                    || numericMove === -8) {
                    return true;
                } else {
                    return false;
                }
                break;
                
            case "bishop":
                // is it heading in diagonal direction ?
                if ((numericMove%11 === 0 && numericMove > 0 && parseInt(from[3],10) < parseInt(destinationId[3],10) && from[2] < destinationId[2])
                    || (numericMove%11 === 0 && numericMove < 0 && parseInt(from[3],10) > parseInt(destinationId[3],10) && from[2] > destinationId[2])
                    || (numericMove%9 === 0 && numericMove > 0 && parseInt(from[3],10) > parseInt(destinationId[3],10) && from[2] < destinationId[2])
                    || (numericMove%9 === 0 && numericMove < 0 && parseInt(from[3],10) < parseInt(destinationId[3],10) && from[2] > destinationId[2])) {

                    // check there is no piece on the way
                    if(numericMove%11 === 0 && numericMove > 0) {
                        operator = 11;
                    } else if(numericMove%11 === 0 && numericMove < 0) {
                        operator = -11;
                    } else if(numericMove%9 === 0 && numericMove > 0) {
                        operator = 9;
                    } else if(numericMove%9 === 0 && numericMove < 0) {
                        operator = -9;
                    }
                    for (i = numericFrom+operator ; (i < numericTo && numericMove > 0) || (i > numericTo && numericMove < 0); i += operator) {
                        if (CHESSBOARD.chessBoard[i]) {
                            return false;
                        }
                    }  
                    return true;
                } else {
                    return false;
                }
                break;

			case "rook":
				if (from[2] === destinationId[2] 
					|| from[3] === destinationId[3] ) {
					if(from[2] === destinationId[2] && numericMove > 0) {
						operator = 1;
					} else if(from[2] === destinationId[2] && numericMove < 0) {
						operator = -1;
					} else if(from[3] === destinationId[3] && numericMove > 0) {
						operator = 10;
					} else if(from[3] === destinationId[3] && numericMove < 0) {
						operator = -10;
					}

					for (i = numericFrom+operator ; (i < numericTo && numericMove > 0) || (i > numericTo && numericMove < 0); i += operator) {
                        if (CHESSBOARD.chessBoard[i]) {
							return false;
						}
					}  
					return true;
				}
				break;

            case "queen":
                if ((numericMove%11 === 0 && numericMove > 0 && parseInt(from[3],10) < parseInt(destinationId[3],10) && from[2] < destinationId[2])
                || (numericMove%11 === 0 && numericMove < 0 && parseInt(from[3],10) > parseInt(destinationId[3],10) && from[2] > destinationId[2])
                || (numericMove%9 === 0 && numericMove > 0 && parseInt(from[3],10) > parseInt(destinationId[3],10) && from[2] < destinationId[2])
                || (numericMove%9 === 0 && numericMove < 0 && parseInt(from[3],10) < parseInt(destinationId[3],10) && from[2] > destinationId[2])
                || from[2] === destinationId[2] 
                || from[3] === destinationId[3]) {
                    if(numericMove%11 === 0 && numericMove > 0) {
                        operator = 11;
                    }
                    else if(numericMove%11 === 0 && numericMove < 0) {
                        operator = -11;
                    }
                    else if(numericMove%9 === 0 && numericMove > 0) {
                        operator = 9;
                    }
                    else if(numericMove%9 === 0 && numericMove < 0) {
                        operator = -9;
                    }
                    else if(from[2] === destinationId[2] && numericMove > 0) {
                        operator = 1;
                    }
                    else if(from[2] === destinationId[2] && numericMove < 0) {
                        operator = -1;
                    }
                    else if(from[3] === destinationId[3] && numericMove > 0) {
                        operator = 10;
                    }
                    else if(from[3] === destinationId[3] && numericMove < 0) {
                        operator = -10;
                    }

                    for (i = numericFrom+operator ; (i < numericTo && numericMove > 0) || (i > numericTo && numericMove < 0); i += operator) {
                        if (CHESSBOARD.chessBoard[i]) {
                            return false;
                        }
                    }  

                    return true;
                }
                break;

			case "king":
                operator = 0;
                if (numericMove === 1
                    || numericMove === -1
                    || numericMove === -11
                    || numericMove === 11
                    || numericMove === -9
                    || numericMove === 9
                    || numericMove === -10
                    || numericMove === 10) {

                    if (CHESSBOARD._isCheck(pieceId,destinationId)) {
                        return false;
                    }
                    return true;
                    
                } else if (CHESSBOARD._isCheck(pieceId,from) || CHESSBOARD._isCheck(pieceId,destinationId)) {
                    // the king cannot castle out of check, nor into check
                    return false; 
                } else if (numericMove === 20 && CHESSBOARD.whiteCanCastleKingSide && pieceId[0] === 'w') {
                    // white castling on the king size
                    operator = 10;
                } else if (numericMove === 20 && CHESSBOARD.blackCanCastleKingSide && pieceId[0] === 'b') {
                    // black castling on the king size
                    operator = 10;
                } else if (numericMove === -20 && CHESSBOARD.whiteCanCastleQueenSide && pieceId[0] === 'w') {
                    // white castling on the queen size
                    operator = -10;
                } else if (numericMove === -20 && CHESSBOARD.blackCanCastleQueenSide && pieceId[0] === 'b') {
                    // black castling on the queen size
                    operator = -10;
                }
                
                if (!operator) { return false; }
                
                for (i = numericFrom+operator ; (i <= numericTo && numericMove > 0) || (i >= numericTo && numericMove < 0); i += operator) {
                    if (CHESSBOARD.chessBoard[i]) {
                        return false;
                    }
                }
                return true;
        }
        return false;
    },

    _isCheck: function(pieceId,destinationId) {
        console.log('isCheck ' + pieceId + ' => ' + destinationId + ' ?');//TEST
        var color = pieceId[0];
        var result = false;
        var previousSqId = CHESSBOARD.pieces[pieceId].sqId;
        var previousDestinationSquareOccupant = CHESSBOARD.chessBoard[CHESSBOARD._numeric(destinationId)];
                    
        // simulate the move (shouldn't this use a copy of the arrays ?)
        CHESSBOARD.chessBoard[CHESSBOARD._numeric(CHESSBOARD.pieces[pieceId].sqId)] = '';
        CHESSBOARD.pieces[pieceId].sqId = destinationId;
        CHESSBOARD.chessBoard[CHESSBOARD._numeric(destinationId)] = pieceId;
        if (previousDestinationSquareOccupant) {
            CHESSBOARD.pieces[previousDestinationSquareOccupant].sqId = 'out';
        }

        if (pieceId === 'wking' || pieceId === 'bking') {
        // testing if a king is check
            for (var p in CHESSBOARD.pieces) {     // parse the pieces array
                // if the piece is a king, and on a square, and of a different color than the king && can capture the king
                // simulate the move (shouldn't this use a copy of the arrays ?)
                if (CHESSBOARD.pieces[p].type !== 'king' 
                        && CHESSBOARD.pieces[p].sqId[0] === 's'
                        && p[0] !== pieceId[0]
                        && CHESSBOARD._canMove(p,destinationId,true)) {
                    // the piece can capture the king
                    console.log(pieceId + ' checked at square ' + destinationId + ' by ' + p);
                    result = p;
                }
            }
        } else {
        // testing if moving the piece puts its king to check
            // test if it puts the king into check
            if (CHESSBOARD._isCheck(color+'king', CHESSBOARD.pieces[color+'king'].sqId)) {
                result = true;
            } else {
                result = false;
            }
        }

        // restore the arrays and return result
        if (previousDestinationSquareOccupant) {
            CHESSBOARD.pieces[previousDestinationSquareOccupant].sqId = destinationId;
        }
        CHESSBOARD.chessBoard[CHESSBOARD._numeric(destinationId)] = previousDestinationSquareOccupant;
        CHESSBOARD.pieces[pieceId].sqId = previousSqId;
        return result;
    },

    _verifyCheck: function() {
        var kings = ['bking','wking'];
        CHESSBOARD._markSquare('ALL','check',false);    // remove all check markers
        kings.forEach(function(king,index) {
            var p = CHESSBOARD._isCheck(king, CHESSBOARD.pieces[king].sqId);    // p is the "checker"
            if (p) {
                CHESSBOARD._markSquare(CHESSBOARD.pieces[king].sqId,'check',true);  // mark the king as checked
                CHESSBOARD._markSquare(CHESSBOARD.pieces[p].sqId,'check',true);     // mark the "checker" as ... checked :p
                CHESSBOARD.pieces[king].isCheck = true;
                console.log(king + ' is check');
            } else {
//                console.log(king + ' is NOT check');
                CHESSBOARD._markSquare(CHESSBOARD.pieces[king].sqId,'check',false);
                CHESSBOARD.pieces[king].isCheck = false;
            }
        });
        return false;
    },
                
    _createPieces: function() {
        for (var c in CHESSBOARD.colors) {
            CHESSBOARD.pieces[c+'king'] = {
                    id: c+'king',
                    type: 'king',
                    order: 0,
                    name : CHESSBOARD.colors[c] + ' king',
                    class : c + 'king',
                    sqId : 'sq' + 'e' + (c==="w"?1:8),
                    initx : 5,
                    inity : (c==="w"?1:8),
                    isCheck : false
            };
            CHESSBOARD.pieces[c + 'queen'] = {
                    id: c+'queen',
                    type: 'queen',
                    order: 1,
                    name : CHESSBOARD.colors[c] + ' queen',
                    class : c + 'queen',
                    sqId : 'sq' + 'd' + (c==="w"?1:8),
                    initx : 4,
                    inity : (c==="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'rooka'] = {
                    id: c+'rooka',
                    type: 'rook',
                    order: 2,
                    name : CHESSBOARD.colors[c] + ' rook (a)',
                    class : c + 'rook',
                    sqId : 'sq' + 'a' + (c==="w"?1:8),
                    initx : 1,
                    inity : (c==="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'rookh'] = {
                    id: c+'rookh',
                    type: 'rook',
                    order: 3,
                    name : CHESSBOARD.colors[c] + ' rook (h)',
                    class : c + 'rook',
                    sqId : 'sq' + 'h' + (c==="w"?1:8),
                    initx : 8,
                    inity : (c==="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'knightb'] = {
                    id: c+'knightb',
                    type: 'knight',
                    order: 4,
                    name : CHESSBOARD.colors[c] + ' knight (b)',
                    class : c + 'knight',
                    sqId : 'sq' + 'b' + (c==="w"?1:8),
                    initx : 2,
                    inity : (c==="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'knightg'] = {
                    id: c+'knightg',
                    type: 'knight',
                    order: 2,
                    name : CHESSBOARD.colors[c] + ' knight (g)',
                    class : c + 'knight',
                    sqId : 'sq' + 'g' + (c==="w"?1:8),
                    initx : 7,
                    inity : (c==="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'bishopc'] = {
                    id: c+'bishopc',
                    type: 'bishop',
                    order: 6,
                    name : CHESSBOARD.colors[c] + ' bishop (c)',
                    class : c + 'bishop',
                    sqId : 'sq' + 'c' + (c==="w"?1:8),
                    initx : 3,
                    inity : (c==="w"?1:8)
            };
            CHESSBOARD.pieces[c + 'bishopf'] = {
                    id: c+'bishopf',
                    type: 'bishop',
                    order: 7,
                    name : CHESSBOARD.colors[c] + ' bishop (f)',
                    class : c + 'bishop',
                    sqId : 'sq' + 'f' + (c==="w"?1:8),
                    initx : 6,
                    inity : (c==="w"?1:8)
            };
            for (var i in CHESSBOARD.chessBoardColumns) {
                    CHESSBOARD.pieces[c + 'pawn' + CHESSBOARD.chessBoardColumns[i]] = {
                            id: c + 'pawn' + CHESSBOARD.chessBoardColumns[i],
                            type: 'pawn',
                            order: 7+i,
                            name: CHESSBOARD.colors[c] + ' pawn (' + CHESSBOARD.chessBoardColumns[i] + ')',
                            class: c + 'pawn',
                            sqId : 'sq' + CHESSBOARD.chessBoardColumns[i] + (c==="w"?2:7),
                            initx : i,
                            inity : (c==="w"?2:7)
                    };
            }
        }

        // init chessBoard array
        CHESSBOARD.chessBoard = { 11:'', 12:'', 13:'', 14:'', 15:'', 16:'', 17:'', 18:'', 
                21:'', 22:'', 23:'', 24:'', 25:'', 26:'', 27:'', 28:'', 
                31:'', 32:'', 33:'', 34:'', 35:'', 36:'', 37:'', 38:'', 
                41:'', 42:'', 43:'', 44:'', 45:'', 46:'', 47:'', 48:'', 
                51:'', 52:'', 53:'', 54:'', 55:'', 56:'', 57:'', 58:'', 
                61:'', 62:'', 63:'', 64:'', 65:'', 66:'', 67:'', 68:'', 
                71:'', 72:'', 73:'', 74:'', 75:'', 76:'', 77:'', 78:'', 
                81:'', 82:'', 83:'', 84:'', 85:'', 86:'', 87:'', 88:'' };
        for (var piece in CHESSBOARD.pieces) {
            CHESSBOARD.chessBoard[CHESSBOARD._numeric(CHESSBOARD.pieces[piece].sqId)] = CHESSBOARD.pieces[piece].id;
        }
        
    },
    _spawnPieces:function() {
        var bGraveyard = $('#bGraveyard');  // JQUERY
        var wGraveyard = $('#wGraveyard');  // JQUERY
        for (var piece in CHESSBOARD.pieces) {
               var pieceRepresentation = '<img \
                        class="piece '+ CHESSBOARD.pieces[piece].class +'" \
                        src="/client/img/transparent.png" \
                        alt="' + CHESSBOARD.pieces[piece].name + '" \
                        title="' + CHESSBOARD.pieces[piece].name + '" \
                        id="' + CHESSBOARD.pieces[piece].id + '"> \
                  </img>';
               if (CHESSBOARD.pieces[piece].id[0] === 'w' && CHESSBOARD.pieces[piece].sqId === '' ) {   // piece is white and captured
                    wGraveyard.append(pieceRepresentation); // JQUERY
               } else if (CHESSBOARD.pieces[piece].id[0] === 'b' && CHESSBOARD.pieces[piece].sqId === '' ) {  // piece is black and captured
                    bGraveyard.append(pieceRepresentation); // JQUERY
               } else {
                    $('#' + CHESSBOARD.pieces[piece].sqId).append(pieceRepresentation); // JQUERY
               }
        }
        // JQUERY
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
                            class="chessBoardSquare chessBoardSquare'+ ((parseInt(column,10)+parseInt(row,10))%2) +'"></div>';
            }
            htmlRow += '</div>';
            board.append(htmlRow);
         }
         $(".chessBoardSquare").bind('vmousedown',function(event) { CHESSBOARD.mouseDownHandler(event); }); // JQUERY
    },
    
    initChessBoard: function(gameID) {
        CHESSBOARD.pieces=[];
        // JQUERY
        $('#chessBoard').empty(); // remove all children (rows & colums & pieces)
        $('#wGraveyard').empty();
        $('#bGraveyard').empty();
        $('#wSit').css('display','block');
        $('#bSit').css('display','block');
        CHESSBOARD._drawBoard(); 
        CHESSBOARD._createPieces();
        CHESSBOARD._spawnPieces();
        CHESSBOARD.gameID = gameID;
        CHESSBOARD.playerA = "";
        CHESSBOARD.playerB = "";
        CHESSBOARD.blackPlayer = '';
        CHESSBOARD.blackCanCastleKingSide = true;
        CHESSBOARD.blackCanCastleQueenSide = true;
        CHESSBOARD.whitePlayer = '';
        CHESSBOARD.whiteCanCastleKingSide = true;
        CHESSBOARD.whiteCanCastleQueenSide = true;
        CHESSBOARD.currentGameTurn= '';
        CHESSBOARD.gameHistory = [];
        return 0;
    },
    
    sit: function(color) {
        $('#'+color+'Sit').css('display','none');   // JQUERY
        CHESSHUB.sendMessage('sit-' + color, 
            CHESSBOARD.gameID, 
            'game', 
            function(){ 
                CHESSBOARD.setPlayer(color,CONTEXT.user); 
            }, 
            function() { console.log('error while sitting'); }
        );
        return 0;
    },
    
    setPlayer: function(parameter,value) {
        console.log('setPlayer : ' + parameter + '=' + value);
        if (parameter === 'A') {
            CHESSBOARD.playerA = value;
        } else if (parameter === 'B') {
            CHESSBOARD.playerB = value;
        } else if (parameter === 'w') {
            CHESSBOARD.whitePlayer = value;
            if(value) { $('#wSit').css('display','none'); } // JQUERY
            else { $('#wSit').css('display','block'); }
        } else if (parameter === 'b') {
            CHESSBOARD.blackPlayer = value;
            if(value) { $('#bSit').css('display','none'); }
            else { $('#bSit').css('display','block'); } // JQUERY
        }
        
        if (CHESSBOARD.blackPlayer && CHESSBOARD.whitePlayer) {
            if (!CHESSBOARD.currentGameTurn) { CHESSBOARD.currentGameTurn = 'w';}
        }
    }
};
