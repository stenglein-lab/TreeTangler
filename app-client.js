$ = require('jquery');
var bootstrap = require('bootstrap');
var bootslider = require('bootstrap-slider');
var cophylogeny = require('./lib/CoPhylogenyGraph');
$(document).ready(function() {
    // URL blobs needed for newick reader
    var leftURL = null,
        rightURL = null;

    // hook into the html buttons and inputs
    var fileButtonLeft = document.getElementById("fileButtonLeft"),
        fileInputLeft = document.getElementById("fileInputLeft");
    var fileButtonMiddle = document.getElementById("fileButtonMiddle"),
        fileInputMiddle = document.getElementById("fileInputMiddle");
    var fileButtonRight = document.getElementById("fileButtonRight"),
        fileInputRight = document.getElementById("fileInputRight");

    // hook into slider
    $('#ex1').slider({
        formatter: function(value) {
            $('#currentVertScaleLabel').text(value);
        }
    });
});
