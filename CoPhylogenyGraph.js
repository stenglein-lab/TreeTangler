/*
 * Copyright 2017 David C. King and Mark Stenglein.
 * Using ECMAScript 2015 class definition wrapper around prototype inheritance.
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
 */


/* CoPhylogenyGraph
 * Methods and data for creating an SVG drawing
 * of a pair of phylogenetic trees that have the same leaf nodes, but different topologies.
 * Connecting lines are drawn between the leaves of both trees.
 */
class CoPhylogenyGraph {
    constructor(selector, width, height, userArgs = {}) {
        console.log("user args:");
        console.dir(userArgs);
        this.eventListeners = {};
        this.selector = selector; // canvas element in the DOM where drawing will take place
        this.width = width || selector.style('width') || selector.attr('width');
        this.height = height || selector.style('height') || selector.attr('height');
        this.userArgs = userArgs;

        // margins for SVG drawing area
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.yScaleFactor = 6;

        /* initialize some member variables ********/
        this.bridgeMap = undefined;
        // native tree objects are json objects parsed by Newick.js
        this.leftTree = null; // or should these be "undefined"
        this.rightTree = null;
        // varables act as globals during the node naming, unique for left and right trees
        this.leftTreeId = 0;
        this.rightTreeId = 0;
        /**** d3 objects created from the newick tree****/
        // d3 hierarchies are trees
        this.leftHierarchy = null;  // d3 hierarchy is the "tree", but the cluster object below must be called on
        this.rightHierarchy = null; // it in order to have it work.
        // d3.cluster() used to be defined in d3.layout.cluster()
        this.leftCluster = null;    // the cluster object is created with layout parameters, and is
        this.rightCluster = null;   // then called directly, e.g. leftCluster(hierarchy), without a return value
        // d3 descendants are nodes
        this.leftDescendants = null; // d3 leftHierarchy.descendants() acts as "nodes"
        this.rightDescendants = null;
        /*******************************************/
        this.currentDFoot = 0;
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
                    traverse(root.children[i], callback, arr)
                };
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
        // make these class variables if they need to be accessed later
        this.leftHierarchy = d3.hierarchy(this.leftTree, function(d) {return d.branchset;}); // "branchset" is the field named by Newick.js
        this.rightHierarchy = d3.hierarchy(this.rightTree, function(d) {return d.branchset;});

        this.leftDescendants = this.leftHierarchy.descendants(); // d3 "nodes"
        this.rightDescendants = this.rightHierarchy.descendants();
        // checking the overall drawing height
        console.log("check overall height:");
        var height_needed = this.yScaleFactor * this.leftDescendants.length;
        if (height_needed != this.height) {
            console.log("this.height " + this.height);
            console.log(' this.selector.attr("height"); ' + this.selector.attr("height"));
            console.log(' this.selector.style("height"); ' + this.selector.style("height"));
            this.overall_vis
                .style("height", height_needed)
                .attr("height", height_needed)
            ;
            this.height = height_needed;
            console.log("this.height " + this.height);
            console.log(' this.selector.attr("height"); ' + this.selector.attr("height"));
            console.log(' this.selector.style("height"); ' + this.selector.style("height"));
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
        this.tree2_edges = this.rightHierarchy.links();
    }

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
    addUniqueNodeIds(node, isLeft) { // traverse newick object, enumerate nodes
        if (! node.hasOwnProperty('unique_id')) {
            if (isLeft) {
                node['unique_id'] = "node_id_" + this.leftTreeId;
                this.leftTreeId++;
                //console.log('adding left tree unique_id: ' + node['unique_id']);
            }
            else {
                node['unique_id'] = "node_id_" + this.rightTreeId;
                this.rightTreeId++;
                //console.log('adding right tree unique_id: ' + node['unique_id']);
            }
        }
        for (var key in node) {
            if (node.hasOwnProperty(key)) { // why is this here?
                if (key == "branchset") {
                    for (var branch in node["branchset"]) {
                        this.addUniqueNodeIds(node["branchset"][branch], isLeft);
                    }
                }
            }
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
    }
    // renderTrees() called by Render() in async callback of readBothNewickURLs, 
    // or in any function that makes a change to the data and must trigger a redraw.
    renderTrees(leftTree, rightTree, rescale = true, redraw = true) { 
        // json format binary trees, processed from newick style text files by Newick.js.
        this.leftTree = leftTree;
        this.rightTree = rightTree;
        if (redraw) {
            var leftTreeStats = new Object();
            this.getTreeStats(this.leftTree, leftTreeStats);
            console.log("leftTreeStats histogram of node degrees", leftTreeStats['degree'].length);
            console.dir(leftTreeStats);
            this.addUniqueNodeIds(this.leftTree, true);
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
        //this.convert_newick_trees_to_d3();
        this.create_d3_objects_from_newick();
        //var tree1 = this.tree1;
        //var tree2 = this.tree2;
        //var tree1_nodes = this.tree1_nodes;
        //var tree2_nodes = this.tree2_nodes;
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

        // actually create paths between nodes
        this.tree1_g.selectAll(".link")
            .data(tree1_edges)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", diagonal);

        // actually create paths between nodes
        this.tree2_g.selectAll(".link")
            .data(tree2_edges)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", diagonal);

        // define whether it is a root, inner, or leaf node
        function define_node_position(n)
        {
            if (n.children)
            {
                if (n.depth == 0)
                {
                    return "root node";
                }
                else
                {
                    return "inner node";
                }
            }
            else
            {
                return "leaf node";
            }
        }

        // reposition nodes and add class
        this.tree1_g.selectAll(".node")
            .data(this.leftDescendants)
            .enter().append("g")
            .attr("class", define_node_position)
            .attr("transform", function (d)
            {
                return "translate(" + d.y + "," + d.x + ")";
            })

        this.tree2_g.selectAll(".node")
            .data(this.rightDescendants)
            .enter().append("g")
            .attr("class", define_node_position)
            .attr("transform", function (d)
            {
                return "translate(" + d.y + "," + d.x + ")";
            })

        this.styleTreeNodes(this.tree1_g, true); // I think this repeats what is done below
        this.styleTreeNodes(this.tree2_g, false);

        // add labels to nodes
        function snakeNameFormat(snakeName) {
            return snakeName.replace(/'/g, "").replace("snake", "").replace(/[SL]/, "").replace("_", "-");

        }
        this.tree1_g.selectAll('g.leaf.node')
            .append("text")
            .attr("dx", 8)
            .attr("dy", 3)
            .style("text-anchor", "start")
            // .style("cursor", "default") // make it not be a text cursor
            // .attr("pointer-events", "all")
            .text(function (d)
            {
                return snakeNameFormat(d.data.name);
                //return d.name;
            })
            .on("click", this.highlight_from_node(true));

        // add labels to nodes
        this.tree2_g.selectAll('g.leaf.node')
            .append("text")
            .attr("dx", -8)
            .attr("dy", 3)
            .style("text-anchor", "end")
            // .style("cursor", "default") // make it not be a text cursor
            // .attr("pointer-events", "all")
            .text(function (d)
            {
                return snakeNameFormat(d.data.name);
                //return d.name;
            })
            .on("click", this.highlight_from_node(false));

        // draw bridging lines
        this.drawBridgingLines();
        this.currentDFoot = this.dfoot();
        var draw_event = new Event('draw');
        this.dispatchEvent(draw_event);
    } // end renderTrees

    addEventListener(evt_str, f) {
        if (! this.eventListeners.hasOwnProperty(evt_str)) {
            this.eventListeners[evt_str] = Array();
        }
        this.eventListeners[evt_str].push(f);
    }
    dispatchEvent(evt) {
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
        console.log("json:" + json);

        if (json.hasOwnProperty('unique_id')) {
            console.log("json:" + json['unique_id'] + " ?= " + target);
        }
        if (json.hasOwnProperty('unique_id') && json['unique_id'] == target) {
            console.log("found target");
            if (json.hasOwnProperty('branchset')) {
                var children = json['branchset'];
                // reflect array order in-place
                var n = children.length;
                for (var i = 0; i < n/2; i++) {
                    var j = n - i - 1;
                    var tmp = children[i];
                    children[i] = children[j];
                    children[j] = tmp;
                }
                json['branchset'] = children;
                return 1;
            }
            else {
                console.log("error - target is a leaf node");
                return 0;
            }
        }
        if (json.hasOwnProperty('branchset')) {
            // continue searching
            var retval = 0;
            for (var branch in json["branchset"]) {
                if(this.swap_children(json["branchset"][branch], target)) {
                    return 1;
                }
            }
            return retval;
        }
        return 0;
    }
    // this function will pass user click
    // to function
    highlight_from_node(isLeft=true)
    {
        var cophy_obj = this;
        return function (n)
        {
            console.log("Cophy_obj: " + cophy_obj);
            var node = d3.select(this).datum();
            var node_id = node.name;
            console.log("node_id: " + node_id);
            console.dir(n);
            console.log("unique_id: " + n.data.unique_id);
            console.log("isLeft:" + isLeft);
            if (isLeft) {
                cophy_obj.swap_children(cophy_obj.leftTree, n.data.unique_id);
            }
            else { // right
                cophy_obj.swap_children(cophy_obj.rightTree, n.data.unique_id);
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
         .attr('fill', 'none')
         .attr("pointer-events", "all") // enable mouse events to be detected even though no fill
         .on("click", this.highlight_from_node(isLeft));

      selection.selectAll('g.inner.node')
         .append("svg:circle")
         .attr("r", 3)
         .attr('stroke', "none")
         .attr('fill', 'none')
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
 * Static functions for drawing SVG elements
 */
/*class SVGUtils {
    static color_scheme() { return  ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#b15928"]; }
    // several functions copied from:
    // from: https://gist.github.com/kueda/1036776
    // Copyright (c) 2013, Ken-ichi Ueda
    static rightAngleDiagonal()
    {
        var projection = function (d)
        {
            return [d.y, d.x];
        }
        var path = function (pathData)
        {
            return "M" + pathData[0] + ' ' + pathData[1] + " " + pathData[2];
        }

        function diagonal(diagonalPath, i)
        {
            var source = diagonalPath.source,
                target = diagonalPath.target,
                midpointX = (source.x + target.x) / 2,
                midpointY = (source.y + target.y) / 2,
                pathData = [source,
                    {
                        x: target.x,
                        y: source.y
                    },
                    target
                ];
            pathData = pathData.map(projection);
            return path(pathData)
        }
        diagonal.projection = function (x)
        {
            if (!arguments.length) return projection;
            projection = x;
            return diagonal;
        };
        diagonal.path = function (x)
        {
            if (!arguments.length) return path;
            path = x;
            return diagonal;
        };
        // this function returns a function
        return diagonal;
    }

    // this function adjusts node positions (node y values) based on their branch lengths
    static scaleBranchLengths(nodes, w, inverted)
    {
        // Visit all nodes and adjust y pos width distance metric
        var visitPreOrder = function(root, callback)
        {
            callback(root)
            if (root.children)
            {
                for (var i = root.children.length - 1; i >= 0; i--)
                {
                    visitPreOrder(root.children[i], callback)
                };
            }
        }
        visitPreOrder(nodes[0], function(node)
        {
            // rootdist is total distance from root node
            node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length || 0)
        });
        // an array of the root dists corresponding to nodes array
        // map creates a new array based on other array and function
        var rootDists = nodes.map(function(n)
        {
            return n.rootDist;
        });
        // var y_range = [0, (w / 3)]; // --> draw the tree on 1st 1/3 of the svg canvas
        var y_range = [0, (w * 0.37)]; // --> draw the tree on 1st 37% of the svg canvas
        if (inverted)
        {
            // y_range = [w, (w * 2 / 3)]; // --> draw the tree vertically reflected on last 1/3 of the svg canvas
            y_range = [w, (w * 0.63)]; // --> draw the tree vertically reflected on last 37% of the svg canvas
        }
        var yscale = d3.scale.linear()
            .domain([0, d3.max(rootDists)])
            .range(y_range);
        // here, we actually scale the tree node positions
        // according to the actual branch lengths
        visitPreOrder(nodes[0], function(node)
        {
            node.y = yscale(node.rootDist)
        });
        return yscale
    } // end scaleBranchLengths
} // end SVGUtils
*/
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
