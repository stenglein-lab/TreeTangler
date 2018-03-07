(function() {
    /* Extension to d3.hierarchy
     * Need a serial accessor that only returns one level at a time in order to build a truly hierarchical SVG.
     */
    d3 = require('d3');
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
                    rightNode = cophy_obj.findNode("right", leftNodeName);
                    rightNodeName = rightNode.data.name;
                }
                else {
                    rightNodeName = cophy_obj.bridgeMap.get(leftNodeName);
                    rightNode = cophy_obj.findNode("right", rightNodeName);
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
                            var seg_genotype = leftNodeName.match(/[SL]([0-9]+)/);
                            if (seg_genotype)
                            {
                                // match actually returns an array of results, the 2nd element is the one we want
                                var seg_genotype_number = seg_genotype[1];
                                // we'll have to cycle through colors if more than in our scheme
                                var color_index = seg_genotype_number % SVGUtils.SVGUtils.color_scheme().length;
                                return SVGUtils.SVGUtils.color_scheme()[color_index];
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
        };

        CoPhylogenyGraph.prototype.drawHierarchy = function(node, parentSelector, orientation=1, depth=0) 
        {
            this.d3NodeObj[ node.data.unique_id ] = node;
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
                //console.group("upper vs lower");
                //console.dir(node.children[0]);
                //console.dir(node.children[1]);
                if (node.children[0].x > node.children[1].x) { upper = 0; } // WHY is this inverted?
                //console.groupEnd();
            }
            var configure_edge_events = function(d3obj, event_constructor) {
                var group_sel = "#group_" + node.data.unique_id;
                var edge_sel = "#" + this.make_edge_id(d3obj.source, d3obj.target); //d3obj.source.data.unique_id + "_to_" + d3obj.target.data.unique_id;
                cophy_obj.dispatchEvent( new event_constructor(
                        edge_sel, 
                        group_sel, 
                        '#group_' + d3obj.target.data.unique_id));
            };
            g.selectAll(selector_str) // refer to the "g" element containing this level
                .data( childLinks ) // only the nuclear family
                .enter()
                .append("path")
                .attr("class", "link")
                .attr("d", SVGUtils.SVGUtils.rightAngleDiagonal())
                .attr("id", function(l) {
                    return cophy_obj.make_edge_id(l.source, l.target);
                    //return l.source.data.unique_id + "_to_" + l.target.data.unique_id;
                 })
                .attr("pointer-events", "stroke") 
                .on("mouseout", function(d3obj) { 
                    configure_edge_events(d3obj, TreeEdgeMouseOutEvent);
                })
                .on("mouseover", function(d3obj) { 
                    configure_edge_events(d3obj, TreeEdgeMouseOverEvent);
                })
                .on("click", function(d3obj) { 
                    configure_edge_events(d3obj, TreeEdgeMouseClickEvent);
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
