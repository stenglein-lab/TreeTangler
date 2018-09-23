/*
 * Static functions for drawing SVG elements
 */
class SVGUtils {
    static color_scheme() { return  ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#b15928"]; }
    static blueToRed(n, green = 0) {
        var maxVal = 255;
        var blue = maxVal;
        var red = 0;
        var step = maxVal/n;
        var outarray = Array();
        for (var i = 0; i <= n; i++) {
            var hexval = '#';
            blue = Math.round(maxVal - i * step);        
            hexval += (blue < 16 ? '0' : '') + blue.toString(16);
            hexval += (green < 16 ? '0' : '') + green.toString(16);
            red = maxVal - blue;
            hexval += (red < 16 ? '0' : '') + red.toString(16);
            outarray.push(hexval);
        }
        return outarray;
    }
    // In Order Tree Traversal (d3 hiearchies). Children are evaluated last first.
    static visitPreOrder(root, callback)
    {
        callback(root);
        if (root.children)
        {
            for (var i = root.children.length - 1; i >= 0; i--)
            {
                SVGUtils.visitPreOrder(root.children[i], callback);
            }
        }
    }
    // several functions copied from:
    // from: https://gist.github.com/kueda/1036776
    // Copyright (c) 2013, Ken-ichi Ueda
    static rightAngleDiagonal()
    {
        var projection = function (d)
        {
            return [d.y, d.x];
        };
        var path = function (pathData)
        {
            return "M" + pathData[0] + ' ' + pathData[1] + " " + pathData[2];
        };
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
            return path(pathData);
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

    static nodeSum(node) {
        // rootdist is total distance from root node
        if (node.parent) {
            node.rootDist = node.parent.rootDist + (node.data.length || 0);
        }
        else {
            node.rootDist = node.data.length || 0;
        }
    }
    static uniformSum(node) {
        // rootdist is total distance from root node
        if (node.parent) {
            node.rootDist = node.parent.rootDist + 1;
        }
        else {
            node.rootDist = 1;
        }
    }

    // this function adjusts node positions (node y values) based on their branch lengths
    static scaleBranchLengths(nodes, w, inverted, uniform = false)
    {
        //console.log("------------- scaleBranchLengths ------------");
        // Visit all nodes and adjust y pos with distance metric
        SVGUtils.visitPreOrder(nodes[0], uniform ? SVGUtils.uniformSum : SVGUtils.nodeSum);

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
        SVGUtils.visitPreOrder(nodes[0], function(node)
        {
            node.y = yscale(node.rootDist);
        });
        return yscale;
    } // end scaleBranchLengths
} // end SVGUtils
module.exports = function() {};
module.exports = SVGUtils;
