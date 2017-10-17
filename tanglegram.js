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

    slider.on("slide", function(sliderValue) {
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

    console.log(window.location);
    var urlparts = window.location.href.split("?");
    if (urlparts.length > 1)
    {
        var query = new URLSearchParams(urlparts[1]);
        if (query.has("left") && query.has("right"))
        {
            leftURL = query.get("left");
            rightURL = query.get("right");
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
            render_cophylogeny('#middle_container', 'unnamed', leftURL, rightURL, 700);
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

function render_cophylogeny(container_id, segment_id, newick_url_1, newick_url_2, height)
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
    var cophylogeny_fig = new CoPhylogenyGraph(container_sel, w, h);
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
}
