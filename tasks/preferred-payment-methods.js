"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:preferred-payment-methods", function (done) {
  browserify(
    {
      standalone: "braintree.preferredPaymentMethods",
      main: "src/preferred-payment-methods/index.js",
      out: "preferred-payment-methods.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
