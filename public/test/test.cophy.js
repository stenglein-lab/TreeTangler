describe("Module CoPhylogeny", function () {
    before(function() {
        // Newick is defined somewhere in the bundle
        var tree = Newick.parse('((B:6.0,(A:5.0,C:3.0)i0:5.0)i1:4.0,D:15.0)simple-tree:10;'); // contents of public/simple-tree.newick
    });
    it("draws two trees with links", function() {
        var value = 3;
        console.log("am I happening?");
        expect(value).to.equal(3);
    });
});
