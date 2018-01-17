module.exports = function(nw) {
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
