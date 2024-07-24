"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:fastlane", function (done) {
  browserify(
    {
      standalone: "braintree.fastlane",
      main: "src/fastlane/index.js",
      out: "fastlane.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
