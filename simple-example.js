/* var data = {
  "branchset": [
    {
      "name": "furry",
      "length": 0.14
    },
    {
      "name": "shelled",
      "length": 0.02
    },
    {
      "name": "fin/hopper/polywog",
      "branchset": [
        {
          "name": "rayfin",
          "length": 0.25
        },
        {
          "name": "hopper/pollywog",
          "branchset": [
            {
              "name": "hopper",
              "length": 0.02
            },
            {
              "name": "pollywog",
              "length": 0.01
            }
          ],
          "length": 0.12
        }
      ],
      "length": 0.09
    }
  ],
  "name": "Tree Root",
  "length": 0.05
}; */

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    g = svg.append("g").attr("transform", "translate(80,0)").attr("id", "dendrogram");

d3.text("simple-tree.newick",
    function(error, wormTree) {
            if (error) throw error; 
            drawCluster(Newick.parse(wormTree), true);
});
            

function traverse_newickJSON(json, depth=0, log=false) {
    if (log ) {
        var depth_str = "[" + depth + "]";
        for (var i=0; i < depth; i++) {
            depth_str = "___" + depth_str;
        }
    }
    if (! json.hasOwnProperty('unique_id')) {
        json['unique_id'] = "node_id_" + unique_id;
        unique_id++;
    }
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
            if (log) { console.log(depth_str + key + "-->" + json[key]); }
            if (key == "branchset") {
                for (var branch in json["branchset"]) {
                    if (log) { console.log(depth_str + "branch = " + branch); }
                    traverse_newickJSON(json["branchset"][branch], depth+1);
                }
            }
        }
    }
}

// uses the "unique_id field as the target"
function swap_children(json, target) {
    if (json.hasOwnProperty('unique_id') && json['unique_id'] == target) {
        console.log("found target");
        if (json.hasOwnProperty('branchset')) {
            var children = json['branchset'];
            json['branchset'] = [children[1], children[0]]; // swap the order
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
            retval |= swap_children(json["branchset"][branch], target);
        }
        return retval;
    }
    return 0;
}

var unique_id = 0;
function drawCluster(treeObject, rescale = false, redraw = false) {
    //console.dir(treeObject);
    traverse_newickJSON(treeObject);

    // the following commands create d3 objects that represent the cluster
    var root = d3.hierarchy(treeObject, function(d) {return d.branchset;});
    var cluster = d3.cluster().size([height, width - 160]);
    cluster(root);

    var links = root.links();
    var nodes = root.descendants();
    if (rescale) {
        SVGUtils.scaleBranchLengths(nodes, width, false);
    }


    var g = svg.select("#dendrogram");
    if (redraw) {
        g.selectAll(".node").remove();
        g.selectAll(".link").remove();
    }
    // this actually draws the structure by appending path elements to the svg
    var link = svg.select("#dendrogram").selectAll(".link")
            .data(links)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", SVGUtils.rightAngleDiagonal());


    var node = g.selectAll(".node")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", define_node_position)
        .attr("transform", function (d)
        {
            return "translate(" + d.y + "," + d.x + ")";
        })
        ;

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

    // labels
    var leaf_labels = 
            g.selectAll(".node.leaf")
            .append("text")
              .attr("x", 7)
              .attr("y", 4)
              .style("text-anchor", "start")
              .text(function(d) { return d.data.name; });
              
    var inner_labels = 
            g.selectAll(".node.inner")
            .append("text")
              .attr("x", 0)
              .attr("y", -1)
              .style("text-anchor", "end")
              .text(function(d) { return d.data.name; });

    var inner_circles = 
            g.selectAll(".node.inner")
              .append("svg:circle")
              .attr("r", 4.5)
              .attr("pointer-events", "all") // enable mouse events to be detected even though no fill
              .on("click", highlight_from_node)
            ;
    var leaf_circles = 
            g.selectAll(".node.leaf")
              .append("svg:circle")
              .attr("r", 5)
              .attr("pointer-events", "all") // enable mouse events to be detected even though no fill
              .on("click", highlight_from_node)
            ;

    function highlight_from_node(n) {
        console.log("--------- highlight from node --------");
        console.dir(n);
        console.log("got " + n.data.unique_id);
        swap_children(treeObject, n.data.unique_id);
        g.selectAll(".node").remove();
        drawCluster(treeObject,true, true);
    }
}
    
