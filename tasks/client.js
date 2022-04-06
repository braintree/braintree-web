"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:client", function (done) {
  browserify(
    {
      standalone: "braintree.client",
      main: "src/client/index.js",
      out: "client.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
