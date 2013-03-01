'use strict';

/* Controllers */
function handleDragOver(ev)
{
    ev.preventDefault();
}

function handleDragStart(ev)
{
    ev.dataTransfer.setData("srcId",ev.target.id);
}

function handleDrop(ev)
{
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
}

function handleDragEnter(ev)
{
    document.getElementById(ev.target.id).classList.add('overOk');
}

function handleDragLeave(ev)
{
    document.getElementById(ev.target.id).classList.remove('overOk');
}



function GlobalCtrl($scope) {
    $scope.chessBoardColumns = {1:'a', 2:'b', 3:'c', 4:'d', 5:'e', 6:'f', 7:'g', 8:'h'};
    $scope.chessBoardRows = [8, 7, 6, 5, 4, 3, 2, 1];
    $scope.colors = {'w':'white','b':'black'}
    $scope.pieces = {};

    for (var c in $scope.colors) {
        $scope.pieces[c+'king'] = {
                id: c+'king',
                order: 0,
                name : $scope.colors[c] + ' king',
                class : c + 'king',
                initx : 5,
                inity : (c=="w"?1:8)
        };
        $scope.pieces[c + 'queen'] = {
                id: c+'queen',
                order: 1,
                name : $scope.colors[c] + ' queen',
                class : c + 'queen',
                initx : 4,
                inity : (c=="w"?1:8)
        };
        $scope.pieces[c + 'rooka'] = {
                id: c+'rooka',
                order: 2,
                name : $scope.colors[c] + ' rook (a)',
                class : c + 'rook',
                initx : 1,
                inity : (c=="w"?1:8)
        };
        $scope.pieces[c + 'rookh'] = {
                id: c+'rookh',
                order: 3,
                name : $scope.colors[c] + ' rook (h)',
                class : c + 'rook',
                initx : 8,
                inity : (c=="w"?1:8)
        };
        $scope.pieces[c + 'knightb'] = {
                id: c+'knightb',
                order: 4,
                name : $scope.colors[c] + ' knight (b)',
                class : c + 'knight',
                initx : 2,
                inity : (c=="w"?1:8)
        };
        $scope.pieces[c + 'knightg'] = {
                id: c+'knightg',
                order: 2,
                name : $scope.colors[c] + ' knight (g)',
                class : c + 'knight',
                initx : 7,
                inity : (c=="w"?1:8)
        };
        $scope.pieces[c + 'bishopc'] = {
                id: c+'bishopc',
                order: 6,
                name : $scope.colors[c] + ' bishop (c)',
                class : c + 'bishop',
                initx : 3,
                inity : (c=="w"?1:8)
        };
        $scope.pieces[c + 'bishopf'] = {
                id: c+'bishopf',
                order: 7,
                name : $scope.colors[c] + ' bishop (f)',
                class : c + 'bishop',
                initx : 6,
                inity : (c=="w"?1:8)
        };
        for (var i in $scope.chessBoardColumns) {
                $scope.pieces[c + 'pawn' + $scope.chessBoardColumns[i]] = {
                        id: c + 'pawn' + $scope.chessBoardColumns[i],
                        order: 7+i,
                        name: $scope.colors[c] + ' pawn (' + $scope.chessBoardColumns[i] + ')',
                        class: c + 'pawn',
                        initx : i,
                        inity : (c=="w"?2:7)
                };
        };
    }
    
    $scope.initChessBoard = function() {
        for (var piece in $scope.pieces) {
            document.getElementById('sq' + $scope.pieces[piece].initx + $scope.pieces[piece].inity).appendChild(document.getElementById($scope.pieces[piece].id));
        }
    };
}

