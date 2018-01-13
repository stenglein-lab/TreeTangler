var leftToRight = undefined; // will this be in scope?
function processFile(files)
{
    var file = files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(evt)
    {
        var filetext = evt.target.result;
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

function load()
{
    console.log("load...");

    slider = new Slider('#ex1', {
        reversed: true
    });

    slider.on("change", function(evt) {
        var sliderValue = evt.newValue;
        document.getElementById("currentVertScaleLabel").textContent = sliderValue;
    });



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

    var user_args = {};
    var urlparts = window.location.href.split("?");
    if (urlparts.length > 1)
    {
        var query = new URLSearchParams(urlparts[1]);
        console.dir(urlparts);
        if (query.has("shuffle")) {
            user_args['shuffle'] = query.get("shuffle");
        }
        if (query.has("left") && query.has("right"))
        {
            leftURL = query.get("left");
            rightURL = query.get("right");
            // add input files to the title bar
            document.title += " " + leftURL + " vs " + rightURL;
            // set buttons as they would be if file uploaded
            // deactivate left button
            fileButtonRight.classList.add("btn-pass");
            fileButtonRight.setAttribute('disabled', 'disabled');
            fileButtonRight.innerHTML = rightURL; // name is used in graph code
            // deactivate middle button
            fileButtonMiddle.classList.add("btn-pass");
            fileButtonMiddle.setAttribute('disabled', 'disabled');
            // deactivate right button
            fileButtonLeft.classList.add("btn-pass");
            fileButtonLeft.setAttribute('disabled', 'disabled');
            fileButtonLeft.innerHTML = leftURL; // name is used in graph code
            render_cophylogeny('#middle_container', 'unnamed', leftURL, rightURL, 700, user_args);
            return;
        }

    }
    fileButtonLeft.addEventListener("click", function(e)
    {
        if (fileInputLeft)
        {
            fileInputLeft.click();
        }
    }, false);
    fileButtonMiddle.addEventListener("click", function(e)
    {
        if (fileInputMiddle)
        {
            fileInputMiddle.click();
        }
    }, false);
    fileButtonRight.addEventListener("click", function(e)
    {
        if (fileInputRight)
        {
            fileInputRight.click();
        }
    }, false);
}

function clear(selector)
{
    selector = selector.replace("#", ""); // # not necessary for getElementById (only for css/d3)
    var myNode = document.getElementById(selector);
    while (myNode.firstChild)
    {
        myNode.removeChild(myNode.firstChild);
    }
}

function getBlobURL(files)
{
    var file = files[0];
    var fileURL = window.URL.createObjectURL(file);
    return fileURL;
    //window.URL.revokeObjectURL(fileURL);
}

function setLeftURL(files)
{
    fileButtonLeft.innerHTML = files[0].name;
    // switch the button to something indicating success
    fileButtonLeft.classList.remove("btn-default");
    //fileButtonLeft.classList.add("btn-success");
    fileButtonLeft.classList.add("btn-pass");
    fileButtonLeft.setAttribute('disabled', 'disabled');
    leftURL = getBlobURL(files);
    console.log("leftURL:" + leftURL);
    if (typeof rightURL === 'undefined')
    {
        console.log("rightURL is undefined.");
    }
    else
    {
        callRender();
    }
}

function setRightURL(files)
{
    fileButtonRight.innerHTML = files[0].name;
    // switch the button to something indicating success
    fileButtonRight.classList.remove("btn-default");
    //fileButtonRight.classList.add("btn-success");
    fileButtonRight.classList.add("btn-pass");
    fileButtonRight.setAttribute('disabled', 'disabled');
    rightURL = getBlobURL(files);
    console.log("rightURL:" + rightURL);
    if (typeof leftURL === 'undefined')
    {
        console.log("leftURL is undefined.");
    }
    else
    {
        callRender();
    }
}

function callRender()
{
    render_cophylogeny('#middle_container', 'unnamed', leftURL, rightURL, 700);
}

function render_cophylogeny(container_id, segment_id, newick_url_1, newick_url_2, height, userArgs = {})
{
    var container_sel = d3.select(container_id);
    var w = container_sel.style("width");
    w = parseInt(w);
    // var w = 600;
    var h = height;

    // process newick trees from file upload
    newick_file_1 = newick_url_1;
    newick_file_2 = newick_url_2;

    clear(container_id);
    var cophylogeny_fig = new CoPhylogenyGraph(container_sel, w, h, userArgs);
    cophylogeny_fig.tree1_name = fileButtonLeft.innerHTML;
    console.log("name1 is " + cophylogeny_fig.tree1_name);
    cophylogeny_fig.tree2_name = fileButtonRight.innerHTML;
    console.log("name2 is " + cophylogeny_fig.tree2_name);
    if ('undefined' !== leftToRight)
    {
        console.log("leftToRight is defined");
        console.dir(leftToRight);
        cophylogeny_fig.bridgeMap = leftToRight;
    }
    else
    {
        console.log("leftToRight NOT defined");
    }
    cophylogeny_fig.render(newick_file_1, newick_file_2, w, h);
    cophylogeny_fig.addEventListener("draw", function() {
        document.getElementById("sdfootSpan").textContent = cophylogeny_fig.currentDFoot;
    });

    cophylogeny_fig.addEventListener("TreeNodeMouseClick", function(evt) {
        console.group("main app click selector");
        cophylogeny_fig.addPersistentClass("rememberEdge", evt.upper_selector);
        console.log(evt.upper_selector);
        console.log(evt.lower_selector);
        console.groupEnd();
    });

    slider.on("change", function(evt) {
        var sliderValue = evt.newValue;
        if (! isNaN(sliderValue)) {
            cophylogeny_fig.yScaleFactor = sliderValue;
            cophylogeny_fig.redraw();
        }
    });
    var launchFunction = function() {
        console.group("launchFunction");
        d3.selectAll('svg').selectAll('#circle_r-nd-3').dispatch('mouseover');

        var d3node = cophylogeny_fig.get_d3Node('r-nd-3');
        console.log('d3node' + d3node);
        console.dir(d3node);
        console.groupEnd();
    }
    var traceDetangler = function() {
        console.group("traceDetangler");
        var l1 = TreeTools.leaves(cophylogeny_fig.leftTree);
        var rightRoot = cophylogeny_fig.rightTree;
        var detangle = function(newickNode, depth, data) {
            if (newickNode.branchset) {
                var d3node = cophylogeny_fig.get_d3Node(newickNode.unique_id);
                var d3node_struct = cophylogeny_fig.inspectNode(d3node);
                cophylogeny_fig.addPersistentClass("rememberEdge", d3node_struct.upper_sel);
                var dfoot_pre = TreeTools.dfoot(TreeTools.leaves(data.root), data.l1);
                TreeTools.swap_children(newickNode);
                var dfoot_post = TreeTools.dfoot(TreeTools.leaves(data.root), data.l1);
                if (dfoot_pre < dfoot_post) {
                    // unswap newick obj
                    TreeTools.swap_children(newickNode);
                }
                else {
                    // redraw with changes
                    cophylogeny_fig.redraw()
                }
            }
        }
        TreeTools.visitPostOrder(rightRoot, detangle, 0, {root: rightRoot, l1: l1});
        console.groupEnd();
    
    }

    document.addEventListener('keydown', function(event) {
        const keyName = event.key;
        if (keyName == ' ') {
            traceDetangler();
        }
    });
    
}
