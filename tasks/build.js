"use strict";

var gulp = require("gulp");
var envify = require("@ladjs/gulp-envify");
var rename = require("gulp-rename");
var removeCode = require("gulp-remove-code");
var replace = require("gulp-replace");
var mkdirp = require("mkdirp");
var browserify = require("./browserify");
var clone = require("../src/lib/json-clone");
var COMPONENTS = require("../components");
var merge = require("merge-stream");
var VERSION = require("../package.json").version;
var JS_PATH = "dist/hosted/web/" + VERSION + "/js/";
var HTML_PATH = "dist/hosted/web/" + VERSION + "/html/";
var BOWER_DIST = "dist/bower";
var NPM_DIST = "dist/npm";
var fs = require("fs");
var JS_COMMENT_REGEX = /(\/\*[\s\S]*?\*\/\n*|\/\/.*?\n)/gm;

var BUILD_TASKS = COMPONENTS.concat(["index", "frame-service"]).map(
  (name) => "build:" + name
);

gulp.task("build:index", function (done) {
  browserify(
    {
      standalone: "braintree",
      main: "./src/index.js",
      dist: JS_PATH,
      out: "index.js",
    },
    done
  );
});

gulp.task("build:bower:statics", function () {
  return gulp
    .src([
      "./publishing/.gitignore",
      "./publishing/bower.json",
      "./CHANGELOG.md",
      "./LICENSE",
      "./README.md",
    ])
    .pipe(replace("@VERSION", VERSION))
    .pipe(gulp.dest(BOWER_DIST));
});

gulp.task("build:npm:packagejson", function (done) {
  var pkg = clone(require("../package.json"));

  pkg.name = "braintree-web";
  pkg.main = "index.js";
  pkg.browser = COMPONENTS.reduce(function (obj, component) {
    obj[component] = "./dist/browser/" + component + ".js";

    return obj;
  }, {});
  pkg.browser["./index.js"] = "./dist/browser/index.js";
  (pkg.description =
    "A suite of tools for integrating Braintree in the browser"),
    (pkg.repository = {
      type: "git",
      url: "git@github.com:braintree/braintree-web",
    });
  pkg.keywords = ["braintree", "payments"];
  pkg.author = "braintree <code@getbraintree.com>";
  pkg.homepage = "https://github.com/braintree/braintree-web";

  delete pkg.private;
  delete pkg.scripts;
  delete pkg.browserify;
  delete pkg.devDependencies;

  mkdirp.sync(NPM_DIST);

  fs.writeFile(
    NPM_DIST + "/" + "package.json",
    JSON.stringify(pkg, null, 2),
    done
  );
});

gulp.task(
  "build:npm:statics",
  gulp.series("build:npm:packagejson", function () {
    return gulp
      .src([
        "./publishing/.gitignore",
        "./CHANGELOG.md",
        "./LICENSE",
        "./README.md",
      ])
      .pipe(gulp.dest(NPM_DIST));
  })
);

gulp.task("build:npm:src", function () {
  return gulp
    .src([
      "src/**/*.js",
      "!src/**/__mocks__/**",
      "!src/**/coverage/**",
      "!src/**/internal/**", // no need to pass the internal files to npm
    ])
    .pipe(removeCode({ production: true }))
    .pipe(envify(process.env))
    .pipe(gulp.dest(NPM_DIST));
});

gulp.task("build:npm:browser", function () {
  var files = COMPONENTS.concat("index").map(function (component) {
    return JS_PATH + component + ".js";
  });

  return gulp.src(files).pipe(gulp.dest(NPM_DIST + "/dist/browser"));
});

gulp.task("build:bower:js", function () {
  var files = COMPONENTS.concat("index").map(function (component) {
    return JS_PATH + component + ".min.js";
  });

  return gulp
    .src(files)
    .pipe(
      rename(function (path) {
        path.basename = path.basename.replace(/\.min$/, "");
      })
    )
    .pipe(gulp.dest(BOWER_DIST));
});

gulp.task("build:bower:debugs", function () {
  var components = gulp
    .src(COMPONENTS.map((name) => JS_PATH + name + ".js"))
    .pipe(
      rename({
        extname: ".debug.js",
      })
    )
    .pipe(gulp.dest(BOWER_DIST));

  var debug = gulp
    .src(JS_PATH + "index.js")
    .pipe(rename("debug.js"))
    .pipe(gulp.dest(BOWER_DIST));

  return merge(components, debug);
});

gulp.task(
  "build:bower",
  gulp.series("build:bower:js", "build:bower:debugs", "build:bower:statics")
);

gulp.task("build:html:unmin", function () {
  return gulp
    .src([HTML_PATH + "*.html", "!" + HTML_PATH + "*.min.html"])
    .pipe(replace("@DOT_MIN", ""))
    .pipe(gulp.dest(HTML_PATH));
});

gulp.task("build:html:min", function () {
  return gulp
    .src([HTML_PATH + "*.min.html"])
    .pipe(replace("@DOT_MIN", ".min"))
    .pipe(gulp.dest(HTML_PATH));
});

gulp.task("build:hosted:link-latest", function (done) {
  fs.symlink(VERSION, "dist/hosted/web/dev", done);
});

gulp.task(
  "build:hosted",
  gulp.series(
    gulp.parallel(BUILD_TASKS),
    "build:hosted:link-latest",
    "build:html:min",
    "build:html:unmin"
  )
);

gulp.task(
  "build:npm",
  gulp.series("build:npm:statics", "build:npm:src", "build:npm:browser")
);

gulp.task(
  "build",
  gulp.series("clean", "build:hosted", "build:npm", "build:bower")
);
