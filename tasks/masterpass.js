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
var HTML_TASKS = [];
var DELETE_INTERNAL_JS_TASKS = [];
var FRAMES = ["loading", "landing"];

FRAMES.forEach(function (frame) {
  var jsTaskName = "build:masterpass:frame:js:" + frame + "-frame";
  var htmlTaskName = "build:masterpass:frame:html:" + frame + "-frame";
  var deleteInternalJSTaskName =
    "build:masterpass:frame:js:delete:" + frame + "-frame";

  gulp.task(jsTaskName, function (done) {
    browserify(
      {
        standalone: "braintree.masterpass",
        main: "src/masterpass/internal/" + frame + "-frame.js",
        out: "masterpass-" + frame + "-frame.js",
        dist: DIST_DIR + "js",
        uglify: false,
      },
      done
    );
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    var jsFilePath = DIST_DIR + "js/masterpass-" + frame + "-frame";
    var jsFile = fs.readFileSync(jsFilePath + ".js");
    var stream = gulp
      .src("src/masterpass/internal/frame.html")
      .pipe(replace("@BUILT_FILE", jsFile))
      .pipe(
        rename(function (path) {
          path.basename = "masterpass-" + frame + "-" + path.basename;
        })
      )
      .pipe(replace("@FRAME", frame));

    return minifyHTML(stream, DIST_DIR + "html");
  });

  HTML_TASKS.push(htmlTaskName);

  gulp.task(deleteInternalJSTaskName, function () {
    var jsFilePath = DIST_DIR + "js/masterpass-" + frame + "-frame";

    return del(jsFilePath + ".js");
  });

  DELETE_INTERNAL_JS_TASKS.push(deleteInternalJSTaskName);
});

gulp.task("build:masterpass:js", function (done) {
  browserify(
    {
      standalone: "braintree.masterpass",
      main: "src/masterpass/index.js",
      out: "masterpass.js",
      dist: DIST_DIR + "js",
    },
    done
  );
});

gulp.task("build:masterpass:frame:html", gulp.parallel(HTML_TASKS));
gulp.task("build:masterpass:frame:js", gulp.parallel(JS_TASKS));
gulp.task(
  "build:masterpass:frame:js:delete",
  gulp.parallel(DELETE_INTERNAL_JS_TASKS)
);
gulp.task(
  "build:masterpass:frame",
  gulp.series(
    "build:masterpass:frame:js",
    "build:masterpass:frame:html",
    "build:masterpass:frame:js:delete"
  )
);
gulp.task(
  "build:masterpass",
  gulp.parallel("build:masterpass:js", "build:masterpass:frame")
);
