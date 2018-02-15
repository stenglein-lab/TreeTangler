// grunt expects this file to export a function
module.exports = function(grunt) { // grunt instance is passed to this function as argument
    // grunt configuration details   
    grunt.initConfig({
        // each key is a task
        jshint: { // syntax checking
            files: ["*.js", "test/*.js", "lib/**/*.js"], // add everything here
            options: {
                esnext: true,
                globals: { // to keep it from complaining about jquery
                    jQuery: true
                }
            }
        },
        browserify: {
            client: {
                src: ["app-client.js"],
                dest: "public/js/bundle.js"
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint"); // to use jshint plugin
    grunt.loadNpmTasks("grunt-browserify");


    grunt.registerTask("js", ["browserify"]);
    grunt.registerTask("default", ["jshint", "js"]);

    
};
