"use strict"
var treetools = require('./treetools.js');

/* from StackOverflow, apparently based on Fisher-Yates shuffle  */
var shuffle = function(array) {
      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
}

var n_leaves = 10;
// create a tree of n_leaves leaves, with a single grouping node
var leaves = [];
for (var i = 0; i < n_leaves; i++) {
    leaves.push( treetools.create_leaf("L" + i, 1) );
}
shuffle(leaves);
var tree = treetools.create_node("tree", leaves, 1);
treetools.make_binary(tree);
console.log(tree);
treetools.print_ascii_cladogram(tree);
console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);
