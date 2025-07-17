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
var FRAMES = ["bank", "authentication-complete"];

var HTML_TASKS = FRAMES.map(function (frame) {
  var htmlTaskName = "build:three-d-secure:frame:html:" + frame + "-frame";

  gulp.task(htmlTaskName, function () {
    var jsFile = fs.readFileSync(DIST_DIR + "js/three-d-secure-frame.js");
    var stream = gulp
      .src("src/three-d-secure/internal/" + frame + "-frame.html")
      .pipe(replace("@BUILT_FILE", jsFile))
      .pipe(
        rename(function (path) {
          path.basename = "three-d-secure-" + path.basename;
        })
      )
      .pipe(replace("@FRAME", frame));

    return minifyHTML(stream, DIST_DIR + "html");
  });

  return htmlTaskName;
});

gulp.task("build:three-d-secure:frame:js", function (done) {
  browserify(
    {
      standalone: "braintree.three-d-secure",
      main: "src/three-d-secure/internal/index.js",
      out: "three-d-secure-frame.js",
      dist: DIST_DIR + "js",
      uglify: false,
    },
    done
  );
});

gulp.task("build:three-d-secure:js", function (done) {
  browserify(
    {
      standalone: "braintree.three-d-secure",
      main: "src/three-d-secure/index.js",
      out: "three-d-secure.js",
      dist: DIST_DIR + "js",
    },
    done
  );
});

gulp.task("build:three-d-secure:frame:js:delete", function (_done) {
  var frameJsFilePath = DIST_DIR + "js/three-d-secure-frame.js";

  return del(frameJsFilePath);
});

gulp.task("build:three-d-secure:frame:html", gulp.parallel(HTML_TASKS));
gulp.task(
  "build:three-d-secure:frame",
  gulp.series(
    "build:three-d-secure:frame:js",
    "build:three-d-secure:frame:html",
    "build:three-d-secure:frame:js:delete"
  )
);

gulp.task(
  "build:three-d-secure",
  gulp.parallel("build:three-d-secure:frame", "build:three-d-secure:js")
);
