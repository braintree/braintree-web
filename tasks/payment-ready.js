"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:payment-ready", function (done) {
  browserify(
    {
      standalone: "braintree.paymentReady",
      main: "src/payment-ready/index.js",
      out: "payment-ready.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
