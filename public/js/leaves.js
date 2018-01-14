"use strict"
var newick = require('./newick.js');
var fs = require('fs');
var treetools = require('./treetools.js');


if (process.argv.length < 3) {
    console.log(process.argv[1] + " tree.nh");
} 
else {
    fs.readFile(process.argv[2], 'utf8', function(err, data){
        if (err) {
            return console.log(err);
        }
        var t = newick.parse(data);
        var leafs = treetools.leaves(t);
        console.dir(leafs.join(","));
        
    }); 
}
