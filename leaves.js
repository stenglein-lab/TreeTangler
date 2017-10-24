"use strict"
var newick = require('./newick.js');
var fs = require('fs');

var visitPreOrder = function(root, callback, depth=0, data={}) {
    if (root) { callback(root, depth, data); }
    if (root.branchset) {
        for (var i = 0; i < root.branchset.length; i++) {
            visitPreOrder(root.branchset[i], callback, depth+1,data);
        }
    }
}
var leaves = function(tree) {
    var add_name_if_leaf = function(node, depth, data) {
        if (! node.branchset) {
            if (! data.leaves) { data.leaves = []; }
            data.leaves.push(node.name);
        }
    }
    var data = {};
    visitPreOrder(tree, add_name_if_leaf, 0, data);
    return data.leaves;
}

if (process.argv.length < 3) {
    console.log(process.argv[1] + " tree.nh");
} 
else {
    fs.readFile(process.argv[2], 'utf8', function(err, data){
        if (err) {
            return console.log(err);
        }
        var t = newick.parse(data);
        var leafs = leaves(t);
        console.dir(leafs.join(","));
        
    }); 
}
