(function() {
    exports = module.exports = function(CoPhylogenyGraph) {
        CoPhylogenyGraph.prototype.highlight_from_node = function(isLeft=true)
        {
            var cophy_obj = this;
            return function (d3obj) // d3obj is being passed because the calling function, d3-hierarchy.on(), does the event handling.
            {
                console.log("whatis this: ");
                console.dir(this);
                console.log("d3.select(this)");
                console.dir(d3.select(this));
                var node = d3.select(this).datum();
                var node_id = node.name;
                console.log("console.dir(n)");
                console.dir(d3obj);
                console.log("unique_id: " + d3obj.data.unique_id);
                console.log("isLeft:" + isLeft);
                if (isLeft) {
                    cophy_obj.swap_children(cophy_obj.leftTree, d3obj.data.unique_id);
                }
                else { // right
                    cophy_obj.swap_children(cophy_obj.rightTree, d3obj.data.unique_id);
                }
                cophy_obj.redraw();
                //cophy_obj.renderTrees(cophy_obj.leftTree, cophy_obj.rightTree, true, true);
                //cophy_obj.highlight_by_id(node_id);
                //cophy_obj.transmit_new_highlighting();
            };
        };
    }; // end exports enclosure
})();
