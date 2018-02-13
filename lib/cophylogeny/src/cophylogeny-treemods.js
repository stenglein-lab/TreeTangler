(function() {
    exports = module.exports = function(CoPhylogenyGraph) {
        CoPhylogenyGraph.prototype.swap_children = function(json, target) {
            var node, children;
            if (json == this.leftTree) {
                console.log("left json[" + this.leftNodeLookup.hasOwnProperty(target) + "]:" + json);
                node = this.leftNodeLookup[target];
                children = node.branchset;
            }
            else {
                console.log("right json[" + this.rightNodeLookup.hasOwnProperty(target) + "]:" + json);
                node = this.rightNodeLookup[target];
                children = node.branchset;
            }
            var n = children.length;
            for (var i = 0; i < n/2; i++) {
                var j = n - i - 1;
                var tmp = children[i];
                children[i] = children[j];
                children[j] = tmp;
            }
            node.branchset = children;
            return 1;
        };
        CoPhylogenyGraph.prototype.addUniqueNodeIds = function(node, isLeft, depth=0) { // traverse newick object, enumerate nodes
            if (depth == 0) { 
                console.group("addUniqueNodeIds: " + (isLeft ? "left" : "right"));
            }    
            if (! node.hasOwnProperty('unique_id')) {
                if (isLeft) {
                    node.unique_id = "l-nd-" + this.leftTreeId;
                    this.leftNodeLookup[ node.unique_id ] = node; 
                    this.leftTreeId++;
                }    
                else {
                    node.unique_id = "r-nd-" + this.rightTreeId;
                    this.rightNodeLookup[ node.unique_id ] = node; 
                    this.rightTreeId++;
                }    
                console.log( node.unique_id );
            }    
            for (var key in node) {
                if (node.hasOwnProperty(key)) { // why is this here?
                    if (key == "branchset") {
                        for (var branch in node.branchset) {
                            this.addUniqueNodeIds(node.branchset[branch], isLeft, depth+1);
                        }    
                    }    
                }    
            }    
            if (depth == 0) { 
                console.groupEnd();
            }    
        };
        // from formalized Tanglegram notations in 
        // Venkatachalam B, Apple J, St. John K, Gusfield D. 
        // Untangling tanglegrams: Comparing trees by their drawings. 
        // IEEE/ACM Trans Comput Biol Bioinforma. 2010;7(4):588-597. doi:10.1109/TCBB.2010.57.
        CoPhylogenyGraph.prototype.leaves = function(i) { // i in {0,1}, let's also allow "left" or "right"
            var traverse = function(root, callback, arr)
            {
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
        }
        CoPhylogenyGraph.prototype.dfoot = function() {
            // Implementation of Spearman's footrule distance
            // Defined as the sum of the distance of ranks of the respective lists of leaves.
            // No ranking system is predefined, so use the order of the left leaves as the ranks.
            var leftArray = this.leaves(0);
            var rightArray = this.leaves(1);
            var sum = 0;
            for (var i = 0; i < leftArray.length; i++) {
                sum += Math.abs(i - leftArray.indexOf( rightArray[i] ));
            }
            return sum;
        }
        // called by renderTrees()
        CoPhylogenyGraph.prototype.create_d3_objects_from_newick = function() {
            var debug_create_d3_objects_from_newick = false; // can be made to retrieve value from global settings
            // make these class variables if they need to be accessed later
            this.leftHierarchy = d3.hierarchy(this.leftTree, function(d) {return d.branchset;}); // "branchset" is the field named by Newick.js
            this.rightHierarchy = d3.hierarchy(this.rightTree, function(d) {return d.branchset;});

            this.leftDescendants = this.leftHierarchy.descendants(); // d3 "nodes"
            this.rightDescendants = this.rightHierarchy.descendants();
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
        } // create_d3_objects_from_newick
    };// end module.exports enclosure
})();
