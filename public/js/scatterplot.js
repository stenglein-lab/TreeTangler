var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scaleLinear()
    .range([0, width]);

var y = d3.scaleLinear()
    .range([height, 0]);

var color = d3.scaleOrdinal(d3.schemeCategory10);

var xAxis = d3.axisBottom()
    .scale(x);

var yAxis = d3.axisLeft()
    .scale(y)

var graphWidth = width + margin.left + margin.right;
var graphHeight = height + margin.top + margin.bottom;

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var filename = "first1000.txt";
//var filename = "2017-07-12_step5_rlog_counts.txt";
d3.tsv(filename, function(error, data) {
  if (error) throw error;

  // some columns are shifted 
  // convert some variables to numbers
  var counter = 0;
  data.forEach(function(d) {
    d.index = d['Row.names'];
    d.RowNames = d.elt2D_sorted_1;
    d.elt2D_sorted_1 = +d.elt2D_sorted_2;
    d.elt2D_sorted_2 = +d.elt2D_sorted_3;
    d.elt2D_sorted_3 = +d.elt2D_sorted_4;
    d.elt2D_sorted_4 = +d.elt2Delt7D_sorted_1;
    d.elt2Delt7D_sorted_1 = +d.elt2Delt7D_sorted_2;
    d.elt2Delt7D_sorted_2 = +d.elt2Delt7D_sorted_3;
    d.elt2Delt7D_sorted_3 = +d.wt_sorted_1;
    d.wt_sorted_1 = +d.wt_sorted_2;
    d.wt_sorted_2 = +d.wt_sorted_3;
    d.wt_sorted_3 = +d.wt_sorted_4;
    d.wt_sorted_4 = +d.elt7D_sorted_1;
    d.elt7D_sorted_1 = +d.elt7D_sorted_2;
    d.elt7D_sorted_2 = +d.elt7D_sorted_3;
    d.elt7D_sorted_3 = +d.sequence_id_list;
    d.m = Math.log(d.elt7D_sorted_1/d.wt_sorted_1,2);
    if (isNaN(d.m)) {
        d.m = 0;
    }
    d.m2 = Math.log(d.elt2Delt7D_sorted_1/d.wt_sorted_1);
    if (isNaN(d.m2)) {
        d.m2 = 0;
    }
    d.a = (d.wt_sorted_1+d.elt2Delt7D_sorted_1)/2;
    d.a2 = (d.wt_sorted_1+d.elt7D_sorted_1)/2;
    if (counter==0) {
        console.dir(d);
        counter = 1;
    }

  });

  console.dir(data);
  // set the domain and range
  x.domain(d3.extent(data, function(d) { return d.a; })).nice();
  var mExtent = d3.extent(data, function(d) { return d.m; });
  var mExtent2 = d3.extent(data, function(d) { return d.m2; });
  y.domain(d3.extent(d3.merge([mExtent, mExtent2]))).nice;

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("AVE")

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".7em")
      .style("text-anchor", "end")
      .text("LOG( elt2-;elt7- / WT )");

  svg.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", function(d) { return x(d.a); })
      .attr("cy", function(d) { return y(d.m); })
      .style("fill", function(d) { return color(d.RowNames); })
      .on("mouseover", function(d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html("<strong>gene name:</strong>" + d.RowNames + "<br/><strong>gene name:</strong>" + d.gene_name)
            .style("left", (d3.event.pageX + 5) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
      })
      .on("mousedown", function(d) {
        console.log(d);
        var obj = d3.select(d3.event.target);
        obj.raise();
        // flip the bit on a class called "selected"
        obj.classed("selected", ! obj.classed("selected"));

        console.log(d3.select(d3.event.target).attr("class"));
      })
    ;


    svg.append("rect")
        .attr("x", graphWidth - 100)
        .attr("y", 0)
        .attr("height", 50)
        .attr("width", 50)
        .style("fill", "red")
        .attr("class", "exp1")
        .on("click", function(d) {
            console.dir(d3.event.target);
            var rbutton = d3.select(d3.event.target);
            if (rbutton.classed("exp1")) {
                rbutton.attr("class", "exp2");
                d3.selectAll(".dot").transition().duration(2000)
                    .attr("cx", function(d) { return x(d.a2); })
                    .attr("cy", function(d) { return y(d.m2); })
                ;
            }
            else {
                rbutton.attr("class", "exp1");
                d3.selectAll(".dot").transition().duration(2000)
                    .attr("cx", function(d) { return x(d.a); })
                    .attr("cy", function(d) { return y(d.m); })
                ;
            }
        })
    ;
    


/*
  var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });


  legend.append("rect")
      .attr("x", width - 5)
      .attr("width", 5)
      .attr("height", 5)
      .style("fill", color);

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 5)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
*/
});
