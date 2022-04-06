"use strict";

var gulp = require("gulp");
var del = require("del");
var VERSION = require("./package.json").version;

var COMPONENTS = require("./components.json");

require("dotenv").config();

gulp.task("clean", function () {
  return del(["./dist"]);
});

COMPONENTS.forEach(function (component) {
  require("./tasks/" + component);
});
require("./tasks/frame-service");
require("./tasks/build");
require("./tasks/release");
require("./tasks/jsdoc");
require("./tasks/test");

function setNpmVersion() {
  process.env.npm_package_version = VERSION;

  return Promise.resolve();
}

function watch() {
  process.env.BRAINTREE_JS_ENV = "development";

  COMPONENTS.forEach(function (component) {
    gulp
      .watch(["src/" + component + "/**", "src/lib/**"])
      .on("change", gulp.series("build:" + component));
  });

  gulp.watch(["src/**/*", "jsdoc/*"], gulp.series("jsdoc"));
}

gulp.task("build:integration", gulp.series(setNpmVersion, "build", "jsdoc"));

gulp.task("watch:integration", gulp.series(setNpmVersion, watch));
