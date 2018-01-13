var express = require('express');

var app = express(); // express instance 

// "middleware" that comes with express server
app.use(express.static("./public")); // static file server
// custom middleware
app.use( function(req,res,next) {
    // req- request,
    // res- response,
    // next- next function to execute

    console.log(`${req.method} request for '${req.url}'`);

    next(); // required to actually send a response back
});

app.listen(3000);

console.log("Express app running on port 3000");

module.exports = app; // this application instance can now be used in other files, as in testing
