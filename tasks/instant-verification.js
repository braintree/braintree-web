"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:instant-verification", function (done) {
  browserify(
    {
      standalone: "braintree.instantVerification",
      main: "src/instant-verification/index.js",
      out: "instant-verification.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
