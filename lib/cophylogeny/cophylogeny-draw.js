//CoPhylogeny = require('../../CoPhylogeny');
(function() {
    /* Extension to d3.hierarchy
     * Need a serial accessor that only returns one level at a time in order to build a truly hierarchical SVG.
     */
    d3 = require('d3');
    var stringSimilarity = require('string-similarity'); // to find the matches between trees

    d3.hierarchy.prototype.eachChild = function(callback) {
        var node = this;
        if (node.children) {
            for (var i = 0; i < node.children.length; i++) {
                callback(node.children[i]);
            }
        }
        return this;
    };
    d3.hierarchy.prototype.childLinks = function() { // non-recursive generator for one level of links
        var root = this, links = [];
        root.eachChild(function(node) {
            links.push({source: root, target: node});
        });
        return links;
    };
    exports = module.exports = function(CoPhylogenyGraph) {
        CoPhylogenyGraph.prototype.findNode = function(whichTree, name) {
            var tree = whichTree === "left" ? this.leftDescendants : this.rightDescendants;
            return tree.filter(function(n) {
                return n.data.name === name ? true : false;
            })[0];
        };
        CoPhylogenyGraph.prototype.make_edge_id = function(source, target) {
            return source.data.unique_id + "_to_" + target.data.unique_id;
        };
        CoPhylogenyGraph.prototype.drawBridgingLines = function() {
            var cophy_obj = this;
            var right_tree_names = cophy_obj.leaves(1);
            if (right_tree_names.length == 0) { throw new Error("NO RIGHT_TREE NAMES"); }
            cophy_obj.leftDescendants.forEach(function (leftNode)
            {
                var rightNode,rightNodeName;
                if (leftNode.children)
                {
                    return false;
                }
                var leftNodeName = String(leftNode.data.name);
                // determine matching method
                if (undefined === cophy_obj.bridgeMap){
                    // find the closest-matching right-tree name
                    //console.log("bestMatch for left{" + leftNodeName + "} versus ");
                    bestMatch = stringSimilarity.findBestMatch(leftNodeName, right_tree_names).bestMatch.target;
                    //console.dir(bestMatch);

                    //rightNode = cophy_obj.findNode("right", leftNodeName);
                    rightNode = cophy_obj.findNode("right", bestMatch);
                    if (undefined === rightNode) {
                        console.log("unable to find a match in RIGHT for " + leftNodeName + " using " + bestMatch);
                    }
                    else {
                        rightNodeName = rightNode.data.name;
                    }
                    //console.log("rightNodeName will be " + rightNodeName);
                }
                else {
                    rightNodeName = cophy_obj.bridgeMap.get(leftNodeName);
                    rightNode = cophy_obj.findNode("right", rightNodeName);
                }

                // draw bridging line if matched
                if (undefined === rightNode) {
                    console.log("couldn't match " + leftNodeName);
                    console.log("unable to find a match in RIGHT for " + leftNodeName + " using " + bestMatch);
                }
                else {

                    // measure the text to base the bridging line near it
                    var left_id = leftNode.data.unique_id;
                    if ( ! left_id ) {
                        throw new Error("leftNode.data.unique_id => left_id " + left_id);
                    }
                    var right_id = rightNode.data.unique_id;
                    if ( ! right_id ) {
                        throw new Error("rightNode.data.unique_id => right_id " + right_id);
                    }
                    var leftNodeDOM_Element = document.getElementById("label_" + left_id);
                    if ( ! leftNodeDOM_Element ) {
                        throw new Error("document.getElementById(left_id " + left_id + ") => " + leftNodeDOM_Element);
                    }
                    var rightNodeDOM_Element = document.getElementById("label_" + right_id);
                    if ( ! rightNodeDOM_Element ) {
                        throw new Error("document.getElementById(right_id " + right_id + ") => " + rightNodeDOM_Element);
                    }
                    var leftNodeTextWidth = leftNodeDOM_Element.getBBox().width;
                    if (! leftNodeTextWidth ) {
                        throw new Error("ERROR: leftNodeTextWidth is " + leftNodeTextWidth);
                    }
                    var rightNodeTextWidth = rightNodeDOM_Element.getBBox().width;
                    if (! rightNodeTextWidth ) {
                        throw new Error("ERROR: rightNodeTextWidth is " + rightNodeTextWidth);
                    }

                    var l_adj = leftNodeTextWidth + 15;
                    var r_adj = rightNodeTextWidth + 15;

                    var x1 = leftNode.x;
                    var y1 = leftNode.y + l_adj; 
                    var x2 = rightNode.x;
                    var y2 = rightNode.y - r_adj;
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
                        .attr("id", leftNodeName.replace(new RegExp(' ','g'),'_') + "_bridge")
                        .attr("pointer-events", "stroke") // only clicking on stroke works
                        .attr("stroke", function (d, i)
                        {
                            return cophy_obj.dfoot_color_scale[ cophy_obj.dfoot_obj.diffs[rightNodeName] ];
                        })
                        // .on("click", highlight_toggle);
                        .on("click", cophy_obj.highlight_from_node());
                    }
            });
        };

        CoPhylogenyGraph.prototype.drawHierarchy = function(node, parentSelector, orientation=1, depth=0) 
        {   
    
            // For a node, draw the hierarchy it contains and define functions that can be called 
            // with this node's unique ID string.

            var cophy_obj = this; // save ref to cophy_obj in subfunctions
            this.d3NodeObj[ node.data.unique_id ] = node;
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
                //console.group("upper vs lower");
                //console.dir(node.children[0]);
                //console.dir(node.children[1]);
                if (node.children[0].x > node.children[1].x) { upper = 0; } // WHY is this inverted?
                //console.groupEnd();
            }
            var configure_edge_events = function(d3obj, event_constructor) {
                console.dir(event_constructor);
                var group_sel = "#group_" + node.data.unique_id;
                var edge_sel = "#" + cophy_obj.make_edge_id(d3obj.source, d3obj.target); //d3obj.source.data.unique_id + "_to_" + d3obj.target.data.unique_id;
                cophy_obj.dispatchEvent( new event_constructor(
                        edge_sel, 
                        group_sel, 
                        '#group_' + d3obj.target.data.unique_id));
            };
            g.selectAll(selector_str) // refer to the "g" element containing this level
                .data( childLinks ) // only the nuclear family
                .enter()
                .append("path")
                .attr("class", "link0")
                .attr("d", SVGUtils.rightAngleDiagonal())
                .attr("id", function(l) {
                    return cophy_obj.make_edge_id(l.source, l.target);
                    //return l.source.data.unique_id + "_to_" + l.target.data.unique_id;
                 })
                .attr("pointer-events", "stroke") 
                .on("mouseout", function(d3obj) { 
                    configure_edge_events(d3obj, CoPhylogenyGraph.TreeEdgeMouseOutEvent);
                })
                .on("mouseover", function(d3obj) { 
                    configure_edge_events(d3obj, CoPhylogenyGraph.TreeEdgeMouseOverEvent);
                })
                .on("click", function(d3obj) { 
                    configure_edge_events(d3obj, CoPhylogenyGraph.TreeEdgeMouseClickEvent);
                    var pth_obj = d3.selectAll("#" + cophy_obj.make_edge_id(d3obj.source, d3obj.target));
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
            };

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
                   if (isNaN(d.x) || isNaN(d.y)) throw new Error("transform called with some bullshit");
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
                    configure_node_events(CoPhylogenyGraph.prototype.TreeNodeMouseOverEvent);
                })
                .on("mouseout", function(d3obj) {
                    var slctn = "#group_" + node.data.unique_id;
                    var obj = d3.selectAll(slctn);
                    obj.classed("highlighted", false);
                    configure_node_events(CoPhylogenyGraph.prototype.TreeNodeMouseOutEvent);
                })
                .on("click", function(d3obj) {
                    //Launch click event
                    configure_node_events(CoPhylogenyGraph.prototype.TreeNodeMouseClickEvent);
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
                    // return d.data.name.replace(/'/g, "").replace("snake", "").replace(/[SL]/, "").replace("_", "-"); // this needs to be replaced by a user-defined option
                    return d.data.name;
                })
                .attr("id", "label_" + node.data.unique_id)
                //.on("click", cophy_obj.highlight_from_node(true))
                ;

            if (node.children) {
                if (debug) console.log("About to draw..." + node.children);
                for (var i = 0; i < node.children.length; i++) {
                    if (debug) console.group([id_str(node.children[i])]);
                    this.drawHierarchy(node.children[i], selector, orientation, depth+1);
                }
            }
                
            if (debug) console.groupEnd();
        }; // end drawHierarchy

    }; //end exports enclosure
})();
