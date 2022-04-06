"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:data-collector", function (done) {
  browserify(
    {
      standalone: "braintree.dataCollector",
      main: "src/data-collector/index.js",
      out: "data-collector.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
