"use strict";

var gulp = require("gulp");
var chalk = require("chalk");
var VERSION = require("../package.json").version;
var HOSTED_DEST = process.env.BRAINTREE_JS_HOSTED_DEST;
var BOWER_DEST = process.env.BRAINTREE_JS_BOWER_DEST;
var NPM_DEST = "./dist/npm";

gulp.task("release:hosted:copy", function () {
  return gulp
    .src([
      "dist/hosted/web/" + VERSION + "/**/*",
      "!dist/hosted/web/" + VERSION + "/js/index.*",
    ])
    .pipe(gulp.dest(HOSTED_DEST + "/web/" + VERSION));
});

gulp.task("release:hosted-static:copy", function () {
  return gulp
    .src(["dist/hosted/web/static/**/*"])
    .pipe(gulp.dest(HOSTED_DEST + "/web/static"));
});

gulp.task(
  "release:hosted",
  gulp.series(
    "clean",
    "build:hosted",
    "release:hosted-static:copy",
    "release:hosted:copy",
    endingMessage(HOSTED_DEST)
  )
);

gulp.task("release:bower:copy", function () {
  return gulp
    .src(["dist/bower/*", "dist/bower/.*"])
    .pipe(gulp.dest(BOWER_DEST));
});

gulp.task(
  "release:bower",
  gulp.series(
    "clean",
    "build:hosted",
    "build:bower",
    "release:bower:copy",
    endingMessage(BOWER_DEST)
  )
);

gulp.task(
  "release:npm",
  gulp.series(
    "clean",
    "build:hosted",
    "build:npm",
    endingMessage(NPM_DEST, function () {
      console.log(); // eslint-disable-line no-console
      console.log("Run", chalk.yellow("cd dist/npm")); // eslint-disable-line no-console
      console.log(); // eslint-disable-line no-console
      console.log("Run", chalk.yellow("npm publish")); // eslint-disable-line no-console
    })
  )
);

function endingMessage(destination, additionalTask) {
  return function () {
    console.log(); // eslint-disable-line no-console
    // eslint-disable-next-line no-console
    console.log(
      chalk.red("Files have been copied into"),
      chalk.green(destination)
    );
    console.log(); // eslint-disable-line no-console

    if (additionalTask) {
      additionalTask();
    }

    return Promise.resolve();
  };
}
