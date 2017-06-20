/*
 * Copyright 2017 David C. King and Mark Stenglein.
 * Using ECMAScript 2015 class definition wrapper around prototype inheritance.
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
 */

/*
 * Utilities for reading and parsing URLs that point to newick files, asynchronously
 */
async function readBothNewickURLs(url1, url2) {
    var parsedFile1 = await getNewickFile(url1);
    var parsedFile2 = await getNewickFile(url2);
    return { nw1: parsedFile1, nw2: parsedFile2 };
}
// Define a function that returns a new "Promise"
function getNewickFile(url) {
    return new Promise(
        (resolve,reject) => {
            d3.text( url, function(error, parsed_text) {
                if (error) {
                    console.log("rejecting: " + error); // gives "rejecting [XMLHttpRequest]"
                    reject(error); return;
                }
                // Newick.parse does not have an error handler
                // but could it be called outside of and before "resolve()" 
                // and the output evaluated for success/failure?
                resolve( Newick.parse(parsed_text) ); 
            });
        }
    );
}
/* CoPhylogenyGraph
 * Methods and data for creating an SVG drawing 
 * of a pair of phylogenetic trees that have the same leaf nodes, but different topologies.
 * Connecting lines are drawn between the leaves of both trees.
 */
class CoPhylogenyGraph {
    constructor(selector, width, height) {
        this.selector = selector; // canvas element in the DOM where drawing will take place
        this.width = width || sel.style('width') || sel.attr('width');
        this.height = height || sel.style('height') || sel.attr('height');

        // margins for SVG drawing area
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    }
    get svg_h() {
        return this.height - margin.top - margin.bottom;
    }
    get svg_w() {
        return this.width - margin.left - margin.right;
    }
    setTrees(leftTree, rightTree) {
        // json format binary trees, processed from newick style text files.
        this.leftTree = leftTree;
        this.rightTree = rightTree;
    }
    render(leftTreeURL, rightTreeURL) {
        
        // create an SVG canvas area
        overall_vis = sel.append("svg")
          .attr("width", svg_w)
          .attr("height", svg_h)
          .attr("transform", "translate(" + margin.left + ", " + margin.top + ")") ;

        // plain white background
        overall_vis.append("rect")
         .attr("class", "background")
         .attr("width", svg_w)
         .attr("height", svg_h)
          .on("click", fade_all);

        // since d3.text is asynchronous, handle through async/Promise construct
        readBothNewickURLs(leftTreeURL, rightTreeURL)
            .then(v => {
                console.dir(v);
                setTrees(v.nw1, v.nw2);
                //////////////////////// call render trees ////////////////////
            })
            .catch(reason => {
                console.log(reason.statusText + ": " + reason.responseURL); 
            });
    }
}
