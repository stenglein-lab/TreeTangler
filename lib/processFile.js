var Newick = require('./newick');
var d3 = require('d3');

function getBlobURL(file)
{
    var fileURL = window.URL.createObjectURL(file);
    return fileURL;
}
function processUploadedNewick(file, aftermath)
{
    console.log("you are inside processUploadedNewick()");
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(evt)
    {
        var filetext = evt.target.result;
        nw = Newick.parse(filetext);
        console.dir(nw);
        //aftermath(nw);
    };
}
function processFile(files)
{
    console.log("you are inside processFile()");
    var file = files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(evt)
    {
        var filetext = evt.target.result;
        console.log(`processFile, reader.onload: ${filetext}`);
        var filer = new FileByLines(filetext);
        leftToRight = d3.map();

        var lineGenerator = filer.nextLine();
        var line = lineGenerator.next(); // line has 2 properties: value and done
        while (!line.done)
        {
            //console.dir(line);
            if (line.value)
            { // final newline splits to an empty array value
                var fields = line.value.split(/\s+/);
                leftToRight.set(fields[0], fields[1]);
            }
            else
            {
                console.log("skipping empty line");
            }
            line = lineGenerator.next();
        }
        
    };

}
class FileByLines  {
    constructor(filetext) {
        this.fileText = filetext;
        this.lines = filetext.split(/\r\n|\r|\n/g); // accounts for the three NEWLINE types

        // split: final line separator before EOF will result in a blank line
        if (! this.lines[this.lines.length-1]) {
            this.lines.splice(this.lines.length-1, 1); // delete final array element if blank
        }
        console.dir(this.lines);
    }

    *nextLine() { // *function() denotes a generator function
        for (var i in this.lines) {
            var line = this.lines[i];
            yield line;
        }
    }
}

function getNewickFromURL(url) {
/**
* Use like:
*  f(URL_Arg)
*       .then(value =>
*       {
*           console.log(value);
*       })
*       .catch(reason => {
*           console.log(reason);
*       });
* Where function f is declared "async", like so:
*
* async function f(url) {
*   var nw = await getNewickFromURL(url);
*   return nw; // this will be the "value" passed to "then", above,
*              // unless there is a failure, which will be passed as "reason" in "catch", above.
* }
*  
**/
    return new Promise(
        (resolve,reject) => {
            console.log(`about to try URL: ${url}`);
            console.dir(window);
            // figure out a fully qualified URL here so it doesn't get
            // lost in the depths of some library
            url = window.location.origin + "/" + url;
            console.log(`about to try URL: ${url}`);

            d3.text(url)
                .then(function(parsed_text) {
                    resolve( Newick.parse(parsed_text) );
                })
                .catch(function(reason) {
                    reject(reason);
                })
            ;
        }
    );
}

function uploadFile(file) {
    return new Promise(
        (resolve,reject) => {
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => resolve(reader.result); // passed to .then()
            reader.onerror = () => reject(reader.error);  // passed to .catch()
        }
    );
}

module.exports = function() {};
module.exports.processFile = processFile;
module.exports.getBlobURL = getBlobURL;
module.exports.processUploadedNewick = processUploadedNewick;
module.exports.getNewickFromURL = getNewickFromURL;

