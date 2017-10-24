"use strict"
var newick = require('./newick.js');
var fs = require('fs');
var treetools = require('./treetools.js');

var main = function(data1, data2) {
    var t1 = newick.parse(data1);
    var t2 = newick.parse(data2);
    var l1 = treetools.leaves(t1);
    var l2 = treetools.leaves(t2);

    var dfoot = treetools.dfoot(l2,l1);
    console.log(dfoot);
}

// process trees from command line
if (process.argv.length < 4) {
    console.log(process.argv[1] + " tree1.nh tree2.nh");
} 
else {
    fs.readFile(process.argv[2], 'utf8', function(err1, data1){
        if (err1) {
            return console.log(err1);
        }
        else {
            fs.readFile(process.argv[3], 'utf8', function(err2, data2) {
                if (err2) {
                    return console.log(err2);
                }
                else {
                    main(data1, data2);
                }
            });
        }
    }); 
}
