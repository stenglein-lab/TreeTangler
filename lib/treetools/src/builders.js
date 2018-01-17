util = require('./util');
leaves = function(tree) {
    var add_name_if_leaf = function(node, depth, data) {
        if (! node.branchset) {
            if (! data.leaves) { data.leaves = []; }
            data.leaves.push(node.name);
        }
    };
    var data = {};
    util.visitPreOrder(tree, add_name_if_leaf, 0, data);
    return data.leaves;
};
create_node = function(arg_name, arg_children, arg_length){
    return { name: arg_name, branchset: arg_children, length: arg_length };
};
create_leaf = function(arg_name, arg_length) {
    return { name: arg_name, length: arg_length };
};

buildersModule = function(){};
module.exports = buildersModule;
module.exports.leaves = leaves;
module.exports.create_node = create_node;
module.exports.create_leaf = create_leaf;
