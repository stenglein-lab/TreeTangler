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
    constructor(selector, width, height) {
        this.selector = selector; // canvas element in the DOM where drawing will take place
        console.dir(selector);
        this.width = width || selector.style('width') || selector.attr('width');
        this.height = height || selector.style('height') || selector.attr('height');

        // margins for SVG drawing area
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };

        /* initialize some member variables ********/
        this.bridgeMap = undefined;
        this.leftTreeId = 0;
        this.rightTreeId = 0;
        /*******************************************/
    }
    get svg_h() {
        return this.height - this.margin.top - this.margin.bottom;
    }
    get svg_w() {
        return this.width - this.margin.left - this.margin.right;
    }

    convert_newick_trees_to_d3() {
        // a two-item array that sets the layout size for d3.layout.cluster
        var d3_layout_bounds = [this.svg_h - this.margin.top - this.margin.bottom, 
                                this.svg_w - this.margin.left - this.margin.right];
        
        // specifies the separation between nodes on the graph
        function cluster_spread_fxn(a,b) {
            return a.parent == b.parent ? 1.5 : 1.8;
        }
        // return branchset: the object property created by Newick.js 
        function newick_node_fxn(node) {
            return node.branchset;
        }
        function init_d3_cluster() {
            return d3.layout.cluster().size( d3_layout_bounds )
                .children( newick_node_fxn )
                .separation( cluster_spread_fxn );
        }
        this.tree1 = init_d3_cluster();
        this.tree2 = init_d3_cluster();
        this.tree1_nodes = this.tree1.nodes(this.leftTree);
        console.dir(this.tree1_nodes);
        this.tree2_nodes = this.tree2.nodes(this.rightTree);
        this.tree1_edges = this.tree1.links(this.tree1_nodes);
        this.tree2_edges = this.tree2.links(this.tree2_nodes);
    }
    drawBridgingLines() {
        var cophy_obj = this;
        this.tree1_nodes.forEach(function (leftNode)
        {
            if (leftNode.children)
            {
                return false;
            }
            var leftNodeName = String(leftNode.name);
            // determine matching method
            if (undefined === cophy_obj.bridgeMap){
                 var rightNode = cophy_obj.findNode("right", leftNodeName);
                var rightNodeName = rightNode.name;
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

                var lineFunction = d3.svg.line()
                    .x(function (d)
                    {
                        return d.y;
                    })
                    .y(function (d)
                    {
                        return d.x;
                    })
                    .interpolate("bundle")
                    .tension(0.99);

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

    addUniqueNodeIds(node, isLeft) {
        if (! node.hasOwnProperty('unique_id')) {
            if (isLeft) {
                node['unique_id'] = "node_id_" + this.leftTreeId;
                this.leftTreeId++;
            }
            else {
                node['unique_id'] = "node_id_" + this.rightTreeId;
                this.rightTreeId++;
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
    renderTrees(leftTree, rightTree, rescale = true, redraw = true) {
        // json format binary trees, processed from newick style text files by Newick.js.
        this.leftTree = leftTree;
        this.rightTree = rightTree;
        if (redraw) {
            this.addUniqueNodeIds(this.leftTree, true);
            this.addUniqueNodeIds(this.rightTree, false);
            console.dir(this.leftTree);
        }
        
        this.convert_newick_trees_to_d3();
        var tree1 = this.tree1;
        var tree2 = this.tree2;
        var tree1_nodes = this.tree1_nodes;
        var tree2_nodes = this.tree2_nodes;
        var tree1_edges = this.tree1_edges;
        var tree2_edges = this.tree2_edges;

        // this repositions nodes based on actual branch lengths
        if (rescale) {
            var yscale = SVGUtils.scaleBranchLengths(tree1_nodes, this.svg_w - this.margin.left - this.margin.right, false);
            var yscale = SVGUtils.scaleBranchLengths(tree2_nodes, this.svg_w - this.margin.left - this.margin.right, true);
        }

        // shift everything down and right for the margins
        var margin_shift = "translate(" + (this.margin.left/2) + ", " + this.margin.top + ")";
        this.tree1_g = this.overall_vis.append("g") .attr("transform", margin_shift);
        this.tree2_g = this.overall_vis.append("g") .attr("transform", margin_shift);
        this.bridge_g = this.overall_vis.append("g") .attr("transform", margin_shift).attr("id", "bridge_g");

        // add labels
        var label_offset = 15;
        var left_label = this.tree1_g.append("text")
        .attr("class", "tree_label")
        .attr("x", label_offset)
        .attr("y", 0)
        .text(this.tree1_name);

        var right_label = this.tree2_g.append("text")
        .attr("class", "tree_label")
        .attr("x", this.svg_w - this.margin.left - this.margin.right - label_offset)
        .attr("y", 0)
        .style("text-anchor", "end")
        .text(this.tree2_name);

        // shared properties of both labels
        for (let label of [left_label, right_label]) {
            label.style("font-family", "Optima")
                .style("font-size","larger")
                .style("font-weight","bold")
                .style("font-style","oblique");
        }

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
            .data(tree1_nodes)
            .enter().append("g")
            .attr("class", define_node_position)
            .attr("transform", function (d)
            {
                return "translate(" + d.y + "," + d.x + ")";
            })

        this.tree2_g.selectAll(".node")
            .data(tree2_nodes)
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
                return snakeNameFormat(d.name);
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
                return snakeNameFormat(d.name);
                //return d.name;
            })
            .on("click", this.highlight_from_node(false));

        // draw bridging lines
        this.drawBridgingLines();
    } // end renderTrees

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
        // background
        this.overall_vis.append("rect")
         .attr("class", "background")
         .attr("width", this.svg_w)
         .attr("height", this.svg_h)
         .style("fill", "url(#gradient)");
          //.on("click", fade_all);

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
    // this function will highlight a bridge line
    // when user mouseovers a node
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
            console.log("unique_id: " + n.unique_id);
            console.log("isLeft:" + isLeft);
            //cophy_obj.highlight_by_id(node_id);
            //cophy_obj.transmit_new_highlighting();
        }
    };

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
        var tree = whichTree === "left" ? this.tree1_nodes : this.tree2_nodes;
        return tree.filter(function(n) {
            return n.name === name ? true : false;
        })[0];
    }
}

/*
 * Static functions for drawing SVG elements
 */
class SVGUtils {
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
