$ = require('jquery');
var bootstrap = require('bootstrap');
var bootslider = require('bootstrap-slider');
var cophylogeny = require('./lib/CoPhylogenyGraph');
var processFile = require('./lib/processFile');
var URLSearchParams = require('url-search-params');
$(document).ready(function() {
    // URL blobs needed for newick reader
    var leftURL = null,
        rightURL = null;

    // Have the buttons "click" the inputs
    var fileButtonLeft = $("#fileButtonLeft");
    var fileInputLeft = $("#fileInputLeft");
    fileInputLeft.change(function() {
        console.log("you are inside fileInputLeft.change");
        processFile.processFile(this.files);
    });
    fileButtonLeft.click(function() { 
        fileInputLeft.click();
    });

    var fileButtonMiddle = $("#fileButtonMiddle");
    var fileInputMiddle = $("#fileInputMiddle");
    fileButtonMiddle.click(function() {
        fileInputMiddle.click();
    });

    var fileButtonRight = $("#fileButtonRight");
    var fileInputRight = $("#fileInputRight");
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
    console.dir(urlparts);
    if (urlparts.length > 1) 
    {
        var query = new URLSearchParams(urlparts[1]);
        if (query.has("shuffle")) {
            user_args['shuffle'] = query.get("shuffle");
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
            return;
        }
    }
});
