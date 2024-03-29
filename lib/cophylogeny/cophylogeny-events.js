(function() {
    exports = module.exports = function(CoPhylogenyGraph) {
        CoPhylogenyGraph.prototype.addEventListener = function(evt_str, f) {
            if (! this.eventListeners.hasOwnProperty(evt_str)) {
                this.eventListeners[evt_str] = Array();
            }
            this.eventListeners[evt_str].push(f);
        };
        CoPhylogenyGraph.prototype.dispatchEvent = function(evt) {
            var debug = true;
            if (debug) {
                console.log("CoPhylogeny.dispatchEvent:" + evt.type + " -----------------------------");
                console.dir(evt);
            }
            if (this.eventListeners.hasOwnProperty(evt.type)) {
                this.eventListeners[evt.type].forEach(
                    function(handler) {
                        handler(evt);
                    }
                );
            }
        };
        CoPhylogenyGraph.prototype.removeEventListener = function(type, func) {
            if (this.eventListeners.hasOwnProperty(evt.type)) {
                var ix = this.eventListeners[evt.type].indexOf(func);
                if (ix > -1)  {
                   this.eventListeners[evt.type].splice(ix,1);
                }
            }
        };
        CoPhylogenyGraph.prototype.TreeNodeMouseEvent = function(g_sel, u_sel, l_sel) {
            // selector strings that can be passed to d3.selectAll
            this.g_selector = g_sel;
            this.upper_selector = u_sel;
            this.lower_selector = l_sel;
        };
        CoPhylogenyGraph.prototype.TreeNodeMouseOverEvent = function(g_sel, u_sel, l_sel) {
            this.base = CoPhylogenyGraph.prototype.TreeNodeMouseEvent;
            this.base(g_sel,u_sel,l_sel);
            this.type = "TreeNodeMouseOver";
        };
        CoPhylogenyGraph.prototype.TreeNodeMouseClickEvent = function(g_sel, u_sel, l_sel) {
            this.base = CoPhylogenyGraph.prototype.TreeNodeMouseEvent;
            this.base(g_sel,u_sel,l_sel);
            this.type = "TreeNodeMouseClick";
        };
    }; // end exports enclosure
})();
