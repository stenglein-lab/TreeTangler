$ = require('jquery');
var bootstrap = require('bootstrap');
var bootslider = require('bootstrap-slider');
var cophylogeny = require('./lib/CoPhylogenyGraph');
var processFile = require('./lib/processFile');
var URLSearchParams = require('url-search-params');
var Newick = require('newick');

/************
* globals
*************/
userArgs = {};


$(document).ready(function() {
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
        if (rightURL) {
            loadData(leftURL, rightURL);
        }
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
        if (leftURL) {
            loadData(leftURL, rightURL);
        }
    });
    fileButtonRight.click(function() {
        fileInputRight.click();
    });

    // hook into slider
    $('#ex1').slider({
        formatter: function(value) {
            $('#currentVertScaleLabel').text(value);
        }
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
            rightURL = query.get("right");
            // Show input files on the title bar
            document.title += " " + leftURL + " vs " + rightURL;
            // Set buttons as they would be if file uploaded
            // deactivate left button
            fileButtonRight.addClass("btn-pass");
            fileButtonRight.attr('disabled', 'disabled');
            fileButtonRight.innerHTML = rightURL; // name is used in graph code
            // deactivate middle button
            fileButtonMiddle.addClass("btn-pass");
            fileButtonMiddle.attr('disabled', 'disabled');
            // deactivate right button
            fileButtonLeft.addClass("btn-pass");
            fileButtonLeft.attr('disabled', 'disabled');
            fileButtonLeft.innerHTML = leftURL; // name is used in graph code
            //render_cophylogeny('#middle_container', 'unnamed', leftURL, rightURL, 700, user_args);
            loadData(leftURL, rightURL);
            return;
        }
    }
});

function render_cophylogeny(selector, name, leftNw, rightNw, height, userArgs={}) {
    var container = d3.select(selector);
    var w = container.style("width");
    w = parseInt(w);
    var h = height;

    // in the multi-graphs, a function "clear" was called here to reset

    var cophylogeny_fig = new cophylogeny.CoPhylogenyGraph(container, w, h, userArgs);

    cophylogeny_fig.tree1_name = fileButtonLeft.innerHTML;
    console.log("name1 is " + cophylogeny_fig.tree1_name);
    cophylogeny_fig.tree2_name = fileButtonRight.innerHTML;
    console.log("name2 is " + cophylogeny_fig.tree2_name);

    // here the left-to-right mapping document is applied, 
    // if it exists
}

function loadData(leftURL, rightURL) {
    getNewicksAsync(leftURL, rightURL)
        .then(nwTrees => // nwTrees: newick objects
        {
            render_cophylogeny('#middle_container','unnamed', nwTrees.left, nwTrees.right, 700, userArgs);
        })
        .catch(reason => {
            // there was an error
            console.log(reason);
        });
}
/* The JSHint does not recognize async/await */
/* jshint ignore: start */
async function getNewicksAsync(leftURL, rightURL) {
    var leftNw = await processFile.getNewickFromURL(leftURL);
    var rightNw = await processFile.getNewickFromURL(rightURL);
    console.log("getNewicksAsync:" + leftNw);
    console.log("getNewicksAsync:" + rightNw);
    return {left:leftNw, right:rightNw};
}
/* jshint ignore: end */
