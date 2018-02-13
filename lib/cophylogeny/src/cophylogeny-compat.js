(function() {
    exports = module.exports = function(CoPhylogenyGraph) {
        CoPhylogenyGraph.prototype.getTreeStats = function(node, data) {
        // looking to see the node degree distribution
            if (! data.hasOwnProperty('degree')) {
                data.degree = [0,0,0,0,0,0];
            }
            if (node.hasOwnProperty('branchset')) {
                var count = node.branchset.length;
                if (data.degree.hasOwnProperty(count)) {
                    data.degree[count]++;
                }
                else {
                    data.degree[count] = 1;
                }
                for (var branch in node.branchset) {
                    // traverse tree
                    this.getTreeStats(node.branchset[branch], data);
                }
            }
            else { // leaf node
                if (data.degree.hasOwnProperty(0)) {
                    data.degree[0]++;
                }
                else {
                    data.degree[0] = 1;
                }
            }
        };
    };
})();
