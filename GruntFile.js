// grunt expects this file to export a function
module.exports = function(grunt) { // grunt instance is passed to this function as argument
    // grunt configuration details   
    grunt.initConfig({
        // each key is a task
        jshint: { // syntax checking
            file: ["*.js"], // add everything here
            options: {
                esnext: true,
                globals: { // to keep it from complaining about jquery
                    jQuery: true
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint"); // to use jshint plugin

    grunt.registerTask("default", ["jshint"]);
};
