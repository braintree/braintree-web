"use strict";

var gulp = require("gulp");
var spawn = require("child_process").spawn;
var components = require("../components.json");

var LINT_TASKS = components.concat(["lib", "environment", "publishing"]);

function _lint(src, test, done) {
  spawn("eslint", ["src/" + src, "test/" + test], {
    stdio: "inherit",
  }).on("exit", function (code, _signal) {
    if (code === 0) {
      done();
    } else {
      done("eslint reported errors");
    }
  });
}

function _jest(options, done) {
  spawn("jest", options, {
    stdio: "inherit",
  }).on("exit", done);
}

LINT_TASKS.forEach((component) => {
  gulp.task(`lint:${component}`, (done) => {
    _lint(component, component, done);
  });
});

gulp.task("lint", function (done) {
  _lint("", "", done);
});
