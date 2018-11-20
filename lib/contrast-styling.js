/************* Module contrast-styling **************/
(function () {
    // imports
    var d3 = require('d3');
    var $ = require('jquery');

    // module object to be exported
    var ContrastStyling = function(data, stylesheet, attribute_to_color = 'fill') {
        this.data = data;
        this.stylesheet = stylesheet;
        this.attribute_to_color = attribute_to_color;
    /***

          Create a set of style classes in document.stylesheet taking the form 'data_level_d' for each unique value of 
        'd' in data. 
          Corresponding rules therefore will be expressed as '.data_level_d' and will assign graphics colors 
        to the data levels in a linear fashion, or smoothed or contrasted via a sigmoidal function.

                                                                                                                 ***/

        this.data.sort(function(a,b) { return a - b; });

        // parameters for the graphing eqn
        this.x_min = this.data[0];
        this.x_max = this.data[this.data.length-1];
        this.length = this.data.length;
        // default parameters for sigmoid
        this.param_a = 0.01;
        this.param_midpoint = (this.x_min+this.x_max)/2;

        // rules to be created and updated as user slides parameters
        this.css_rules = Object.create(null);

        // update upon parameter changes
        this.sigmoid_min = null;
        this.sigmoid_max = null;


        /** The Empirical Distribution Hash **/
        // Scan sorted data backwards
        // The last element (data[n-1]) corresponds to 1. 
        // The first element (data[0]) corresponds to 1 / n.
        // The data array is sorted, so ties are consecutive in the array.
        // Scanning backwards (high to low) assures that the lowest index 
        // is used for any given value in the array.
        // Quantiles: 
        // Build a new array, this time scanning forward (low to high)
        var ecdh = {};
        var n = this.length;
        for (var i = n - 1; i >= 0; i--) {
            var d = this.data[i];
            if (! ecdh.hasOwnProperty(d)) { ecdh[d] = (i+1)/n; }
        }
        var quantiles = [];
        this.data.forEach(function(d) { quantiles.push( ecdh[d] ); });
        this.ecdh = ecdh;
        this.quantiles = quantiles;

        this.update_params(this.param_a, this.param_midpoint);
        this.update_styles();
    };
    ContrastStyling.prototype.update_rule = function(data_level, rgb_hex) { 
        var sheet = this.stylesheet;
        var rules = this.css_rules;
        var rule_name = ".data_level_" + data_level;
        //var rule_text = rule_name + " { fill: "  + rgb_hex + "}";
        var rule_text = `${rule_name} { ${this.attribute_to_color}: ${rgb_hex}`;

        if (data_level in rules) { // update a rule we already set
            if (sheet.rules[rules[data_level].index].selectorText != rule_name) { throw "TANTRUM"; }
            sheet.rules[rules[data_level].index].style[this.attribute_to_color] = rgb_hex;
        }   
        else { // add a new rule
            var index = sheet.rules.length - 1;
            sheet.insertRule(rule_text, index);
            rules[data_level] = { index: index };
        }   
    };
    ContrastStyling.prototype.update_styles = function() {
        for (var data_level in this.ecdh) {
            var x = +data_level;
            var f = this.sigmoid_scaled(x);
            var rgb = this.colorScale(f);
            var rgb_hex = this.objToHex(rgb);
            this.update_rule(data_level, rgb_hex);
        }
    };
    ContrastStyling.prototype.update_midpoint = function(value) {
        this.update_params(this.param_a, value);
        this.update_styles();
    };
    ContrastStyling.prototype.update_contrast = function(value) {
        this.update_params(value, this.param_midpoint);
        this.update_styles();
    };
    ContrastStyling.prototype.update_params = function(a, midpoint) {
        this.param_a = a;
        this.param_midpoint = midpoint;
        this.sigmoid_min = this.sigmoid(this.x_min);
        this.sigmoid_max = this.sigmoid(this.x_max);
    };

    ContrastStyling.prototype.sigmoid = function(x) {
        //return 1 / (1 - Math.pow(a, midpoint - x)); // not tested
        return  1 / (1 + Math.exp(-this.param_a*(x - this.param_midpoint)));
    };
    ContrastStyling.prototype.sigmoid_scaled = function(x) {
        return (this.sigmoid(x,this.param_a, this.param_midpoint) - this.sigmoid_min) / (this.sigmoid_max - this.sigmoid_min);
    };
    

    /** color scales from d3 **/
    ContrastStyling.prototype.colorScale = function(f) {
        //return redBlue(f);
        //return plasma(f);
        //return cool(f);
        return warm(f);
        //return cubeHelixDefault(f);
        //return viridis(f);
        //return magma(f);
    };
    ContrastStyling.prototype.objToHex = function (obj) {

        // for use in style definition
        var hex = '#';
        hex += (obj.r < 16 ? '0' : '') + obj.r.toString(16);
        hex += (obj.g < 16 ? '0' : '') + obj.g.toString(16);
        hex += (obj.b < 16 ? '0' : '') + obj.b.toString(16);
        return hex;
    };

    function redBlue(f) {
    // given a value in {0,1}, give rgb interpolated through purple (red-0, blue-1)
        if (f > 1) { f = 1; }
        if (f < 0) { f = 0; }
        var red = Math.round(255 * f);
        var blue = Math.round(255 * (1 - f));
        return { r: red, g: 0, b: blue };
    }
    function blackRed(f) {
        if (f > 1) { f = 1; }
        if (f < 0) { f = 0; }
        return { r: Math.round(255 * f), g: 0, b: 0 };
    }
    function objectifyD3Output(val) {
        if (val.substr(0,1) == "#") {
            return hexToObj(val);
        }
        if (val.substr(0,4) == "rgb(") {
            var arr = val.substr(4, val.length - 5).split(',');
            var red = parseInt(arr[0]);
            var green = parseInt(arr[1]);
            var blue = parseInt(arr[2]);
            if (! isNaN(red) && ! isNaN(green) && ! isNaN(blue)) return { r: red, g: green, b: blue };
        }
        throw "Can't recognize color string:" + val;
    }
    function viridis(f) {
        return objectifyD3Output( d3.interpolateViridis(f) );
    }
    function cubeHelixDefault(f) {
        return objectifyD3Output( d3.interpolateCubehelixDefault(f) );
    }
    function cool(f) {
        return objectifyD3Output( d3.interpolateCool(f) );
    }
    function plasma(f) {
        return hexToObj(d3.interpolatePlasma(f));
    }
    function inferno(f) {
        return hexToObj(d3.interpolateInferno(f));
    }
    function magma(f) {
        return hexToObj(d3.interpolateMagma(f));
    }
    function warm(f) {
        return objectifyD3Output( d3.interpolateWarm(f) );
    }

    function hexToObj(hex) {
        return {
          r : parseInt(hex.substr(1,2), 16),
          g : parseInt(hex.substr(3,2), 16),
          b : parseInt(hex.substr(5,2), 16)
        };
    }

    // export module
    exports = module.exports = ContrastStyling;
})();
