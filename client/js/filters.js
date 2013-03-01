'use strict';

/* Filters */

var angularChess = angular.module('angularChess', []);
angularChess.filter('isColor', function() {
  return function(input, color) {
//        alert(input['bking'].name.indexOf(color));
        var out = [];
        for (var i in input){
          if(input[i].name.indexOf(color)>-1)
              out.push(input[i]);
        }
        return out;
  };
});

