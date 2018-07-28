(function() {
    exports = module.exports = function(CoPhylogenyGraph) {
        var treetools = require('cophy-treetools');
        CoPhylogenyGraph.prototype.detangle_left = function() {
            treetools.run_detangler(this.leftTree, this.rightTree );
        };
        CoPhylogenyGraph.prototype.detangle_right = function() {
            treetools.run_detangler(this.rightTree, this.leftTree );
        };
        CoPhylogenyGraph.prototype.swap_children = function(json, target) {
            var node = json == this.leftTree ? this.leftNodeLookup[target] : this.rightNodeLookup[target];
            console.dir(this);
            if (!node) { throw new Error("failed to find " + target + " in node lookup for tree:" + (json == this.leftTree ? "left" : "right")); }
            treetools.swap_children(node);
            return 1;
        };
        CoPhylogenyGraph.prototype.addUniqueNodeIds = function(tree, isLeft, depth=0) { // traverse newick object, enumerate nodes
            if (isLeft) 
                { this.leftNodeLookup =  treetools.index_and_enumerate(tree, "l-nd-", "unique_id");}
            else
                { this.rightNodeLookup = treetools.index_and_enumerate(tree, "r-nd-", "unique_id");}
        };
        // from formalized Tanglegram notations in 
        // Venkatachalam B, Apple J, St. John K, Gusfield D. 
        // Untangling tanglegrams: Comparing trees by their drawings. 
        // IEEE/ACM Trans Comput Biol Bioinforma. 2010;7(4):588-597. doi:10.1109/TCBB.2010.57.
        CoPhylogenyGraph.prototype.leaves = function(i) { // i in {0,1}, let's also allow "left" or "right"
            
            if ((i === 0) || (i === "left")) 
            {
                var l = treetools.leaf_names(this.leftTree);
                if (l.length < 2) {
                    console.dir(this.leftHierarchy);
                    throw new Error("leftLeaf names is suspect");
                }
                return l;
            }
            else
            {
                var r = treetools.leaf_names(this.rightTree);
                if (r.length < 2) {
                    console.dir(this.rightHierarchy);
                    throw new Error("rightLeaf names is suspect");
                }
                return r;
            }
            throw new Error("end of leaves()");
        };
        CoPhylogenyGraph.prototype.d3leaves = function(i) {
            var traverse = function(root, callback, arr) {
                var v = callback(root);
                if (v != null) { arr.push(v); }
                if (root.children)
                {
                    for (var i = root.children.length - 1; i >= 0; i--)
                    {
                        traverse(root.children[i], callback, arr);
                    }
                }
            };
            var return_name_if_leaf = function(node) {
                if (! node.hasOwnProperty("children")) {
                    return node.data.name;
                }
                return null;
            };
            var leafArray = [];
            if ((i === 0) || (i === "left")) 
            {
                traverse(this.leftHierarchy, return_name_if_leaf, leafArray);
            }
            else
            {
                traverse(this.rightHierarchy, return_name_if_leaf, leafArray);
            }
            return leafArray;
        };
        CoPhylogenyGraph.prototype.dfoot = function() {
            // Implementation of Spearman's footrule distance
            // Defined as the sum of the distance of ranks of the respective lists of leaves.
            // No ranking system is predefined, so use the order of the left leaves as the ranks.
            var leftArray = this.leaves(0);
            var rightArray = this.leaves(1);
            var obj = treetools.local_dfoot(leftArray, rightArray);
            /*
            For the purpose of a blue/red gradient in the bridging lines
            */
            this.dfoot_obj = obj;
            this.dfoot_min = obj.min;
            this.dfoot_max = obj.max;
            this.dfoot_sum = obj.sum;
            var nlevels = obj.max - obj.min + 1;
            this.dfoot_color_scale = SVGUtils.blueToRed(nlevels).reverse();
            console.log(this.dfoot_obj);
            return obj.sum;
        };
        // called by renderTrees()
        CoPhylogenyGraph.prototype.create_d3_objects_from_newick = function() {
            var debug_create_d3_objects_from_newick = false; // can be made to retrieve value from global settings
            // make these class variables if they need to be accessed later
            this.leftHierarchy = d3.hierarchy(this.leftTree, function(d) {return d.branchset;}) 
                                            .sum(function (d) { return 1; })
                                ;
            this.rightHierarchy = d3.hierarchy(this.rightTree, function(d) {return d.branchset;})
                                ;

            this.leftDescendants = this.leftHierarchy
                                .sum(function (d) { return 1; })
                                .descendants(); // d3 "nodes"
            this.rightDescendants = this.rightHierarchy
                                .sum(function (d) { return 1; })
                                .descendants();
            // checking the overall drawing height
            if (debug_create_d3_objects_from_newick) console.log("check overall height:");
            var height_needed = Math.max(200, this.yScaleFactor * this.leftDescendants.length);
            if (height_needed != this.height) {
                if (debug_create_d3_objects_from_newick)
                {
                    console.log("this.height " + this.height);
                    console.log(' this.selector.attr("height"); ' + this.selector.attr("height"));
                    console.log(' this.selector.style("height"); ' + this.selector.style("height"));
                }
                this.overall_vis
                    .style("height", height_needed)
                    .attr("height", height_needed)
                ;
                this.height = height_needed;
                if (debug_create_d3_objects_from_newick)
                {
                    console.log("this.height " + this.height);
                    console.log(' this.selector.attr("height"); ' + this.selector.attr("height"));
                    console.log(' this.selector.style("height"); ' + this.selector.style("height"));
                }
            }

            // background
            this.overall_vis.append("rect")
             .attr("class", "background")
             .attr("width", this.svg_w)
             .attr("height", this.svg_h)
             .style("fill", "#FFFFFF");
              //.on("click", fade_all);
            // a two-item array that sets the layout size for d3.layout.cluster
            var d3_layout_bounds = [this.svg_h - this.margin.top - this.margin.bottom,
                                    this.svg_w - this.margin.left - this.margin.right];
            // specifies the separation between nodes on the graph
            function cluster_spread_fxn(a,b) {
                return a.parent == b.parent ? 1.5 : 1.8;
            }
            // set up left d3 object
            this.leftCluster = d3.cluster()
                                .size(d3_layout_bounds)
                                .separation(cluster_spread_fxn)
                                ;
            this.leftCluster(this.leftHierarchy);
            // set up right d3 object
            this.rightCluster = d3.cluster()
                                .size(d3_layout_bounds)
                                .separation(cluster_spread_fxn)
                                ;
            this.rightCluster(this.rightHierarchy);


            this.tree1_edges = this.leftHierarchy.links(); // d3 "edges"
            console.dir(this.tree1_edges);
            this.tree2_edges = this.rightHierarchy.links();
        };// create_d3_objects_from_newick
    };// end module.exports enclosure
})();
