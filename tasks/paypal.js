"use strict";

var gulp = require("gulp");
var rename = require("gulp-rename");
var browserify = require("./browserify");
var minifyHTML = require("./minify").minifyHTML;
var VERSION = require("../package.json").version;

var DIST_DIR = "dist/hosted/web/" + VERSION + "/";

gulp.task("build:paypal:frame", function () {
  var stream = gulp
    .src("src/paypal/internal/landing-frame.html")
    .pipe(rename("paypal-landing-frame.html"));

  return minifyHTML(stream, DIST_DIR + "html");
});

gulp.task("build:paypal:js", function (done) {
  browserify(
    {
      standalone: "braintree.paypal",
      main: "src/paypal/index.js",
      out: "paypal.js",
      dist: DIST_DIR + "js",
    },
    done
  );
});

gulp.task(
  "build:paypal",
  gulp.parallel("build:paypal:js", "build:paypal:frame")
);
