"use strict";

var del = require("del");
var fs = require("fs");
var gulp = require("gulp");
var rename = require("gulp-rename");
var replace = require("gulp-replace");
var browserify = require("./browserify");
var minifyHTML = require("./minify").minifyHTML;
var VERSION = require("../package.json").version;

var DIST_DIR = "dist/hosted/web/" + VERSION + "/";
var JS_TASKS = [];
var JS_DELETE_TASKS = [];
var HTML_TASKS = [];
var FRAMES = ["redirect"];

FRAMES.forEach(function (frame) {
  var jsTaskName = "build:local-payment:frame:js:" + frame + "-frame";
  var jsDeleteTaskName =
    "build:local-payment:frame:js:delete:" + frame + "-frame";
  var htmlTaskName = "build:local-payment:frame:html:" + frame + "-frame";

  gulp.task(jsTaskName, function (done) {
    browserify(
      {
        standalone: "braintree.local-payment",
        main: "src/local-payment/internal/" + frame + "-frame.js",
        out: "local-payment-" + frame + "-frame.js",
        dist: DIST_DIR + "js",
        uglify: false,
      },
      done
    );
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    var jsFile = fs.readFileSync(
      DIST_DIR + "js/local-payment-" + frame + "-frame.js",
      "utf8"
    );
    var stream = gulp
      .src("src/local-payment/internal/frame.html")
      .pipe(replace("@BUILT_FILE", jsFile))
      .pipe(
        rename(function (path) {
          path.basename = "local-payment-" + frame + "-" + path.basename;
        })
      )
      .pipe(replace("@FRAME", frame));

    return minifyHTML(stream, DIST_DIR + "html");
  });

  HTML_TASKS.push(htmlTaskName);

  gulp.task(jsDeleteTaskName, function () {
    var jsFilePath = DIST_DIR + "js/local-payment-" + frame + "-frame.js";

    return del(jsFilePath);
  });

  JS_DELETE_TASKS.push(jsDeleteTaskName);
});

HTML_TASKS.push("build:local-payment:frame:html:landing-frame");
gulp.task("build:local-payment:frame:html:landing-frame", function () {
  var stream = gulp
    .src("src/local-payment/internal/landing-frame.html")
    .pipe(rename("local-payment-landing-frame.html"));

  return minifyHTML(stream, DIST_DIR + "html");
});

gulp.task("build:local-payment:js", function (done) {
  browserify(
    {
      standalone: "braintree.local-payment",
      main: "src/local-payment/index.js",
      out: "local-payment.js",
      dist: DIST_DIR + "js",
    },
    done
  );
});

gulp.task("build:local-payment:frame:html", gulp.parallel(HTML_TASKS));
gulp.task("build:local-payment:frame:js", gulp.parallel(JS_TASKS));
gulp.task(
  "build:local-payment:frame:js:delete",
  gulp.parallel(JS_DELETE_TASKS)
);
gulp.task(
  "build:local-payment:frame",
  gulp.series(
    "build:local-payment:frame:js",
    "build:local-payment:frame:html",
    "build:local-payment:frame:js:delete"
  )
);
gulp.task(
  "build:local-payment",
  gulp.parallel("build:local-payment:js", "build:local-payment:frame")
);
