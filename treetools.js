(function(exports) {
    exports.visitPreOrder = function(root, callback, depth=0, data={}) {
        if (root) { callback(root, depth, data); }
        if (root.branchset) {
            for (var i = 0; i < root.branchset.length; i++) {
                exports.visitPreOrder(root.branchset[i], callback, depth+1,data);
            }
        }
    };
exports.leaves = function(tree) {
    var add_name_if_leaf = function(node, depth, data) {
        if (! node.branchset) {
            if (! data.leaves) { data.leaves = []; }
            data.leaves.push(node.name);
        }
    }
    var data = {};
    exports.visitPreOrder(tree, add_name_if_leaf, 0, data);
    return data.leaves;
};
})(
    // exports will be set in any commonjs platform; use it if it's available
    typeof exports !== "undefined" ?
    exports :
    // otherwise construct a name space.  outside the anonymous function,
    // "this" will always be "window" in a browser, even in strict mode.
    this.TreeTools = {}
);

