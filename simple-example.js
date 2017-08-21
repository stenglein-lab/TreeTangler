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
    g = svg.append("g").attr("transform", "translate(80,0)");

d3.text("simple-tree.newick",
    function(error, wormTree) {
            if (error) throw error; 
            drawCluster(Newick.parse(wormTree), true);
});
            

function drawCluster(treeObject, rescale = false) {
    console.dir(treeObject);

    // the following commands create d3 objects that represent the cluster
    var root = d3.hierarchy(treeObject, function(d) {return d.branchset;});
    var cluster = d3.cluster().size([height, width - 160]);
    cluster(root);

    var links = root.links();
    var nodes = root.descendants();
    console.dir(nodes);
    if (rescale) {
    var yscale = SVGUtils.scaleBranchLengths(nodes, width, false);
    }
    console.dir(yscale);

    // this actually draws the structure by appending path elements to the svg
    var link = g.selectAll(".link")
            .data(links)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", SVGUtils.rightAngleDiagonal());

    console.log("link: " + link);
    console.dir(link);

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
    console.log("node: " + node);
    console.dir(node);

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
        var tmp = n.children[0];
        n.children[0] = n.children[1];
        n.children[1] = tmp;
        console.log(treeObject);
        //drawCluster(treeObject,false);
    }
}
    
