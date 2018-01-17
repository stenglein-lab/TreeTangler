var expect = require("chai").expect;
var treetools = require("../lib/treetools");

describe("writeNewick()", function(){
    it("prints the newick format for a newick.js parsed object", function(){
        
        // gotten by :
        // var nw = require('newick');
        // var tree =  nw.parse('((B:6.0,(A:5.0,C:3.0)i0:5.0)i1:4.0,D:15.0)simple-tree:10;')

        // JSON.stringify(tree)
        var tree = {"branchset":[{"name":"i1","branchset":[{"name":"B","length":6},{"name":"i0","branchset":[{"name":"A","length":5},{"name":"C","length":3}],"length":5}],"length":4},{"name":"D","length":15}],"name":"simple-tree","length":10};

        results = treetools.writeNewick(tree);
        expect(results).to.equal('((B:6,(A:5,C:3)i0:5)i1:4,D:15)simple-tree:10;'); // I have removed the '.0' from branchlengths that are integers
        
    });
});

