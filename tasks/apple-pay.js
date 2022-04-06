"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:apple-pay", function (done) {
  browserify(
    {
      standalone: "braintree.applePay",
      main: "src/apple-pay/index.js",
      out: "apple-pay.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
