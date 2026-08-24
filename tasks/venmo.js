"use strict";

var fs = require("fs");
var path = require("path");
var gulp = require("gulp");
var minifyHTML = require("./minify").minifyHTML;
var rename = require("gulp-rename");
var del = require("del");
var replace = require("gulp-replace");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

var BASE_PATH = path.resolve(__dirname, "..", "src", "venmo");
var DIST_PATH = path.resolve(__dirname, "..", "dist", "hosted", "web", VERSION);
gulp.task("build:venmo:landing-frame", function () {
  var stream = gulp
    .src("src/venmo/internal/landing-frame.html")
    .pipe(rename("venmo-landing-frame.html"));

  return minifyHTML(stream, DIST_PATH + "/html");
});

gulp.task("build:venmo:desktop-frame:html", function () {
  var jsFile = fs.readFileSync(
    DIST_PATH + "/js/venmo-desktop-frame-internal.js",
    "utf8"
  );

  var stream = gulp
    .src(BASE_PATH + "/internal/venmo-desktop-frame.html")
    .pipe(replace("@BUILT_FILE", jsFile));

  return minifyHTML(stream, DIST_PATH + "/html");
});

gulp.task("build:venmo:desktop-frame:js", function (done) {
  browserify(
    {
      standalone: "braintree.venmo",
      main: BASE_PATH + "/internal/venmo-desktop-frame.js",
      out: "venmo-desktop-frame-internal.js",
      dist: DIST_PATH + "/js",
      uglify: false,
    },
    done
  );
});

gulp.task("build:venmo:desktop-frame:js:delete", function () {
  if (process.env.BRAINTREE_JS_COVERAGE_BUILD === "true") {
    return Promise.resolve();
  }

  var internalJsPath = DIST_PATH + "/js/venmo-desktop-frame-internal.js";

  return del([internalJsPath]);
});

gulp.task(
  "build:venmo:desktop-frame",
  gulp.series(
    "build:venmo:desktop-frame:js",
    "build:venmo:desktop-frame:html",
    "build:venmo:desktop-frame:js:delete"
  )
);

gulp.task("build:venmo:js", function (done) {
  browserify(
    {
      standalone: "braintree.venmo",
      main: BASE_PATH + "/index.js",
      out: "venmo.js",
      dist: DIST_PATH + "/js",
    },
    done
  );
});

gulp.task(
  "build:venmo",
  gulp.parallel(
    "build:venmo:js",
    "build:venmo:desktop-frame",
    "build:venmo:landing-frame"
  )
);
