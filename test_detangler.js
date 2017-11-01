"use strict"
var newick = require('./newick.js');
var fs = require('fs');
var treetools = require('./treetools.js');

var main = function(data1, data2) {
    var t1 = newick.parse(data1);
    var t2 = newick.parse(data2);
    treetools.make_binary(t1);
    treetools.make_binary(t2);
    var l1 = treetools.leaves(t1);
    console.log("Tree 1 has " + l1.length + " leaves.");
    var l2 = treetools.leaves(t2);
    console.log("Tree 2 has " + l2.length + " leaves.");

    var dfoot = treetools.dfoot(l2,l1);
    console.log("Starting distance between L1 and L2 = " + dfoot);

    // l1 will serve as the standard as we modify t2
    // Detangler is a Depth-First Algorithm that requires binary trees.
    // At each node, the algorithm swaps the left and right children,
    // keeping the configuration that has a lower dfoot.
    // The algorithm necessarily modifies the tree in-place, so
    // a copy might be a good idea.
    var data = {root: t2, l1: l1}; // needed to call leaves, dfoot
    var detangle = function(node, depth, data) {
        var indent = "";
        for (var i = 0; i < depth; i++) { indent += "   "; }
        if (node.branchset) {
            var dfoot_pre = treetools.dfoot(treetools.leaves(data.root), data.l1);
            treetools.swap_children(node);
            var dfoot_post = treetools.dfoot(treetools.leaves(data.root), data.l1);
            console.log(indent + dfoot_pre +" vs " + dfoot_post);
            if (dfoot_pre < dfoot_post) {
                console.log(indent + "reject swap");
                treetools.swap_children(node);
            }
            else {
                console.log(indent + "keep swap");
            }
        }
    }

    treetools.visitPostOrder(t2, detangle, 0, data);
    
    console.log("Tree 1 has " + l1.length + " leaves.");
    var l2 = treetools.leaves(t2);
    console.log("Tree 2 has " + l2.length + " leaves.");

    var dfoot = treetools.dfoot(l2,l1);
    console.log("Ending distance between L1 and L2 = " + dfoot);

    console.log(treetools.writeNewick(t2));
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
