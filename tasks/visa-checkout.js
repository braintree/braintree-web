"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:visa-checkout", function (done) {
  browserify(
    {
      standalone: "braintree.visaCheckout",
      main: "src/visa-checkout/index.js",
      out: "visa-checkout.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
