"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:paypal-checkout", function (done) {
  browserify(
    {
      standalone: "braintree.paypalCheckout",
      main: "src/paypal-checkout/index.js",
      out: "paypal-checkout.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
