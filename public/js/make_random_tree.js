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
const DESC = "Create a tree with nleafs leaves, recursively bisecting (with random split point) an array until completely binary.";
var PROGPATH = process.argv[1];
var parts = PROGPATH.split("/");
var PROGNAME = parts[parts.length-1]
if (process.argv.length < 3) {
    console.log(DESC);
    console.log("USAGE: node " + PROGNAME + " nleafs");
    process.exit(1)
}

var n_leaves = +process.argv[2];
console.log(n_leaves);
// create a tree of n_leaves leaves, with a single grouping node
var leaves = [];
for (var i = 0; i < n_leaves; i++) {
    leaves.push( treetools.create_leaf("L" + i, 1) );
}
console.log(leaves);
//shuffle(leaves);
//console.log("After shuffling...");
//console.log(leaves);
var tree = treetools.create_node("tree", leaves, 1);
treetools.make_random_binary(tree);
console.log(tree);
//var scale = process.stdout.columns * .15;
//console.log('Terminal width: ' + process.stdout.columns + ', scale ' + scale);
//treetools.print_ascii(tree, 0, scale);
treetools.print_ascii_cladogram(tree);
console.log( treetools.writeNewick(tree) );
