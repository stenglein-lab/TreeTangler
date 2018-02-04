/*
 I can't get the import to work from the npm require('newick'), so here's
 the function I need.
*/
parse = function (s) {
    var ancestors = []; 
    var tree = {}; 
    var tokens = s.split(/\s*(;|\(|\)|,|:)\s*/);
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        switch (token) {
            case '(': // new branchset
                let paren_subtree = {}; 
                tree.branchset = [paren_subtree];
                ancestors.push(tree);
                tree = paren_subtree;
                break;
            case ',': // another branch
                let comma_subtree = {}; 
                ancestors[ancestors.length - 1].branchset.push(comma_subtree);
                tree = comma_subtree;
                break;
            case ')': // optional name next
                tree = ancestors.pop();
                break;
            case ':': // optional length next
                break;
            default:
                var x = tokens[i - 1]; 
                if (x == ')' || x == '(' || x == ',') {
                    tree.name = token;
                } else if (x == ':') {
                    tree.length = parseFloat(token);
                }   
        }   
    }   
    return tree;
};  
module.exports = function() {};
module.exports.parse = parse;
