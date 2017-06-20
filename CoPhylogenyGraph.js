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
    }
    get svg_h() {
        return this.height - this.margin.top - this.margin.bottom;
    }
    get svg_w() {
        return this.width - this.margin.left - this.margin.right;
    }
    renderTrees(leftTree, rightTree) {
        // json format binary trees, processed from newick style text files.
        this.leftTree = leftTree;
        this.rightTree = rightTree;

        var tree1 = d3.layout.cluster().size([this.svg_h - this.margin.top - this.margin.bottom, this.svg_w - this.margin.left - this.margin.right])
            .children(function (node) { return node.branchset; })
            .separation(function (a, b) {
                return a.parent == b.parent ? 1.5 : 1.8;
        });

        var tree2 = d3.layout.cluster().size([this.svg_h - this.margin.top - this.margin.bottom, this.svg_w - this.margin.left - this.margin.right])
            .children(function (node) { return node.branchset; })
            .separation(function (a, b) {
                return a.parent == b.parent ? 1.5 : 1.8;
        });

        // TODO: can be CoPhylogenyGraph member functions
        var tree1_nodes = tree1.nodes(leftTree);
        var tree1_edges = tree1.links(tree1_nodes);

        var tree2_nodes = tree2.nodes(rightTree);
        var tree2_edges = tree2.links(tree2_nodes);

        // this repositions nodes based on actual branch lengths
        var yscale = SVGUtils.scaleBranchLengths(tree1_nodes, this.svg_w - this.margin.left - this.margin.right, false);
        var yscale = SVGUtils.scaleBranchLengths(tree2_nodes, this.svg_w - this.margin.left - this.margin.right, true);

        this.tree1_g = this.overall_vis.append("g") .attr("transform", "translate(" + this.margin.left + ", " + this.margin.top + ")") ;
        this.tree2_g = this.overall_vis.append("g") .attr("transform", "translate(" + this.margin.left + ", " + this.margin.top + ")") ;
        this.bridge_g = this.overall_vis.append("g") .attr("transform", "translate(" + this.margin.left + ", " + this.margin.top + ")").attr("id", "bridge_g") ;

        // add labels
        this.tree1_g.append("text")
        .attr("class", "tree_label")
        .attr("x", 0)
        .attr("y", 0)
        .text(this.tree1_name);

        this.tree2_g.append("text")
        .attr("class", "tree_label")
        .attr("x", this.svg_w - this.margin.left - this.margin.right)
        .attr("y", 0)
        .style("text-anchor", "end")
        .text(this.tree2_name);

    } // end renderTrees



    render(leftTreeURL, rightTreeURL) {
        
        // create an SVG canvas area
        this.overall_vis = this.selector.append("svg")
          .attr("width", this.svg_w)
          .attr("height", this.svg_h)
          .attr("transform", "translate(" + this.margin.left + ", " + this.margin.top + ")") ;

        // plain white background
        this.overall_vis.append("rect")
         .attr("class", "background")
         .attr("width", this.svg_w)
         .attr("height", this.svg_h);
          //.on("click", fade_all);

        // since d3.text is asynchronous, handle through async/Promise construct
        readBothNewickURLs(leftTreeURL, rightTreeURL)
            .then(v => {
                console.dir(v);
                this.renderTrees(v.nw1, v.nw2);
                /////////// tree data synchronized: render trees ////////////////////
            })
            .catch(reason => {
                console.log(reason);
                //console.log(reason.statusText + ": " + reason.responseURL); 
            });
    }
    // once the SVG tree has objects...
    // this function sets up mouse events for nodes
    styleTreeNodes(selection)
    {
        var cophy_obj = this;
        console.log("c_o: " + cophy_obj);
        console.dir( cophy_obj);
        selection.selectAll('g.leaf.node')
         .append("svg:circle")
         .attr("r", 5)
         .attr('stroke', "none")
         .attr('fill', 'none')
         .attr("pointer-events", "all") // enable mouse events to be detected even though no fill
         .on("click", highlight_from_node(cophy_obj));

      selection.selectAll('g.inner.node')
         .append("svg:circle")
         .attr("r", 5)
         .attr('stroke', "none")
         .attr('fill', 'none')
         .attr("pointer-events", "all"); // enable mouse events to be detected even though no fill

      selection.selectAll('g.root.node')
         .append('svg:circle')
         .attr("r", 1.5)
         .attr('fill', 'black')
         .attr('stroke', 'black')
    } // end styleTreeNodes

    get_segment_node_pair(nodeName, nodes_1, nodes_2) 
    {
        function match_filter(n) 
        {
            if (n.name === nodeName) {
                return true;
            } else {
                return false;
            }
        }
        nodes_1_match = nodes_1.filter(match_filter);
        console.log("Node name is " + nodeName);
        console.dir(nodes_1_match[0]);
        nodes_2_match = nodes_2.filter(match_filter);
        // TODO - error if match >1 node
        return [nodes_1_match[0], nodes_2_match[0]];
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
            });
        }
    );
}
/*
 * Static functions for drawing SVG elements
 */
class SVGUtils {
    // several functions copied from:
    // from: https://gist.github.com/kueda/1036776
    // Copyright (c) 2013, Ken-ichi Ueda
    static rightAngleDiagonal()
    {
         var projection = function(d)
         {
            return [d.y, d.x];
         }
         var path = function(pathData)
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
         diagonal.projection = function(x)
         {
            if (!arguments.length) return projection;
            projection = x;
            return diagonal;
         };
         diagonal.path = function(x)
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
        })
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
        })
        return yscale
    } // end scaleBranchLengths
} // end SVGUtils

