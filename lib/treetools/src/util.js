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

utilModule = function(){};
module.exports = utilModule;
module.exports.visitPreOrder = visitPreOrder;
module.exports.visitPostOrder = visitPostOrder;
