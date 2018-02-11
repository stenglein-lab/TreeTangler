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

    static scaleBranchLengthsToWidth(nodes, width, inverted)
    {
        function visitPreOrder(root, callback)
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
        function nodeSum(node) {
            // rootdist is total distance from root node
            //node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length || 0);
            if (node.parent) {
                //console.log("nodeSum: node has parent:" + node.parent.rootDist);
                //console.log("nodeSum: node.length:" + node.data.length);
                node.rootDist = node.parent.rootDist + (node.data.length || 0);
            }
            else {
                //console.log("nodeSum: node has no parent, use node.length || 0");
                node.rootDist = node.data.length || 0;
            }
        }
        visitPreOrder(nodes[0], nodeSum);
        // an array of the root dists corresponding to nodes array
        // map creates a new array based on other array and function 
        var rootDists = nodes.map(function(n)
        {
            return n.rootDist;
        });
        var y_range = [0, width ]; // --> draw the tree all the way to "width"
        if (inverted)
        {
            y_range = [width, 0]; // --> horizontally reflected
        }
        var yscale = d3.scaleLinear()
            .domain([0, d3.max(rootDists)])
            .range(y_range);

        // here, we actually scale the tree node positions
        // according to the actual branch lengths
        visitPreOrder(nodes[0], function(node)
        {
            node.y = yscale(node.rootDist)
        });
        return yscale
    } // end scaleBranchLengthsToWidth

    // this function adjusts node positions (node y values) based on their branch lengths
    static scaleBranchLengths(nodes, w, inverted)
    {
        //console.log("------------- scaleBranchLengths ------------");
        // Visit all nodes and adjust y pos with distance metric
        function visitPreOrder(root, callback)
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
        function nodeSum(node) {
            // rootdist is total distance from root node
            //node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length || 0);
            if (node.parent) {
                //console.log("nodeSum: node has parent:" + node.parent.rootDist);
                //console.log("nodeSum: node.length:" + node.data.length);
                node.rootDist = node.parent.rootDist + (node.data.length || 0);
            }
            else {
                //console.log("nodeSum: node has no parent, use node.length || 0");
                node.rootDist = node.data.length || 0;
            }
        }
        visitPreOrder(nodes[0], nodeSum);

        // an array of the root dists corresponding to nodes array
        // map creates a new array based on other array and function 
        var rootDists = nodes.map(function(n)
        {
            return n.rootDist;
        });
        //console.log(rootDists);
        // var y_range = [0, (w / 3)]; // --> draw the tree on 1st 1/3 of the svg canvas
        var y_range = [0, (w * 0.37)]; // --> draw the tree on 1st 37% of the svg canvas
        //var y_range = [0, (w)]; // --> draw the tree on 1st 37% of the svg canvas
        if (inverted)
        {
            // y_range = [w, (w * 2 / 3)]; // --> draw the tree vertically reflected on last 1/3 of the svg canvas
            y_range = [w, (w * 0.63)]; // --> draw the tree vertically reflected on last 37% of the svg canvas
        }
        var yscale = d3.scaleLinear()
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
var SVGUtilsModule = function() {};
module.exports = SVGUtilsModule;
module.exports.SVGUtils = SVGUtils;
