"use strict";

var del = require("del");
var gulp = require("gulp");
var browserify = require("./browserify");
var path = require("path");
var fs = require("fs");
var minifyHTML = require("./minify").minifyHTML;
var replace = require("gulp-replace");
var VERSION = require("../package.json").version;

var BASE_PATH = path.resolve(__dirname, "..", "src", "hosted-fields");
var DIST_PATH = path.resolve(__dirname, "..", "dist", "hosted", "web", VERSION);

gulp.task("build:hosted-fields:frame:html", function () {
  var jsFile = fs.readFileSync(
    DIST_PATH + "/js/hosted-fields-internal.js",
    "utf8"
  );
  var stream = gulp
    .src(BASE_PATH + "/internal/hosted-fields-frame.html")
    .pipe(replace("@BUILT_FILE", jsFile));

  return minifyHTML(stream, DIST_PATH + "/html");
});

gulp.task("build:hosted-fields:js", function (done) {
  browserify(
    {
      standalone: "braintree.hosted-fields",
      main: BASE_PATH + "/index.js",
      out: "hosted-fields.js",
      dist: DIST_PATH + "/js",
    },
    done
  );
});

gulp.task("build:hosted-fields:frame:js", function (done) {
  browserify(
    {
      standalone: "braintree.hosted-fields",
      main: BASE_PATH + "/internal/index.js",
      out: "hosted-fields-internal.js",
      dist: DIST_PATH + "/js",
      uglify: false,
    },
    done
  );
});

gulp.task("build:hosted-fields:frame:js:polyfills-ie9", function (done) {
  browserify(
    {
      main: BASE_PATH + "/internal/polyfills/ie9.js",
      out: "hosted-fields-internal-polyfills-ie9.js",
      dist: DIST_PATH + "/js",
    },
    done
  );
});

gulp.task("build:hosted-fields:frame:js:delete", function () {
  var internalJsPath = DIST_PATH + "/js/hosted-fields-internal.js";
  var ie9PolyfillJsPath =
    DIST_PATH + "/js/hosted-fields-internal-polyfills-ie9.js";

  return del([internalJsPath, ie9PolyfillJsPath]);
});

gulp.task(
  "build:hosted-fields:frame",
  gulp.series(
    "build:hosted-fields:frame:js",
    "build:hosted-fields:frame:js:polyfills-ie9",
    // the html task depends on the frame:js
    // and polyfill tasks so it must run after
    // they have finished
    "build:hosted-fields:frame:html",
    "build:hosted-fields:frame:js:delete"
  )
);

gulp.task(
  "build:hosted-fields",
  gulp.parallel("build:hosted-fields:js", "build:hosted-fields:frame")
);
