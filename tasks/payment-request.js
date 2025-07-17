"use strict";

var browserify = require("./browserify");
var del = require("del");
var fs = require("fs");
var gulp = require("gulp");
var path = require("path");
var replace = require("gulp-replace");
var minifyHTML = require("./minify").minifyHTML;
var VERSION = require("../package.json").version;

var BASE_PATH = path.resolve(__dirname, "..", "src", "payment-request");
var DIST_PATH = path.resolve(__dirname, "..", "dist", "hosted", "web", VERSION);

gulp.task("build:payment-request:js", function (done) {
  browserify(
    {
      standalone: "braintree.paymentRequest",
      main: "src/payment-request/index.js",
      out: "payment-request.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});

gulp.task("build:payment-request:frame:js", function (done) {
  browserify(
    {
      standalone: "braintree.payment-request",
      main: BASE_PATH + "/internal/index.js",
      out: "payment-request-internal.js",
      dist: DIST_PATH + "/js",
      uglify: false,
    },
    done
  );
});

gulp.task("build:payment-request:frame:js:delete", function () {
  var internalJsPath = DIST_PATH + "/js/payment-request-internal.js";

  return del([internalJsPath]);
});

gulp.task("build:payment-request:frame:html", function () {
  var jsFile = fs.readFileSync(
    DIST_PATH + "/js/payment-request-internal.js",
    "utf8"
  );
  var stream = gulp
    .src(BASE_PATH + "/internal/payment-request-frame.html")
    .pipe(replace("@BUILT_FILE", jsFile));

  return minifyHTML(stream, DIST_PATH + "/html");
});

gulp.task(
  "build:payment-request:frame",
  gulp.series(
    "build:payment-request:frame:js",
    "build:payment-request:frame:html",
    "build:payment-request:frame:js:delete"
  )
);

gulp.task(
  "build:payment-request",
  gulp.parallel("build:payment-request:js", "build:payment-request:frame")
);
