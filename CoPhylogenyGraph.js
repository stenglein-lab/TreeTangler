/*
 * Copyright 2017 David C. King and Mark Stenglein.
 * Using ECMAScript 2015 class definition wrapper around prototype inheritance.
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
 */

/* 
 * Required in the <script> tags that load this file:
 *  d3.v4.js - d3 version 4
 *  newick.js - for parsing newick file trees.
 *  SVGUtils.v3.js - for SVG drawing utilities
 *  
 */

/* Extension to d3.hierarchy
 * Need a serial accessor that only returns one level at a time in order to build a truly hierarchical SVG.
 */
d3.hierarchy.prototype.eachChild = function(callback) {
    var node = this;
    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            callback(node.children[i]);
        }
    }
    return this;
}
d3.hierarchy.prototype.childLinks = function() { // non-recursive generator for one level of links
    var root = this, links = [];
    root.eachChild(function(node) {
        links.push({source: root, target: node});
    });
    return links;
}

/* CoPhylogenyGraph
 * Methods and data for creating an SVG drawing
 * of a pair of phylogenetic trees that have the same leaf nodes, but different topologies.
 * Connecting lines are drawn between the leaves of both trees.
 */
class CoPhylogenyGraph {
    constructor(selector, width, height, userArgs = {}) {
        this.eventListeners = {};
        this.selector = selector; // canvas element in the DOM where drawing will take place
        this.width = width || selector.style('width') || selector.attr('width');
        this.height = height || selector.style('height') || selector.attr('height');
        this.userArgs = userArgs;
        this.leftNodeLookup = {};
        this.rightNodeLookup = {};

        this.persistentClasses = {}; // add classname = [d3selector,...]

        // margins for SVG drawing area
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.yScaleFactor = 6;

        /* initialize some member variables ********/
        this.bridgeMap = undefined;
        // native tree objects are json objects parsed by Newick.js
        this.leftTree = null; // these are set by renderTrees(nw1,nw2), after the read-in code completes (synchronized by render, readBothNewickURLs)
        this.rightTree = null;
        // varables act as globals during the node naming, unique for left and right trees
        this.leftTreeId = 0;
        this.rightTreeId = 0;
        /**** d3 objects created from the newick tree****/
        // d3 hierarchies are trees
        this.leftHierarchy = null;  // d3 hierarchy is the "tree", but the cluster object below must be called on
        this.rightHierarchy = null; // it in order to have it work.
        // d3-hierarchy.links are edges
        this.tree1_edges = null; // d3 leftHierarchy.links() acts as "edges"
        this.tree2_edges = null; 
        // d3.cluster() used to be defined in d3.layout.cluster()
        this.leftCluster = null;    // the cluster object is created with layout parameters, and is
        this.rightCluster = null;   // then called directly, e.g. leftCluster(hierarchy), without a return value
        // d3 descendants are nodes
        this.leftDescendants = null; // d3 leftHierarchy.descendants() acts as "nodes"
        this.rightDescendants = null;
        /*******************************************/
        this.currentDFoot = 0;
    }
    addPersistentClass(classname, selector) {
        if (! this.persistentClasses.hasOwnProperty(classname)) {
            this.persistentClasses[classname] = new Array();
        }
        this.persistentClasses[classname].push(selector);
    }
    get svg_h() {
        return this.height - this.margin.top - this.margin.bottom;
    }
    get svg_w() {
        return this.width - this.margin.left - this.margin.right;
    }
    // from formalized Tanglegram notations in 
    // Venkatachalam B, Apple J, St. John K, Gusfield D. 
    // Untangling tanglegrams: Comparing trees by their drawings. 
    // IEEE/ACM Trans Comput Biol Bioinforma. 2010;7(4):588-597. doi:10.1109/TCBB.2010.57.
    leaves(i) { // i in {0,1}, let's also allow "left" or "right"
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
        }
        var return_name_if_leaf = function(node) {
            if (! node.hasOwnProperty("children")) {
                return node.data['name'];
            }
            return null;
        }
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
    dfoot() {
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
    create_d3_objects_from_newick() {
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

    drawBridgingLines() {
        var cophy_obj = this;
        cophy_obj.leftDescendants.forEach(function (leftNode)
        {
            if (leftNode.children)
            {
                return false;
            }
            var leftNodeName = String(leftNode.data.name);
            // determine matching method
            if (undefined === cophy_obj.bridgeMap){
                var rightNode = cophy_obj.findNode("right", leftNodeName);
                var rightNodeName = rightNode.data.name;
            }
            else {
                var rightNodeName = cophy_obj.bridgeMap.get(leftNodeName);
                var rightNode = cophy_obj.findNode("right", rightNodeName);
            }

            // draw bridging line if matched
            if (undefined === rightNode) {
                console.log("couldn't match " + leftNodeName);
            }
            else {
                //console.log("Matched " + leftNodeName + " with " + rightNodeName);
                var x1 = leftNode.x;
                var y1 = leftNode.y + 40; // to get past text. NB x,y flipped in d3.layout.cluster
                var x2 = rightNode.x;
                var y2 = rightNode.y - 40;
                var midx = (x1 + x2) / 2;
                var midy = (y1 + y2) / 2;

                var nodePair_spline_coords = [
                {
                    "x": x1,
                    "y": y1
                },
                {
                    "x": x1,
                    "y": midy
                },
                {
                    "x": x2,
                    "y": midy
                },
                {
                    "x": x2,
                    "y": y2
                }];

                var lineFunction = d3.line()
                    .x(function (d)
                    {
                        return d.y;
                    })
                    .y(function (d)
                    {
                        return d.x;
                    })
                    .curve(d3.curveBundle.beta(0.99))
                    ;

                var line_connect = cophy_obj.bridge_g.append("path")
                    .attr("d", lineFunction(nodePair_spline_coords))
                    .attr("class", "bridge")
                    .attr("id", leftNodeName)
                    .attr("pointer-events", "stroke") // only clicking on stroke works
                    .attr("stroke", function (d, i)
                    {
                        // TODO: separate out bridge line coloring function to something
                        // that can be passed down from top level.
                        //
                        // code block below is meaningful for Mark's genotypes specified by node names
                        // color bridging lines by genotype
                        var seg_genotype = leftNodeName.match(/[SL]([0-9]+)/)
                        if (seg_genotype)
                        {
                            // match actually returns an array of results, the 2nd element is the one we want
                            var seg_genotype_number = seg_genotype[1];
                            // we'll have to cycle through colors if more than in our scheme
                            var color_index = seg_genotype_number % SVGUtils.color_scheme().length;
                            return SVGUtils.color_scheme()[color_index];
                        }
                        else
                        {
                            return "#d3d3d3"; // == "lightgrey" --> d3, ha ha
                        }
                    })
                    // .on("click", highlight_toggle);
                    .on("click", cophy_obj.highlight_from_node());
                }
        });
    }
    addUniqueNodeIds(node, isLeft, depth=0) { // traverse newick object, enumerate nodes
        if (depth == 0) {
            console.group("addUniqueNodeIds: " + (isLeft ? "left" : "right"));
        }
        if (! node.hasOwnProperty('unique_id')) {
            if (isLeft) {
                node['unique_id'] = "l-nd-" + this.leftTreeId;
                this.leftNodeLookup[ node['unique_id'] ] = node; 
                this.leftTreeId++;
            }
            else {
                node['unique_id'] = "r-nd-" + this.rightTreeId;
                this.rightNodeLookup[ node['unique_id'] ] = node; 
                this.rightTreeId++;
            }
            console.log( node['unique_id'] );
        }
        for (var key in node) {
            if (node.hasOwnProperty(key)) { // why is this here?
                if (key == "branchset") {
                    for (var branch in node["branchset"]) {
                        this.addUniqueNodeIds(node["branchset"][branch], isLeft, depth+1);
                    }
                }
            }
        }
        if (depth == 0) {
            console.groupEnd();
        }
    }
    getTreeStats(node, data) {
    // looking to see the node degree distribution
        if (! data.hasOwnProperty('degree')) {
            data['degree'] = [0,0,0,0,0,0];
        }
        if (node.hasOwnProperty('branchset')) {
            var count = node['branchset'].length;
            if (data['degree'].hasOwnProperty(count)) {
                data['degree'][count]++;
            }
            else {
                data['degree'][count] = 1;
            }
            for (var branch in node["branchset"]) {
                // traverse tree
                this.getTreeStats(node["branchset"][branch], data);
            }
        }
        else { // leaf node
            if (data['degree'].hasOwnProperty(0)) {
                data['degree'][0]++;
            }
            else {
                data['degree'][0] = 1;
            }
        }
    }
    redraw() { 
        this.renderTrees(this.leftTree, this.rightTree, true, true);
        this.applyPersistentClasses();
    }
    applyPersistentClasses() {
        var debug = true;
        if (debug) { console.group("applyPersistentClasses"); }
        var cophy_obj = this;
        for (const classname in this.persistentClasses) {
            this.persistentClasses[classname].forEach(function(selector) {
                if (debug) { console.log("adding " + classname + " to " + selector); }
                cophy_obj.overall_vis.selectAll(selector).classed(classname, true);
            });
        }
        if (debug) { console.groupEnd(); }
    }
    // renderTrees() called by Render() in async callback of readBothNewickURLs, 
    // or in any function that makes a change to the data and must trigger a redraw.
    renderTrees(leftTree, rightTree, rescale = true, redraw = true) { 
        // json format trees, processed from newick style text files by Newick.js.
        this.leftTree = leftTree;
        this.rightTree = rightTree;
        if (redraw) {
            var leftTreeStats = new Object();
            this.getTreeStats(this.leftTree, leftTreeStats);
            console.log("leftTreeStats histogram of node degrees", leftTreeStats['degree'].length);
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
            var yscale = SVGUtils.scaleBranchLengths(this.leftDescendants, this.svg_w - this.margin.left - this.margin.right, false);
            var yscale = SVGUtils.scaleBranchLengths(this.rightDescendants, this.svg_w - this.margin.left - this.margin.right, true);
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
        var diagonal = SVGUtils.rightAngleDiagonal();
        var cophy_obj = this;
        var id_str = function(node) {
            if (node) {
                return "[" + node.data.unique_id + ", " + node.data.name + "]";
            }
            else { return "NULL"; }
        }
        var ch_str = function(node) {
            if (node && node.children) {
                return node.children.length;
            }
            return "0";
        }
        var root = this.leftHierarchy;
        //console.group([id_str(root)]);
        this.drawHierarchy(root, this.tree1_g);
        console.log("------done left drawingHierarchy-------");

        var root = this.rightHierarchy;
        //console.group([id_str(root)]);
        this.drawHierarchy(root, this.tree2_g, -1);
        console.log("------done right drawingHierarchy-------");

        // draw bridging lines
        this.drawBridgingLines();
        this.currentDFoot = this.dfoot();
        var draw_event = new Event('draw');
        this.dispatchEvent(draw_event);
    } // end renderTrees
    get_d3Node(unique_id) {
        if (this.leftNodeLookup.hasOwnProperty(unique_id)) {
            return this.leftNodeLookup[unique_id];
        }
        else if (this.rightNodeLookup.hasOwnProperty(unique_id)) {
            return this.rightNodeLookup[unique_id];
        }
        return undefined;
    }
    inspectNode(node) 
    {
        console.group("inspectNode");
        var gId = "group_" + node.data.unique_id;
        var isLeaf = !node.children;
        var upper=1;
        if (node.children) {
            console.dir(node.children[0]);
            console.dir(node.children[1]);
            if (node.children[0].x > node.children[1].x) { upper = 0; } // WHY are coordinates inverted?
        }
        var upperChild = node.children[upper];
        var lowerChild = node.children[lower];
        console.groupEnd();
    }
    make_edge_id(source, target) {
        return source.data.unique_id + "_to_" + target.data.unique_id;
    }
    drawHierarchy(node, parentSelector, orientation=1, depth=0) 
    {
        var cophy_obj = this; // for use in subfunctions' scope
        var debug = false;
        if (debug) console.log("drawHierachy " + depth + " --------------------------------------" + id_str(node) + ":" + ch_str(node));
        var childLinks = node.childLinks(); // only the nuclear family
        if (debug) {
            if (undefined !== childLinks[0]) {
                console.log("childLinks:" + childLinks.length);
                console.log("childLinks 0:" + id_str(childLinks[0].source) + " to " + id_str(childLinks[0].target));
                console.log("childLinks 1:" + id_str(childLinks[1].source) + " to " + id_str(childLinks[1].target));
            }
        }

        // Groupings are SVG:g tags
        var gId = "group_" + node.data.unique_id;
        var isLeaf = !node.children;
        var isRoot = depth == 0;
        var isInner = (!isRoot) && (!isLeaf);
        var g = parentSelector // create the encompassing group
            .append("g")
            .attr("id", gId)
            .classed("root", isRoot)
            .classed("inner", isInner)
            .classed("leaf", isLeaf)
          ; 

        var selector_str = "#" + gId;
        var selector = g;
        if (debug) {
            console.log("drawHierarchy " + depth + ": " + selector_str + "= " + g.selectAll(selector_str).size() + " elements");
            console.dir(childLinks);
        }

        // Visual edges are SVG paths
        var upper=1;
        if (node.children) {
            console.group("upper vs lower");
            console.dir(node.children[0]);
            console.dir(node.children[1]);
            if (node.children[0].x > node.children[1].x) { upper = 0; } // WHY is this inverted?
            console.groupEnd();
        }
        var configure_edge_events = function(d3obj, event_constructor) {
            var group_sel = "#group_" + node.data.unique_id;
            var edge_sel = "#" + this.make_edge_id(d3obj.source, d3obj.target); //d3obj.source.data.unique_id + "_to_" + d3obj.target.data.unique_id;
            cophy_obj.dispatchEvent( new event_constructor(
                    edge_sel, 
                    group_sel, 
                    '#group_' + d3obj.target.data.unique_id));
        }
        g.selectAll(selector_str) // refer to the "g" element containing this level
            .data( childLinks ) // only the nuclear family
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", SVGUtils.rightAngleDiagonal())
            .attr("id", function(l) {
                return cophy_obj.make_edge_id(l.source, l.target);
                //return l.source.data.unique_id + "_to_" + l.target.data.unique_id;
             })
            .attr("pointer-events", "stroke") 
            .on("mouseout", function(d3obj) { 
                configure_edge_events(d3obj, TreeEdgeMouseOutEvent)
            })
            .on("mouseover", function(d3obj) { 
                configure_edge_events(d3obj, TreeEdgeMouseOverEvent)
            })
            .on("click", function(d3obj) { 
                configure_edge_events(d3obj, TreeEdgeMouseClickEvent);
                var pth_obj = d3.selectAll("#" + cophy_obj.make_edge_id(d3obj.source, d3obj.target))
                pth_obj.classed("highlighted", true);
                }) // isLeft = true
            ;
        if (debug) console.log("1... drawHierarchy " + depth + ": " + selector_str + "= " + d3.selectAll(selector_str).size() + " elements");

        // this handles the event call for all node events
        var configure_node_events = function(event_constructor) {
            if (node.data.unique_id == 'l-nd-62') {
                console.group("configure_node_events if node == l-nd-62");
            }
            if (node.children) {
                console.log("about to dispatch event");
                console.dir(node.children);
                var upper_selector = "#" + cophy_obj.make_edge_id(node, node.children[upper]);
                var lower_selector = "#" + cophy_obj.make_edge_id(node, node.children[1-upper]);
                if (node.data.unique_id == 'l-nd-62') {
                    console.log("upper_selector: " + upper_selector);
                    console.log("lower_selector: " + lower_selector);
                }
                cophy_obj.dispatchEvent(new event_constructor(
                    "#group_" + node.data.unique_id,
                    upper_selector,
                    lower_selector
                    ));
            }
            else {
                cophy_obj.dispatchEvent(new event_constructor("#group_" + node.data.unique_id, undefined ,undefined));
            }

            if (node.data.unique_id == 'l-nd-62') {
                console.groupEnd();
            }
        }

        // the visual nodes are circles
        g.selectAll( "#circle_" + node.data.unique_id ) // refer to the "g" element containing this level
            .data([node]) // This can pass the wrong object through d3's event mechanism ".on()" 
                          // So in our function, we manually pass objects that we want to use.
            .enter()
            .append("svg:circle")
            .attr("r", isInner ? 3 : 1.5)
            .attr('stroke', "none")
            .attr('fill', isRoot ? 'black' : (isLeaf?'red':'orange'))
            .attr('transform', function(d)
             {
               return "translate(" + d.y + "," + d.x + ")";
             })
            .classed("node", true)
            .classed("inner", isInner)
            .classed("leaf", isLeaf)
            .classed("root", isRoot)
            .attr("pointer-events", "all") // enable mouse events to be detected even if no fill
            .attr("id", function(n) 
             {
                return "circle_" + n.data.unique_id;
             })
            .on("mouseover", function(d3obj, i) {
                if (debug) console.log("mouseover " + i + " :" + node.data.unique_id);
                //var slctn = "#circle_" + node.data.unique_id;
                var slctn = "#group_" + node.data.unique_id;
                var obj = d3.selectAll(slctn);
                obj.classed("highlighted", true);
                configure_node_events(TreeNodeMouseOverEvent);
            })
            .on("mouseout", function(d3obj) {
                var slctn = "#group_" + node.data.unique_id;
                var obj = d3.selectAll(slctn);
                obj.classed("highlighted", false);
                configure_node_events(TreeNodeMouseOutEvent);
            })
            .on("click", function(d3obj) {
                //Launch click event
                configure_node_events(TreeNodeMouseClickEvent);
                //TODO: handle inside click event?
                if (orientation == 1)  // left
                {
                    cophy_obj.swap_children(cophy_obj.leftTree, node.data.unique_id);
                }
                else // right
                {
                    cophy_obj.swap_children(cophy_obj.rightTree, node.data.unique_id);
                }
                cophy_obj.redraw();
            })
            ;
        // text elements
        g.selectAll(selector_str)
            .data([node])
            .enter()
            .append("text")
            .attr("dx", function(d) 
            { 
                return d.y + orientation * 8;
            })
            .attr("dy", function(d)
            {
                return d.x + 3; 
            })
            .style("text-anchor", orientation > 0 ? "start" : "end")
            // .style("cursor", "default") // make it not be a text cursor
            // .attr("pointer-events", "all")
            .text(function (d)
            {
                //return id_str(d);
                return d.data.name.replace(/'/g, "").replace("snake", "").replace(/[SL]/, "").replace("_", "-"); // this needs to be replaced by a user-defined option
            })
            //.on("click", cophy_obj.highlight_from_node(true));

        if (node.children) {
            if (debug) console.log("About to draw..." + node.children);
            for (var i = 0; i < node.children.length; i++) {
                if (debug) console.group([id_str(node.children[i])]);
                this.drawHierarchy(node.children[i], selector, orientation, depth+1);
            }
        }
            
        if (debug) console.groupEnd();
    } // end drawHierarchy

    addEventListener(evt_str, f) {
        if (! this.eventListeners.hasOwnProperty(evt_str)) {
            this.eventListeners[evt_str] = Array();
        }
        this.eventListeners[evt_str].push(f);
    }
    dispatchEvent(evt) {
        var debug = true;
        if (debug) {
            console.log("CoPhylogeny.dispatchEvent:" + evt.type + " -----------------------------");
            console.dir(evt);
        }
        if (this.eventListeners.hasOwnProperty(evt.type)) {
            this.eventListeners[evt.type].forEach(
                function(handler) {
                    handler(evt);
                }
            );
        }
    }
    removeEventListener(type, func) {
        if (this.eventListeners.hasOwnProperty(evt.type)) {
            var ix = this.eventListeners[evt.type].indexOf(func);
            if (ix > -1)  {
               this.eventListeners[evt.type].splice(ix,1);
            }
        }
    }
    
    // render(): called externally in tanglegram.js by render_cophylogeny(container,segment_id,newick_url_1,newick_url_2,height)
    render(leftTreeURL, rightTreeURL) {
        // create an SVG canvas area
        this.overall_vis = this.selector.append("svg")
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

        // since d3.text is asynchronous, handle through async/Promise construct
        readBothNewickURLs(leftTreeURL, rightTreeURL)
            .then(v => {
                console.dir(v);
                this.make_binary(v.nw1);
                this.make_binary(v.nw2);
                this.renderTrees(v.nw1, v.nw2);
                /////////// tree data synchronized: render trees ////////////////////
                // flow control now defaults back to this point if there is an error
            })
            .catch(reason => {
                console.log(reason);
                //console.log(reason.statusText + ": " + reason.responseURL);
            });
    }
    /* once the SVG tree has objects...
     * The following functions apply changes to the cophy object SVG
     */
    transmit_new_highlighting()
    {
        var my_selector = this.selector;
        console.log("my_selector: " + my_selector);
        var highlighted_segments_this_fig = [];
        var highlighted_segs = d3.select(my_selector).selectAll(".bridge-highlighted")[0]; // nested selection

        highlighted_segs.forEach(function (seg)
        {
            var segment_id = d3.select(seg).attr("id");
            console.log(segment_id);
            highlighted_segments_this_fig.push(segment_id);
        });

        update_highlighting(my_selector, highlighted_segments_this_fig);
    }
    update_highlighted_segments()
    {
        var selector = this.selector;
        console.log("updating cophylogeny highlighting for container: " + selector);
        // first, turn off all highlighting, then turn back on as appropriate
        var all_bridges = d3.select(selector).select("#bridge_g").selectAll("path")[0]; // nested selections --> array of arrays hence extra [0]
        d3.selectAll(all_bridges).each(highlight_off);

        // if any highlighting, turn on as appropriate
        if (highlighted_segments.length > 0)
        {
            highlighted_segments.forEach(function (id)
            {
                var matching_bridges = all_bridges.filter(function (d)
                {
                    if (d.id.match(id))
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                });
                d3.selectAll(matching_bridges).each(highlight_on)
            });
        }
    }
    update_highlighting(selector, segment_list)
    {
        if (segment_list != null)
        {
           highlighted_segments = segment_list.slice(0); // copy array
        }

        console.log("updating highlighting.  Segs:  " +  highlighted_segments);

        var containers = Object.keys(figures);
        containers.forEach(function(container){
           if (container === selector)
            {
               // don't do anything,
            }
            else
            {
                // clear(container);
                console.log("for container: " +  container);
               figures[container].update_highlighted_segments(container);
            }
        });
    }
    make_binary(node) {
        if (node.branchset) { 
            var n = node.branchset.length;
            if (n > 2) {
                var i = n/2;
                var leftArray = node.branchset.slice(0,i);
                var rightArray = node.branchset.slice(i);

                var node_left = leftArray.length == 1 ?  leftArray[0] : this.create_node(node.name + "_left", leftArray, 0);
                var node_right = rightArray.length == 1 ?  rightArray[0] : this.create_node(node.name + "_right", rightArray, 0);
                node.branchset = [node_left, node_right];
            }
            this.make_binary(node.branchset[0]);
            this.make_binary(node.branchset[1]);
        }
    }
    create_node(arg_name, arg_children, arg_length){
        return { name: arg_name, branchset: arg_children, length: arg_length };
    }

    /* from StackOverflow, apparently based on Fisher-Yates shuffle  */
    shuffle(array) {
      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    }
    randomize_nodes(json) {
        if (json.branchset) {
            json['branchset'] = this.shuffle(json['branchset']);
            for (var branch in json["branchset"]) {
                this.randomize_nodes(json['branchset'][branch]);
            }
        }
    }
    // uses the "unique_id field as the target"
    swap_children(json, target) {
        var node, children;
        if (json == this.leftTree) {
            console.log("left json[" + this.leftNodeLookup.hasOwnProperty(target) + "]:" + json);
            node = this.leftNodeLookup[target];
            children = node['branchset'];
        }
        else {
            console.log("right json[" + this.rightNodeLookup.hasOwnProperty(target) + "]:" + json);
            node = this.rightNodeLookup[target];
            children = node['branchset'];
        }
        var n = children.length;
        for (var i = 0; i < n/2; i++) {
            var j = n - i - 1;
            var tmp = children[i];
            children[i] = children[j];
            children[j] = tmp;
        }
        node['branchset'] = children;
        return 1;
    }
    // this function will pass user click
    // to function
    highlight_from_node(isLeft=true)
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
        }
    }


    // this function sets up mouse events for nodes
    styleTreeNodes(selection, isLeft=true)
    {
        var cophy_obj = this;
        //console.log("c_o: " + cophy_obj);
        //console.dir( cophy_obj);
        selection.selectAll('g.leaf.node')
         .append("svg:circle")
         .attr("r", 1.5)
         .attr('stroke', "none")
         .attr('fill', 'red')
         .attr("pointer-events", "all") // enable mouse events to be detected even though no fill
         .on("click", this.highlight_from_node(isLeft));

      selection.selectAll('g.inner.node')
         .append("svg:circle")
         .attr("r", 3)
         .attr('stroke', "none")
         .attr('fill', 'orange')
         .attr("pointer-events", "all") // enable mouse events to be detected even though no fill
         .on("click", this.highlight_from_node(isLeft))
        ;

      selection.selectAll('g.root.node')
         .append('svg:circle')
         .attr("r", 1.5)
         .attr('fill', 'black')
         .attr('stroke', 'black')
    } // end styleTreeNodes

    findNode(whichTree, name) {
        var tree = whichTree === "left" ? this.leftDescendants : this.rightDescendants;
        return tree.filter(function(n) {
            return n.data.name === name ? true : false;
        })[0];
    }
}

/*
 * Utilities for reading and parsing URLs that point to newick files, asynchronously
 */
async function readBothNewickURLs(url1, url2) {
    var parsedFile1 = await getNewickFile(url1);
    var parsedFile2 = await getNewickFile(url2);
    return { nw1: parsedFile1, nw2: parsedFile2 };
}
// Define a function that returns a new "Promise"
function getNewickFile(url) {
    return new Promise(
        (resolve,reject) => {
            d3.text( url, function(error, parsed_text) {
                if (error) {
                    console.log("rejecting: " + error); // gives "rejecting [XMLHttpRequest]"
                    reject(error); return;
                }
                // Newick.parse does not have an error handler
                // but could it be called outside of and before "resolve()"
                // and the output evaluated for success/failure?
                resolve( Newick.parse(parsed_text) );
                if (url.match(/^blob:/)) {
                    console.log("unhooking blob resource");
                    window.URL.revokeObjectURL(url);
                }
            });
        }
    );
}

// Tree Node Mouse Events inherit TreeNodeMouseEvent
function TreeNodeMouseClickEvent(g_sel,u_sel,l_sel) {
    this.base = TreeNodeMouseEvent;
    this.base(g_sel,u_sel,l_sel);
    this.type = "TreeNodeMouseClick";
}
function TreeNodeMouseOverEvent(g_sel,u_sel,l_sel) {
    this.base = TreeNodeMouseEvent;
    this.base(g_sel,u_sel,l_sel);
    this.type = "TreeNodeMouseOver";
}
function TreeNodeMouseOutEvent(g_sel,u_sel,l_sel) {
    this.base = TreeNodeMouseEvent;
    this.base(g_sel,u_sel,l_sel);
    this.type = "TreeNodeMouseOut";
}
TreeNodeMouseClickEvent.prototype = new TreeNodeMouseEvent;
TreeNodeMouseOverEvent.prototype = new TreeNodeMouseEvent;
TreeNodeMouseOutEvent.prototype = new TreeNodeMouseEvent;
function TreeNodeMouseEvent(g_sel, u_sel, l_sel) {
    // selector strings that can be passed to d3.selectAll
    this.g_selector = g_sel;
    this.upper_selector = u_sel;
    this.lower_selector = l_sel;
}

// Tree Edge Mouse Events inherit TreeEdgeMouseEvent
function TreeEdgeMouseClickEvent(e_sel,f_sel,t_sel) {
    this.base = TreeEdgeMouseEvent;
    this.base(e_sel,f_sel,t_sel);
    this.type = "TreeEdgeMouseClick";
}
function TreeEdgeMouseOverEvent(e_sel,f_sel,t_sel) {
    this.base = TreeEdgeMouseEvent;
    this.base(e_sel,f_sel,t_sel);
    this.type = "TreeEdgeMouseOver";
}
function TreeEdgeMouseOutEvent(e_sel,f_sel,t_sel) {
    this.base = TreeEdgeMouseEvent;
    this.base(e_sel,f_sel,t_sel);
    this.type = "TreeEdgeMouseOut";
}
TreeEdgeMouseClickEvent.prototype = new TreeEdgeMouseEvent;
TreeEdgeMouseOverEvent.prototype = new TreeEdgeMouseEvent;
TreeEdgeMouseOverEvent.prototype = new TreeEdgeMouseEvent;
function TreeEdgeMouseEvent(e_sel, f_sel, t_sel) {
    // selector strings that can be passed to d3.selectAll
    this.edge_selector = e_sel;
    this.from_selector = f_sel;
    this.to_selector = t_sel;
}
