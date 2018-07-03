(function() {
  exports = module.exports = function(CoPhylogenyGraph) {
    CoPhylogenyGraph.prototype.redraw = function() {
        this.renderTrees(this.leftTree, this.rightTree, true, true);
        this.applyPersistentClasses();
    };
    CoPhylogenyGraph.prototype.applyPersistentClasses = function() {
        var cophy_obj = this;
        for (const classname in this.persistentClasses) {
            classD3Obj(classname, this.persistentClasses[classname]);
        }    
        //  ^ separated a nested function because of: 
        //  | jshint: Functions declared within loops referencing an outer scoped variable may lead to confusing semantics.
        classD3Obj = function(classname, selectors) {
            selectors.forEach(function(selector) {
                cophy_obj.overall_vis.selectAll(selector).classed(classname, true);
            });  
        };   
    };
    CoPhylogenyGraph.prototype.renderTrees = function(leftTree, rightTree, rescale = true, redraw = true) {
        // json format trees, processed from newick style text files by Newick.js.
        this.leftTree = leftTree;
        this.rightTree = rightTree;
        if (redraw) {
            // good place to invoke treetools here
            var leftTreeStats = {};
            this.getTreeStats(this.leftTree, leftTreeStats);
            console.log("leftTreeStats histogram of node degrees", leftTreeStats.degree.length);
            console.dir(leftTreeStats);
            this.addUniqueNodeIds(this.leftTree, true); // only proceeds if unique_id is missing from newick node objects
            this.addUniqueNodeIds(this.rightTree, false);

            // shuffle
            if (this.userArgs.shuffle) {
                // left
                switch(this.userArgs.shuffle) {
                    case 'l':
                    case 'left':
                    case 'b':
                    case 'both':
                        this.randomize_nodes(this.leftTree);
                        break;
                }
                // right
                switch(this.userArgs.shuffle) {
                    case 'r':
                    case 'right':
                    case 'b':
                    case 'both':
                        this.randomize_nodes(this.rightTree);
                        break;
                }
                // do not reshuffle on subsequent redraws
                delete this.userArgs.shuffle;
            }
        }

        if (redraw) {
            this.overall_vis.selectAll(".node").remove();
            this.overall_vis.selectAll(".link").remove();
            this.overall_vis.selectAll("#bridge_g").remove();
            this.overall_vis.selectAll(".tree_label").remove();
        }
        this.create_d3_objects_from_newick();
        var tree1_edges = this.tree1_edges;
        var tree2_edges = this.tree2_edges;

        // this repositions nodes based on actual branch lengths
        if (rescale) {
            // actually the scale is on x
            var yscale = SVGUtils.SVGUtils.scaleBranchLengths(this.leftDescendants, this.svg_w - this.margin.left - this.margin.right, false);
            yscale = SVGUtils.SVGUtils.scaleBranchLengths(this.rightDescendants, this.svg_w - this.margin.left - this.margin.right, true);
        }

        // shift everything down and right for the margins
        var margin_shift = "translate(" + (this.margin.left/2) + ", " + this.margin.top + ")";
        this.tree1_g = this.overall_vis.append("g") .attr("transform", margin_shift);
        this.tree2_g = this.overall_vis.append("g") .attr("transform", margin_shift);
        this.bridge_g = this.overall_vis.append("g") .attr("transform", margin_shift).attr("id", "bridge_g");

        // add labels
        var label_offset = 5;
        var left_label = this.tree1_g.append("text")
        .attr("class", "tree_label")
        .attr("x", label_offset)
        .attr("y", -5)
        .style("alignment-baseline", "baseline")
        .text(this.tree1_name);

        var right_label = this.tree2_g.append("text")
        .attr("class", "tree_label")
        .attr("x", this.svg_w -  this.margin.right - label_offset)
        .attr("y", -5)
        .style("text-anchor", "end")
        .style("alignment-baseline", "baseline")
        .text(this.tree2_name);

        // a fxn to create right angled edges connecting nodes
        var diagonal = SVGUtils.SVGUtils.rightAngleDiagonal();
        var cophy_obj = this;
        var id_str = function(node) {
            if (node) {
                return "[" + node.data.unique_id + ", " + node.data.name + "]";
            }
            else { return "NULL"; }
        };
        var ch_str = function(node) {
            if (node && node.children) {
                return node.children.length;
            }
            return "0";
        };
        var root = this.leftHierarchy;
        //console.group([id_str(root)]);
        this.drawHierarchy(root, this.tree1_g);
        console.log("------done left drawingHierarchy-------");

        root = this.rightHierarchy;
        //console.group([id_str(root)]);
        this.drawHierarchy(root, this.tree2_g, -1);
        console.log("------done right drawingHierarchy-------");

        // draw bridging lines
        this.currentDFoot = this.dfoot();
        this.drawBridgingLines();
        var draw_event = new Event('draw');
        this.dispatchEvent(draw_event);
    };// end renderTrees
    // render(): called externally in tanglegram.js by render_cophylogeny(container,segment_id,newick_url_1,newick_url_2,height)
    // asynchronous call has been moved outside of this function, operate on parsed newick objects
    CoPhylogenyGraph.prototype.render = function(leftNw, rightNw) {
        // create an SVG canvas area
        this.overall_vis = this.selector.append("svg")
          .attr("id", "cophy-graph")
          .attr("width", this.svg_w)
          .attr("height", this.svg_h)
          .attr("transform", "translate(" + this.margin.left + ", " + this.margin.top + ")") ;

        var svg = this.overall_vis;
        // gradient
        var gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "00%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");
        gradient.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", "#FFFFFF")
            .attr("stop-opacity", ".5");
        gradient.append("stop")
            .attr("offset", "90%")
            .attr("stop-color", "#F9FDFD")
            .attr("stop-opacity", ".5");
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#F3F3F0")
            .attr("stop-opacity", ".5");

        this.renderTrees(leftNw, rightNw);
    };
  };
})();

