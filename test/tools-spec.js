var expect = require("chai").expect;
var treetools = require("../lib/treetools");

describe("writeNewick()", function(){
    it("prints the newick format for a newick.js parsed object", function(){
        
        var results = treetools.writeNewick();

        expect(results).to.equal("");
        
    });
});

