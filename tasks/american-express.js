"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:american-express", function (done) {
  browserify(
    {
      standalone: "braintree.americanExpress",
      main: "src/american-express/index.js",
      out: "american-express.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
