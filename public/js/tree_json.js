"use strict"
var newick = require('./newick.js');
var treetools = require('./treetools.js');
var fs = require('fs');

// process trees from command line
if (process.argv.length < 3) { // this number includes "node"
    console.log(process.argv[1] + " tree.nh");
} 
else {
    console.log("reading file " + process.argv[2]) 
    fs.readFile(process.argv[2], 'utf8', function(err, data) {
        if (err) {
            console.log("there was an error!");
            return console.log(err);
        }
        else {
            console.log("got data from file:");
            console.log(data);
            var tree = newick.parse(data);
            //treetools.print_ascii(tree, 0, 50);
            treetools.print_ascii_cladogram(tree);
            console.dir(tree);
        }
    });
}
