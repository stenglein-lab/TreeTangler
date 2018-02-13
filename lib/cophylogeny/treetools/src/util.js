visitPreOrder = function(root, callback, depth=0, data={}) {
    if (root) { callback(root, depth, data); }
    if (root.branchset) {
        for (var i = 0; i < root.branchset.length; i++) {
            visitPreOrder(root.branchset[i], callback, depth+1,data);
        }
    }
};
visitPostOrder = function(root, callback, depth=0, data={}) {
    if (root.branchset) {
        for (var i = 0; i < root.branchset.length; i++) {
            visitPreOrder(root.branchset[i], callback, depth+1,data);
        }
    }
    if (root) { callback(root, depth, data); }
};
make_binary = function(node) {
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

utilModule = function(){};
module.exports = utilModule;
module.exports.visitPreOrder = visitPreOrder;
module.exports.visitPostOrder = visitPostOrder;
module.exports.make_binary = make_binary;
