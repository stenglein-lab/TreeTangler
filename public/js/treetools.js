(function(exports) {
    exports.writeNewick = function(nw) {
        var compileNW = function(node, stack)
        {
            stack.unshift(node.name + ":" + node.length);
            
            if (node.branchset)
            {
                stack.unshift(")");
                for (var i = node.branchset.length - 1; i >= 0 ; i--)
                {
                    var branch = node.branchset[i];
                    compileNW(branch, stack);
                    if (i > 0)
                    {
                        stack.unshift(',');
                    }
                }
                stack.unshift("(");
            }
        };

        var top_stack = [];
        compileNW(nw, top_stack);
        var nw_str = top_stack.join('') + ';';
        return nw_str;
    };
    exports.visitPreOrder = function(root, callback, depth=0, data={}) {
        if (root) { callback(root, depth, data); }
        if (root.branchset) {
            for (var i = 0; i < root.branchset.length; i++) {
                exports.visitPreOrder(root.branchset[i], callback, depth+1,data);
            }
        }
    };
    exports.visitPostOrder = function(root, callback, depth=0, data={}) {
        if (root.branchset) {
            for (var i = 0; i < root.branchset.length; i++) {
                exports.visitPreOrder(root.branchset[i], callback, depth+1,data);
            }
        }
        if (root) { callback(root, depth, data); }
    };
    exports.leaves = function(tree) {
        var add_name_if_leaf = function(node, depth, data) {
            if (! node.branchset) {
                if (! data.leaves) { data.leaves = []; }
                data.leaves.push(node.name);
            }
        };
        var data = {};
        exports.visitPreOrder(tree, add_name_if_leaf, 0, data);
        return data.leaves;
    };
    exports.create_node = function(arg_name, arg_children, arg_length){
        return { name: arg_name, branchset: arg_children, length: arg_length };
    };
    exports.create_leaf = function(arg_name, arg_length) {
        return { name: arg_name, length: arg_length };
    };
    exports.longest_path = function(subtree, path_str="", length=0) {
        var running_str = path_str + "." + subtree.name;
        var running_length = length + subtree.length;
        if (subtree.branchset) {
            var values = [];
            var max_i = 0;
            for (var i = 0; i < subtree.branchset.length; i++) {
                var v = exports.longest_path( subtree.branchset[i], running_str, running_length );
                values.push(v);
                if (v[1] > values[max_i][1]) {
                    max_i = i; 
                }
            }
            // max of all children
            console.log(max_i);
            console.log(values);
            running_str = values[max_i][0];
            running_length = values[max_i][1];
        }
        return [running_str,running_length];
    };
    exports.make_binary = function(node) {
        if (node.branchset) { 
            var n = node.branchset.length;
            if (n > 2) {
                var i = n/2;
                var leftArray = node.branchset.slice(0,i);
                var rightArray = node.branchset.slice(i);

                var node_left = leftArray.length == 1 ?  leftArray[0] : exports.create_node(node.name + "_left", leftArray, 0);
                var node_right = rightArray.length == 1 ?  rightArray[0] : exports.create_node(node.name + "_right", rightArray, 0);
                node.branchset = [node_left, node_right];
            }
            exports.make_binary(node.branchset[0]);
            exports.make_binary(node.branchset[1]);
        }
    };
    exports.make_random_binary = function(node) {
        if (node.branchset) { 
            var n = node.branchset.length;
            if (n > 2) {
                var i = Math.ceil(Math.random() * (n-1)); // for the slice to work, i must be within exclusive range (0,n)
                var leftArray = node.branchset.slice(0,i);
                var rightArray = node.branchset.slice(i);

                var node_left = leftArray.length == 1 ?  leftArray[0] : exports.create_node(node.name + "_left", leftArray, 0);
                var node_right = rightArray.length == 1 ?  rightArray[0] : exports.create_node(node.name + "_right", rightArray, 0);
                node.branchset = [node_left, node_right];
            }
            exports.make_random_binary(node.branchset[0]);
            exports.make_random_binary(node.branchset[1]);
        }
    };
    exports.swap_children = function(node) {
        // requires binary
        if (node.branchset) {
            var right = node.branchset[1];
            var left = node.branchset[0];
            node.branchset = [right, left];
        }
    };
    exports.print_node_traversal = function(node, depth) {
        var indent = '';
        for (var i = 0; i < depth; i++) {
            indent += '  ';
        }
        if (node.branchset) { 
            console.log(indent + depth + ":" + node.name + " " + node.branchset.length + " children");
        }
        else { console.log(indent + depth + ":" + node.name + " " + " 0 children");}
    };
    exports.print_ascii = function(node, depth=0, scale = 1) { // depth is the length from node to root
        var indent = "";
        for (var i = 0; i < (scale * depth); i++) { indent += " "; }
        var edge = "";
        for (i = 0; i < (scale * node.length); i++) { edge += "-"; }
        console.log(indent + "+" + edge + node.name + ":" + node.length);
        if (node.branchset) {
            for (i = 0; i < node.branchset.length; i++) {
                exports.print_ascii(node.branchset[i], depth+node.length, scale);
            }
        }
    };
    exports.print_ascii_cladogram = function(node, depth=0) {
        var indent = "";
        for (var i = 0; i < depth; i++) { indent += "  "; }
        console.log(indent + "+-" + node.name + ":" + node.length);
        if (node.branchset) {
            for (i = 0; i < node.branchset.length; i++) {
                exports.print_ascii_cladogram(node.branchset[i], depth+1);
            }
        }
    };
    exports.detangler = function(root, standard) {
        var data = {root: root, l1: standard}; // needed to call leaves, dfoot
        var detangle = function(node, depth, data) {
            var indent = "";
            for (var i = 0; i < depth; i++) { indent += "   "; }
            if (node.branchset) {
                var dfoot_pre = exports.dfoot(exports.leaves(data.root), data.l1);
                exports.swap_children(node);
                var dfoot_post = exports.dfoot(exports.leaves(data.root), data.l1);
                console.log(indent + dfoot_pre +" vs " + dfoot_post);
                if (dfoot_pre < dfoot_post) {
                    console.log(indent + "reject swap");
                    exports.swap_children(node);
                }
                else {
                    console.log(indent + "keep swap");
                }
            }
        };

        exports.visitPostOrder(root, detangle, 0, data);
    };
    exports.dfoot = function(nodelist, standard) {
        // Implementation of Spearman's footrule distance
        // Defined as the sum of the distance of ranks of the respective lists of leaves.
        // No ranking system is predefined, so use the order of the left leaves as the ranks.
        var sum = 0;
        for (var i = 0; i < nodelist.length; i++) {
            sum += Math.abs(i - nodelist.indexOf( standard[i] ));
        }
        return sum;
    };
})(
    // exports will be set in any commonjs platform; use it if it's available
    typeof exports !== "undefined" ?
    exports :
    // otherwise construct a name space.  outside the anonymous function,
    // "this" will always be "window" in a browser, even in strict mode.
    this.TreeTools = {}
);

