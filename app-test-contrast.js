var bootstrap = require('bootstrap');
var bootslider = require('bootstrap-slider');
var contrast_styling = require('./lib/contrast-styling');

var d3 = require('d3');
var $ = require('jquery');
// dfoot from Orthobunyavirus_L versus M (although there are node-name-matching errors)
var data = [0,37,51,51,35,35,38,34,34,34,36,38,38,35,33,36,29,35,68,68,72,67,67,67,67,54,54,66,56,53,53,54,49,44,44,30,31,29,30,30,30,30,30,31,29,30,30,8,8,8,10,10,6,6,13,9,7,56,56,49,49,38,50,49,51,40,51,50,48,48,54,52,54,51,50,46,49,41,48,51,49,49,47,50,47,51,60,80,80,80,85,85,89,89,0,0];


/*
data.sort(function(a,b) { return a - b; });

// sigmoidal distribution scaling
// initialize variables
x_min = data[0];
x_max = data[data.length-1];
param_a = 0.01;
param_mid = (x_max + x_min)/2;
sigmoid_min = 0; 
sigmoid_max = 0;

// empirical cumulative distribution hash
ecdh = {};

// scan data backwards
var n = data.length;
for (var i = n - 1; i >= 0; i--) {
    d = data[i];
    if (! ecdh.hasOwnProperty(d)) {
        ecdh[d] = (i+1)/n;
    }
}

// ECDF
ecdf = [];
data.forEach(function(d) { ecdf.push( ecdh[d] ); });

var css_rules = {};

update_params(param_a, param_mid);

function sigmoid(x, a=param_a, midpoint=param_mid) {
    //return 1 / (1 - Math.pow(a, midpoint - x)); // not tested
    return  1 / (1 + Math.exp(-a*(x - midpoint)));
}
function sigmoid_scaled(x, a=param_a, midpoint=param_mid) {
    return (sigmoid(x,a,midpoint) - sigmoid_min) / (sigmoid_max - sigmoid_min);
}
function update_params(a, mid) {
    param_a = a;
    param_mid = mid;
    sigmoid_min = sigmoid(x_min, param_a, param_mid);
    sigmoid_max = sigmoid(x_max, param_a, param_mid);
}
function update_styles() {
    var sheets = document.styleSheets;
    var sheet = document.styleSheets[document.styleSheets.length - 1];

    for (var data_level in ecdh) {
        //var rule_name = ".data_level_" + data_level;
        //var f = ecdh[data_level];
        var x = +data_level;
        var f = sigmoid_scaled(x, param_a, param_mid);
        //var rgb = redBlue(f);
        var rgb = CS.colorScale(f);
        var rgb_hex = CS.objToHex(rgb);
        if (x == 49) {
            console.log(f, param_a, param_mid, rgb, rgb_hex);
        }
        //var rule_text = rule_name + " { fill: "  + rgb_hex + "}";
        //var index = sheet.cssRules.length - 1;
        //sheet.insertRule(rule_text, index);
        update_rule(data_level, rgb_hex, css_rules, sheet);
    }
}
function update_rule(data_level, rgb_hex, rules, sheet) { 
    var rule_name = ".data_level_" + data_level;
    var rule_text = rule_name + " { fill: "  + rgb_hex + "}";
    if (data_level in rules) {
        if (data_level == 30) {
            console.log("Edit rule 30");
        }
        if (sheet.rules[rules[data_level].index].selectorText != rule_name) { throw "TANTRUM"; }
        sheet.rules[rules[data_level].index].style.fill = rgb_hex;
    }
    else {
        var index = sheet.cssRules.length - 1;
        sheet.insertRule(rule_text, index);
        rules[data_level] = { index: index };
        if (data_level == 30) {
            console.log("Insert rule 30");
        }
    }
}
*/


$(document).ready(function() {
// make the graph
var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// set related styles in the slider
$('#ex1').css('width' , margin.width + 'px');
$('#ex1').css('margin-left', margin.left + 'px');


var CS = new contrast_styling(data, document.styleSheets[document.styleSheets.length - 1]);

var x = d3.scaleLinear()
    .range([0, width]);

var y = d3.scaleLinear()
    .range([height, 0]);


var svg = d3.select("body").insert("svg", ":first-child")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

/*
// define our own stylesheet to make use of the data levels
var sheets = document.styleSheets;
var sheet = document.styleSheets[ sheets.length - 1];
for (var data_level in ecdh) {
    var rule_name = ".data_level_" + data_level;
    var f = ecdh[data_level];
    //var rgb = redBlue(f);
    var rgb = CS.colorScale(f);
    var rgb_hex = CS.objToHex(rgb);
    //var rule_text = rule_name + " { fill: "  + rgb_hex + "}";
    //var index = sheet.cssRules.length - 1;
    //sheet.insertRule(rule_text, index);
    update_rule(data_level, rgb_hex, css_rules, sheet);
}
*/
// something d3 can use
var plot_data = [];
for (var i = 0; i < CS.length; i++) {
    //plot_data.push( { x: data[i], y: ecdf[i] } );
    plot_data.push( { x: CS.data[i], y: CS.quantiles[i] } );
}

// Compute the scales’ domains.
x.domain(d3.extent(plot_data, function(d) { return d.x; })).nice();
y.domain(d3.extent(plot_data, function(d) { return d.y; })).nice();

// Add the x-axis.
var bottom_axis = d3.axisBottom(x);
var left_axis = d3.axisLeft(y);
svg.append("g")
  .attr("class", "x axis")
  .attr("transform", "translate(0," + height + ")")
  .call(
    bottom_axis
  )
;

// Add the y-axis.
svg.append("g")
  .attr("class", "y axis")
  .call(
    left_axis
  )
;

var ffunc = function(d) {
    var yprime = -1;
    if (d.x == 30) {
        yprime = CS.sigmoid_scaled(d.x);
    }
    yprime = CS.sigmoid_scaled(d.x);
    return yprime;
};

// Add the points!
svg.selectAll(".point")
  .data(plot_data)
.enter().append("circle")
  .attr("class", "point")
  .attr("class", function(d) { return ["point data_level_" + d.x]; } )
  .attr("r", 4.5)
  .attr("cx", function(d) { return x(d.x); })
  .attr("cy", function(d) { return y(ffunc(d)); });

svg.selectAll(".point2")
  .data(plot_data)
.enter().append("circle")
  .attr("class", "point2")
  .attr("class", function(d) { return ["point2 data_level_" + d.x]; } )
  .attr("r", 4.5)
  .attr("cx", function(d) { return x(d.x); })
  .attr("cy", function(d) { return y(0); });

// hook into slider
var slide = $('#ex1').slider({
    tooltip: 'always',
    formatter: function(value) {
        $('#currentVertScaleLabel').text(value);
    }   
});
function update_points() {
    svg.selectAll(".point")
      .transition() 
      /*.attr("class", "point")
      .attr("class", function(d) { return ["point data_level_" + d.x]; } )
      .attr("r", 4.5)
      .attr("cx", function(d) { return x(d.x); })*/
      .attr("cy", function(d) { return y(ffunc(d)); });
}
function slideFuncMidPoint(slideEvt) {
    update_midpoint(slideEvt.value); 

}
function changeFuncMidPoint(changeEvt) {
    update_midpoint(changeEvt.value.newValue);
}
function update_midpoint(value) {
    CS.update_midpoint(value);
    CS.update_styles();
    update_points();
    $('#sliderText').text(value);
    $('#a_param').text(CS.param_a);
    $('#midpoint').text(CS.param_midpoint);
}
function slideFuncContrast(slideEvt) {
    update_contrast(slideEvt.value); 

}
function changeFuncContrast(changeEvt) {
    update_contrast(changeEvt.value.newValue);
}
function update_contrast(value) {
    CS.update_contrast(value);
    CS.update_styles();
    update_points();
    //$('#sliderText').text(value);
    $('#a_param').text(CS.param_a);
    $('#midpoint').text(CS.param_midpoint);
}
slide
    .on('change', changeFuncMidPoint)
    .on('slide', slideFuncMidPoint)
    .data('slider') // what is the purpose of this?
    ;
$('#ex1Slider').css('width', width + 'px');
$('#ex1Slider').css('margin-left', margin.left + 'px');

/////////////   slider for the "contrast" parameter
var slide2 = $('#ex2').slider({
    tooltip: 'always',
    reversed: true
});
slide2
    .on('change', changeFuncContrast)
    .on('slide', slideFuncContrast)
    .data('slider') // what is the purpose of this?
    ;
$('#ex2Slider').css('height', height + 'px');
$('#ex2Slider').css('margin-top', margin.top + 'px');
$('#ex2Slider').css('margin-left', margin.left + 'px');
$('#ex2Slider').css('margin-bottom', margin.bottom + 'px');
$('#ex2Slider').css('position', 'absolute');
$('#ex2Slider').css('top', '0px');
});

