"use strict";

var spawn = require("child_process").spawn;
var gulp = require("gulp");
var del = require("del");
var VERSION = require("../package.json").version;
var DIST_DIR = "dist/jsdoc/";
var VERSIONED_DIR = DIST_DIR + VERSION;
var CURRENT_LINK = "dist/jsdoc/current";
var JSDOC_HOME = "jsdoc/Home.md";
var fs = require("fs");

function _replaceVersionInFile(filename) {
  return `<(sed -e 's/@VERSION/${VERSION}/g' '${filename}')`;
}

// eslint-disable-next-line complexity
function jsdoc(options, done) {
  var args = ["jsdoc", "src"];

  options = options || {};

  if (options.access) args.splice(1, 0, "-a", options.access);
  if (options.configure) args.splice(1, 0, "-c", options.configure);
  if (options.debug === true) args.splice(1, 0, "--debug");
  if (options.destination) args.splice(1, 0, "-d", options.destination);
  if (options.encoding) args.splice(1, 0, "-e", options.encoding);
  if (options.help === true) args.splice(1, 0, "-h");
  if (options.match) args.splice(1, 0, "--match", options.match);
  if (options.nocolor === true) args.splice(1, 0, "--nocolor");
  if (options.private === true) args.splice(1, 0, "-p");
  if (options.package) args.splice(1, 0, "-P", options.package);
  if (options.pedantic === true) args.splice(1, 0, "--pedantic");
  if (options.query) args.splice(1, 0, "-q", options.query);
  if (options.recurse === true) args.splice(1, 0, "-r");
  if (options.readme)
    args.splice(1, 0, "-R", _replaceVersionInFile(options.readme));
  if (options.template) args.splice(1, 0, "-t", options.template);
  if (options.test === true) args.splice(1, 0, "-T");
  if (options.tutorials) args.splice(1, 0, "-u", options.tutorials);
  if (options.version === true) args.splice(1, 0, "-v");
  if (options.verbose === true) args.splice(1, 0, "--verbose");
  if (options.explain === true) args.splice(1, 0, "-X");

  spawn("bash", ["-c", args.join(" ")], {
    stdio: ["ignore", 1, 2],
  }).on("exit", function (code) {
    if (code === 0) {
      done();
    } else {
      done(code);
    }
  });
}

gulp.task("jsdoc:clean", function () {
  return del([DIST_DIR]);
});

gulp.task("jsdoc:generate", function (done) {
  jsdoc(
    {
      configure: "jsdoc/conf.json",
      destination: VERSIONED_DIR,
      recurse: true,
      readme: JSDOC_HOME,
      template: "node_modules/jsdoc-template",
    },
    done
  );
});

gulp.task("jsdoc:statics", function () {
  return gulp
    .src(["jsdoc/index.html", "jsdoc/.nojekyll"])
    .pipe(gulp.dest(DIST_DIR));
});

gulp.task("jsdoc:link-current", function (done) {
  fs.symlink(VERSION, CURRENT_LINK, done);
});

gulp.task(
  "jsdoc",
  gulp.series(
    "jsdoc:clean",
    "jsdoc:generate",
    gulp.series("jsdoc:link-current", "jsdoc:statics")
  )
);

module.exports = {
  jsdoc: jsdoc,
};
