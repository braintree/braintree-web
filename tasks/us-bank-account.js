"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:us-bank-account", function (done) {
  browserify(
    {
      standalone: "braintree.usBankAccount",
      main: "src/us-bank-account/index.js",
      out: "us-bank-account.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
