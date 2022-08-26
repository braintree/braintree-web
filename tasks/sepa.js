"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var rename = require("gulp-rename");
var minifyHTML = require("./minify").minifyHTML;
var path = require("path");

var VERSION = require("../package.json").version;
var DIST_PATH = path.resolve(__dirname, "..", "dist", "hosted", "web", VERSION);

gulp.task("build:sepa:js", function (done) {
  browserify(
    {
      standalone: "braintree.sepa",
      main: "src/sepa/index.js",
      out: "sepa.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});

gulp.task("build:sepa:landing-frame", function () {
  var stream = gulp
    .src("src/sepa/internal/landing-frame.html")
    .pipe(rename("sepa-landing-frame.html"));

  return minifyHTML(stream, DIST_PATH + "/html");
});

gulp.task(
  "build:sepa",
  gulp.parallel("build:sepa:js", "build:sepa:landing-frame")
);
