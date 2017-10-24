"use strict"
var newick = require('./newick.js');
var treetools = require('./treetools.js');
var t = "((B:6.0,(A:5.0,A1:1,A2:2,B2:2.5,B2a:2.7,B2b:2.8,C:3.0,C1:2.0,C2:3.0):5.0):4.0,D:11.0)simple-tree:10;";
var nw_t = newick.parse(t);

treetools.visitPreOrder(nw_t, treetools.print_node_traversal, 0);
treetools.make_binary(nw_t);
console.log("-------- run make_binary ---------");
treetools.visitPreOrder(nw_t, treetools.print_node_traversal, 0);
