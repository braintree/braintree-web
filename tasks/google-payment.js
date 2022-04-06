"use strict";

var browserify = require("./browserify");
var gulp = require("gulp");
var VERSION = require("../package.json").version;

gulp.task("build:google-payment", function (done) {
  browserify(
    {
      standalone: "braintree.googlePayment",
      main: "src/google-payment/index.js",
      out: "google-payment.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
