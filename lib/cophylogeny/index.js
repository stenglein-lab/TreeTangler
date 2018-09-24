// this class organization is suggested by
// http://geekswithblogs.net/shaunxu/archive/2016/03/07/define-a-class-in-multiple-files-in-node.js.aspx
(function () {
    /*
     * Copyright 2017-2018 David C. King and Mark Stenglein.
     * Using ECMAScript 2015 class definition wrapper around prototype inheritance.
     * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
     */

    d3 = require('d3');
    SVGUtils = require('./SVGUtils');

    var CoPhylogenyGraph = function(selector, width, height, leftNw, rightNw, userArgs = {}) {
    // constructor
        this.eventListeners = {};
        this.selector = selector; // canvas element in the DOM where drawing will take place
        this.width = width || selector.style('width') || selector.attr('width');
        this.height = height || selector.style('height') || selector.attr('height');
        this.userArgs = userArgs;
        this.leftNodeLookup = {};
        this.rightNodeLookup = {};
        this.d3NodeObj = {}; // key off of unique_id

        this.persistentClasses = {}; // add classname = [d3selector,...]

        // margins for SVG drawing area
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.yScaleFactor = 6;

        /* initialize some member variables ********/
        this.bridgeMap = undefined;
        // native tree objects are json objects parsed by Newick.js
        this.leftTree = leftNw; // previously set by async call, this is now done outside CoPhylogeny
        this.rightTree = rightNw;
        // varables act as globals during the node naming, unique for left and right trees
        this.leftTreeId = 0;
        this.rightTreeId = 0;
        // names, to use for display
        this.leftTreeName = "leftTree";
        this.rightTreeName = "rightTree";
        /**** d3 objects created from the newick tree****/
        // d3 hierarchies are trees
        this.leftHierarchy = null;  // d3 hierarchy is the "tree", but the cluster object below must be called on
        this.rightHierarchy = null; // it in order to have it work.
        // d3-hierarchy.links are edges
        this.tree1_edges = null; // d3 leftHierarchy.links() acts as "edges"
        this.tree2_edges = null; 
        // d3.cluster() used to be defined in d3.layout.cluster()
        this.leftCluster = null;    // the cluster object is created with layout parameters, and is
        this.rightCluster = null;   // then called directly, e.g. leftCluster(hierarchy), without a return value
        // d3 descendants are nodes
        this.leftDescendants = null; // d3 leftHierarchy.descendants() acts as "nodes"
        this.rightDescendants = null;
        /*******************************************/
        this.currentDFoot = 0;

        // "get" constructs didn't pass linting
        Object.defineProperty(this, "svg_h", {
            get: function() {
                return this.height - this.margin.top - this.margin.bottom;
            }
        });
        Object.defineProperty(this, "svg_w", {
            get: function() {
                return this.width - this.margin.left - this.margin.right;
            }
        });
    };

    // partial class files
    require('./cophylogeny-addPersistentClass')(CoPhylogenyGraph);
    require('./cophylogeny-render')(CoPhylogenyGraph);
    require('./cophylogeny-compat')(CoPhylogenyGraph);
    require('./cophylogeny-treemods')(CoPhylogenyGraph);
    require('./cophylogeny-draw')(CoPhylogenyGraph);
    require('./cophylogeny-inspect')(CoPhylogenyGraph);
    require('./cophylogeny-events')(CoPhylogenyGraph);

    // overall export of the whole class
    exports = module.exports = CoPhylogenyGraph;

})();
