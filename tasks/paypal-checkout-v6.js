"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:paypal-checkout-v6", function (done) {
  browserify(
    {
      standalone: "braintree.paypalCheckoutV6",
      main: "src/paypal-checkout-v6/index.js",
      out: "paypal-checkout-v6.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
