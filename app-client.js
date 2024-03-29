$ = require('jquery');
var d3 = require('d3');
var bootstrap = require('bootstrap');
var bootslider = require('bootstrap-slider');
var cophylogeny = require('./lib/cophylogeny');
var processFile = require('./lib/processFile');
var URLSearchParams = require('url-search-params');
var treetools = require('cophy-treetools'); // for make_binary

/************
* globals
*************/
userArgs = {uniform:false};
left__nw = null;
right__nw = null;
left__to__right = null;

/************
* helpers
*************/
function basename(pth) {
    pth = pth.replace('#','');
    var parts = pth.split('/');
    return parts[ parts.length - 1];
}
function padWithNBSP(str, maxlen) {
    var adj_str = str.substr(0,maxlen);
    var extra_sp = maxlen - adj_str.length;
    var remainder = extra_sp % 2;
    var base = (extra_sp-remainder) / 2;
    // left side 
    for (var i=0; i < base; i++) {
        str = ' ' + str;
    }
    // right side gets the extra space if necessary
    for (var j=0; j < (base+remainder); j++) {
        str = str + ' '; 
    }
    return str;
}

/************
* Main function
*************/
$(document).ready(function() {

    // some menu bar functions are connected here
    $('#svglink').on("click", function() {
        SVGExport();
    });
    $('#jsonlink').on("click", function() {
        export_JSON();
    });
    $('#newick_left_export').on("click", function() {
        export_newick("left");
    });
    $('#newick_right_export').on("click", function() {
        export_newick("right");
    });

    // keyboard shortcut for detangling
    $(document).keydown(function(e){
        var message = "The key code is " + e.which;
        console.log (message);

        // is this object defined?
        if (cophylogeny_fig != null)
        {
           // comma/less than key
           if (e.which == 188)
           {
              cophylogeny_fig.detangle_left();
              cophylogeny_fig.redraw();
           }
           // perod/greater than key
           else if (e.which == 190)
           {
              cophylogeny_fig.detangle_right();
              cophylogeny_fig.redraw();
           }
        }
    });

    // URL blobs needed for newick reader
    var leftURL = null,
        rightURL = null;

    // Have the buttons "click" the inputs
    var fileButtonLeft = $("#fileButtonLeft");
    var fileInputLeft = $("#fileInputLeft");
    fileInputLeft.change(function() {
        var file = this.files[0];
        var filename = file.name;
        // set a BLOB Left URL
        fileButtonLeft.text(filename);
        fileButtonLeft.removeClass(["btn-default"]);
        fileButtonLeft.addClass(["btn-pass"]);
        fileButtonLeft.attr("disabled","disabled");
        leftURL = processFile.getBlobURL(file);
        setNWFromURL(leftURL, 'left');
        /*if (rightURL) {
            loadData(leftURL, rightURL);
        }*/
    });
    fileButtonLeft.click(function() { 
        fileInputLeft.click();
    });

    var fileButtonMiddle = $("#fileButtonMiddle");
    var fileInputMiddle = $("#fileInputMiddle");
    fileInputMiddle.change(function() {
        processFile.processFile(this.files);
    });
    fileButtonMiddle.click(function() {
        fileInputMiddle.click();
    });

    var fileButtonRight = $("#fileButtonRight");
    var fileInputRight = $("#fileInputRight");
    fileInputRight.change(function() {
        var file = this.files[0];
        var filename = file.name;
        // set a BLOB Right URL
        fileButtonRight.text(filename);
        fileButtonRight.removeClass(["btn-default"]);
        fileButtonRight.addClass(["btn-pass"]);
        fileButtonRight.attr("disabled","disabled");
        rightURL = processFile.getBlobURL(file);
        // just load the data here...
        setNWFromURL(rightURL, "right");
    });
    fileButtonRight.click(function() {
        fileInputRight.click();
    });

    // hook into contrast slider
    var contrastSlider = $('#contrastSliderInput').slider(
    {
        reversed: true
    });
    contrastSlider
        .on('change', changeFuncContrast)
        .on('slide', slideFuncContrast)
        .data('slider') // what is the purpose of this?
    ;
    function slideFuncContrast(slideEvt) {
        update_contrast(slideEvt.value); 
    }
    function changeFuncContrast(changeEvt) {
        update_contrast(changeEvt.value.newValue);
    }
    function update_contrast(value) {
        cophylogeny_fig.stroke_style_object.update_contrast(value);
        cophylogeny_fig.stroke_style_object.update_styles();
        $('#bl-contrast-spn').text(cophylogeny_fig.stroke_style_object.param_a);
    }
    var midpointSlider = $('#midpointSliderInput').slider(
    {
        reversed: true,
        max: 90,
        value: 44
        /*max: cophylogeny_fig.stroke_style_object.x_max, // need to be set somewhere
        value: (cophylogeny_fig.stroke_style_object.x_max + cophylogeny_fig.stroke_style_object.x_min ) / 2 */
    });
    midpointSlider
        .on('change', changeFuncMidpoint)
        .on('slide', slideFuncMidpoint)
        .data('slider') // what is the purpose of this?
    ;
    function slideFuncMidpoint(slideEvt) {
        update_midpoint(slideEvt.value); 
    }
    function changeFuncMidpoint(changeEvt) {
        update_midpoint(changeEvt.value.newValue);
    }
    function update_midpoint(value) {
        cophylogeny_fig.stroke_style_object.update_midpoint(value);
        cophylogeny_fig.stroke_style_object.update_styles();
        $('#bl-midpoint-spn').text(cophylogeny_fig.stroke_style_object.param_midpoint);
    }

    // hook into scale slider
    var slider = $('#ex1').slider({
        reversed: true,
        formatter: function(value) {
            $('#currentVertScaleLabel').text(value);
        }
    });
    slider.on("change", function(evt) {
        var sliderValue = evt.value.newValue;
        if (! isNaN(sliderValue)) {
            cophylogeny_fig.yScaleFactor = sliderValue;
            cophylogeny_fig.redraw();
        }   
    });

    var phylogramCheck = $("#phylogramInput");
    phylogramCheck.on("change", function(evt) {
        userArgs.uniform = false;
        cophylogeny_fig.redraw();
    });

    var cladogramCheck = $("#cladogramInput");
    cladogramCheck.on("change", function(evt) {
        userArgs.uniform = true;
        cophylogeny_fig.redraw();
    });

    var user_args = {};
    var urlparts = window.location.href.split("?");

    if (urlparts.length > 1) 
    {
        var query = new URLSearchParams(urlparts[1]);
        if (query.has("shuffle")) {
            user_args.shuffle = query.get("shuffle");
        }
        if (query.has("left") && query.has("right"))
        {
            leftURL = query.get("left");
            leftName = basename(leftURL);
            setNWFromURL(leftURL, "left");
            rightURL = query.get("right");
            rightName = basename(rightURL);
            setNWFromURL(rightURL, "right");
            // Show input files on the title bar
            document.title += " " + leftName + " vs " + rightName;
            // Set buttons as they would be if file uploaded
            // deactivate left button
            fileButtonRight.addClass("btn-pass");
            fileButtonRight.attr('disabled', 'disabled');
            fileButtonRight.html(padWithNBSP(rightName, 24));
            fileButtonRight.css("white-space", "pre");
            // deactivate middle button
            fileButtonMiddle.addClass("btn-pass");
            fileButtonMiddle.attr('disabled', 'disabled');
            // deactivate right button
            fileButtonLeft.addClass("btn-pass");
            fileButtonLeft.html(padWithNBSP(leftName,24)); // name is used in graph code
            fileButtonLeft.css("white-space", "pre");
            fileButtonLeft.attr('disabled', 'disabled');
            //render_cophylogeny('#middle_container', 'unnamed', leftURL, rightURL, 700, user_args);
            return;
        }
    }

});
cophylogeny_fig = null;
function render_cophylogeny(selector, name, leftNw, rightNw, height, userArgs={}) {
    var container = d3.select(selector);
    var w = container.style("width");
    w = parseInt(w);
    var h = height;

    // in the multi-graphs, a function "clear" was called here to reset

    cophylogeny_fig = new cophylogeny(container, w, h, leftNw, rightNw, userArgs);

    cophylogeny_fig.leftTreeName = fileButtonLeft.innerHTML.trim(); 
    cophylogeny_fig.rightTreeName = fileButtonRight.innerHTML.trim();

    // here the left-to-right mapping document is applied, 
    // if it exists
    // add an updater (listener) for the dfoot measurement
    cophylogeny_fig.addEventListener("draw", function() {
        document.getElementById("sdfootSpan").textContent = cophylogeny_fig.currentDFoot;
    });

    // CoPhylogenyGraph.render sets up the graph
    cophylogeny_fig.render(leftNw, rightNw, w, h);
    
    // link in user functions
    $('#user_detangle_left').on("click", function() {
        cophylogeny_fig.detangle_left();
        cophylogeny_fig.redraw();
    });
    $('#user_detangle_right').on("click", function() {
        cophylogeny_fig.detangle_right();
        cophylogeny_fig.redraw();
    });

}

function setNWFromURL(url, which) {
    // deal with blob/no blob
    var blobsearch = url.search("blob");
    console.log(`search ${url} for blob: ${blobsearch}`);
    if (url.search("blob") == -1) {
        url = window.location.origin + "/" + url;
    }
    d3.text(url)
        .then(text => {
            newick = treetools.parse(text);
            if (which == 'left') {
                left__nw = newick;
                console.log('left');
                console.log(newick);
            }
            else {
                right__nw = newick;
                console.log('right');
                console.log(newick);
            }
            if (left__nw != null && right__nw != null) {
                // if [other] NW is set, check Congruency
                checkCongruency(left__nw, right__nw, left__to__right);
                // format into arbitralily binary trees for cophylogeny
                treetools.make_binary(left__nw);
                treetools.make_binary(right__nw);
                $('#graph').css('display', 'block');
                render_cophylogeny('#middle_container','unnamed', left__nw, right__nw, 700, userArgs);
            }
        })
        .catch(reason => {
            throw which + " tree could not be read:" + reason;
        })
    ;
}

function checkCongruency(leftNW, rightNW, map=null) {
    treetools.checkCongruency(leftNW, rightNW, map);
}
/* jshint ignore: end */

/* jshint ignore: start */
function SVGExport() {
    parseTransform = function (a)
    /*
    Modified from 
    https://stackoverflow.com/questions/17824145/parse-svg-transform-attribute-with-javascript
    to convert strings to floats
    */
    {
        var b={};
        for (var i in a = a.match(/(\w+\((\-?\d+\.?\d*e?\-?\d*,?)+\))+/g))
        {
            var c = a[i].match(/[\w\.\-]+/g);
            var op = c.shift();
            var vals = [];
            c.forEach(function(d) { vals.push(parseFloat(d)); });
            b[op] = vals;
        }
        
        return b;
    /*
    Running this

    parse('translate(6,5),scale(3,3.5),a(1,1),b(2,23,-34),c(300)');
    Will result in this:

    {
        translate: [ '6', '5' ],
        scale: [ '3', '3.5' ],
        a: [ '1', '1' ],
        b: [ '2', '23', '-34' ],
        c: [ '300' ]
    }
    */
    }
    collapseTransform = function(t) {

        var ops = [];

        if (t.hasOwnProperty("translate")) {
            var dx = t.translate[0];
            var dy = t.translate[1];
            var translate_str = `translate(${dx}, ${dy})`
            ops.push(translate_str);
        }

        if (t.hasOwnProperty("scale")) {
            var mx = t.scale[0];
            var my = t.scale[1];
            var scale_str = `scale(${mx}, ${my})`;
            ops.push(scale_str);
        }
        return ops.join(",");
    }
    //get svg element.
    var svgData = $("#cophy-graph");
    svgData.find("text").each(function() {
        var text_element = $(this);
        var str_tform = text_element.attr("transform");
        if (str_tform === undefined) {
            tform = { translate: [0,0], scale: [1,1] };
        }
        else {
            tform = parseTransform(str_tform);
        }
        var x_val = 0;
        var y_val = 0;
        x_val += parseFloat( text_element.attr("x") === undefined ? "0" : text_element.attr("x") );
        text_element.attr("x","0");
        x_val += parseFloat( text_element.attr("dx") === undefined ? "0" : text_element.attr("dx") ); 
        text_element.attr("dx","0");
        y_val += parseFloat( text_element.attr("y") === undefined ? "0" :text_element.attr("y") );
        text_element.attr("y","0");
        y_val += parseFloat( text_element.attr("dy") === undefined ? "0" :text_element.attr("dy") ); 
        text_element.attr("dy","0");
        tform.translate[0] += x_val;
        tform.translate[1] += y_val;

        text_element.attr("transform", collapseTransform(tform));
        
    });
    // get DOM object from Jquery object 
    svgData = svgData[0];
    svgData.setAttribute("version", "1.1");
    svgData.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // insert the SVG stylesheet into the DOM here
    var styleSheet = null;
    for (var i=0; i < document.styleSheets.length; i++){
        styleSheet = document.styleSheets[i];
        if (styleSheet.href.match(/cophylogeny\.css$/) ) {
            // just GET it and insert it into a STYLE tag of svgData
            d3.text( styleSheet.href )
                .then( text => { 
                    var styleObj = $('<style type="text/css">')[0];
                    styleObj.prepend( text );
                    svgData.prepend( styleObj );
                    var xmlHeader = '<?xml version="1.0" encoding="utf-8"?>';
                    var doctype = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
                    var svgText = xmlHeader + "\n" + doctype + "\n" + svgData.outerHTML;
                    var svgBlob = new Blob([svgText], {type:"image/svg+xml;charset=utf-8"});
                    var svgUrl = URL.createObjectURL(svgBlob);
                    var downloadLink = document.createElement("a");
                    downloadLink.href = svgUrl;
                    var name = cophylogeny_fig.leftTreeName + "_versus_" + cophylogeny_fig.rightTreeName;
                    downloadLink.download = name + ".svg";
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                } )
                .catch( reason => { console.error(reason); } );
            break;
        }
    }
    return;
}

function export_JSON() {
    var pack = Object.create(null);
    pack.leftTree = cophylogeny_fig.leftTree;
    pack.rightTree = cophylogeny_fig.rightTree;
    pack.scaleFactor = cophylogeny_fig.scaleFactor;
    pack.margin = cophylogeny_fig.margin;
    var txt = JSON.stringify(pack);
    
    var txtBlob = new Blob([txt], {type:"text/plain;charset=utf-8"});
    var txtURL = URL.createObjectURL(txtBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = txtURL;
    downloadLink.download = "app-state.JSON";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}


function export_newick(which_tree) {

    if (! cophylogeny_fig ) {
        alert("No trees to export!" + which_tree);
        return;
    }

    var nw_tree;
    if (which_tree == "left" ) {
        nw_tree = cophylogeny_fig.leftTree;
    }
    else {
        nw_tree = cophylogeny_fig.rightTree;
    }

    var txt = treetools.toString(nw_tree);
    // create the object
    var txtBlob = new Blob([txt], {type:"text/plain;charset=utf-8"});
    var txtURL = URL.createObjectURL(txtBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = txtURL;
    downloadLink.download = which_tree == "left" ? cophylogeny_fig.leftTreeName : cophylogeny_fig.rightTreeName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}


/* jshint ignore: end */
