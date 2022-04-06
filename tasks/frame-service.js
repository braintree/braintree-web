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
var FRAMES = ["dispatch", "cancel", "redirect"];

FRAMES.forEach(function (frame) {
  var jsTaskName = "build:frame-service:js:" + frame + "-frame";
  var jsDeleteTaskName = "build:frame-service:js:delete" + frame + "-frame";
  var htmlTaskName = "build:frame-service:html:" + frame + "-frame";

  gulp.task(jsTaskName, function (done) {
    browserify(
      {
        standalone: "frameService",
        main: `src/lib/frame-service/internal/${frame}-frame.js`,
        out: "frame-service-" + frame + "-frame.js",
        dist: DIST_DIR + "js",
        uglify: false,
      },
      done
    );
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    var jsFile = fs.readFileSync(
      DIST_DIR + `js/frame-service-${frame}-frame.js`
    );
    var stream = gulp
      .src(`src/lib/frame-service/internal/frame.html`)
      .pipe(replace("@BUILT_FILE", jsFile))
      .pipe(
        rename(function (path) {
          path.basename = `${frame}-frame`;
        })
      )
      .pipe(replace("@FRAME", frame));

    return minifyHTML(stream, DIST_DIR + "html");
  });

  HTML_TASKS.push(htmlTaskName);

  gulp.task(jsDeleteTaskName, function () {
    var jsFilePath = DIST_DIR + `js/frame-service-${frame}-frame.js`;

    return del(jsFilePath);
  });

  JS_DELETE_TASKS.push(jsDeleteTaskName);
});

gulp.task("build:frame-service:html", gulp.parallel(HTML_TASKS));
gulp.task("build:frame-service:js", gulp.parallel(JS_TASKS));
gulp.task("build:frame-service:js:delete", gulp.parallel(JS_DELETE_TASKS));
gulp.task(
  "build:frame-service",
  gulp.series(
    "build:frame-service:js",
    "build:frame-service:html",
    "build:frame-service:js:delete"
  )
);
