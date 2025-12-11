"use strict";

var del = require("del");
var gulp = require("gulp");
var browserify = require("./browserify");
var path = require("path");
var fs = require("fs");
var minify = require("gulp-minifier");
var rename = require("gulp-rename");
var replace = require("gulp-replace");
var VERSION = require("../package.json").version;
var calculateCSPHashes = require("../scripts/calculate-csp-hashes");

var BASE_PATH = path.resolve(__dirname, "..", "src", "hosted-fields");
var DIST_PATH = path.resolve(__dirname, "..", "dist", "hosted", "web", VERSION);

function processCSPHashes(done) {
  var regularHtmlPath = DIST_PATH + "/html/hosted-fields-frame.html";
  var minHtmlPath = DIST_PATH + "/html/hosted-fields-frame.min.html";
  var regularFileMetadata;
  var regularFileCSPMetaTag;
  var regularFileHtmlContent;
  var minifiedFileMetadata;
  var minifiedFileCSPMetaTag;
  var minifiedFileHtmlContent;

  try {
    // Generate CSP for regular HTML
    regularFileMetadata = calculateCSPHashes.generateCSPMetadata(
      regularHtmlPath,
      VERSION
    );
    regularFileCSPMetaTag = calculateCSPHashes.generateCSPMetaTag(
      regularFileMetadata.csp_header
    );

    // Update regular HTML with correct CSP meta tag
    regularFileHtmlContent = fs.readFileSync(regularHtmlPath, "utf8");
    regularFileHtmlContent = regularFileHtmlContent.replace(
      "<!-- CSP_PLACEHOLDER -->",
      regularFileCSPMetaTag
    );
    fs.writeFileSync(regularHtmlPath, regularFileHtmlContent, "utf8");

    // Generate CSP for minified HTML
    minifiedFileMetadata = calculateCSPHashes.generateCSPMetadata(minHtmlPath);
    minifiedFileCSPMetaTag = calculateCSPHashes.generateCSPMetaTag(
      minifiedFileMetadata.csp_header
    );

    // Update minified HTML with correct CSP meta tag
    minifiedFileHtmlContent = fs.readFileSync(minHtmlPath, "utf8");
    minifiedFileHtmlContent = minifiedFileHtmlContent.replace(
      "<!-- CSP_PLACEHOLDER -->",
      minifiedFileCSPMetaTag
    );
    fs.writeFileSync(minHtmlPath, minifiedFileHtmlContent, "utf8");

    done();
  } catch (error) {
    done(error);
  }
}

gulp.task("build:hosted-fields:frame:html", function (done) {
  var jsFile = fs.readFileSync(
    DIST_PATH + "/js/hosted-fields-internal.js",
    "utf8"
  );

  return gulp
    .src(BASE_PATH + "/internal/hosted-fields-frame.html")
    .pipe(replace("@BUILT_FILE", jsFile))
    .pipe(replace("@CSP_META_TAG", "<!-- CSP_PLACEHOLDER -->"))
    .pipe(gulp.dest(DIST_PATH + "/html"))
    .pipe(
      minify({
        minify: true,
        minifyHTML: {
          collapseWhitespace: true,
          conservativeCollapse: false,
          minifyJS: true,
          minifyCSS: true,
        },
      })
    )
    .pipe(
      rename({
        extname: ".min.html",
      })
    )
    .pipe(gulp.dest(DIST_PATH + "/html"))
    .on("end", function () {
      processCSPHashes(done);
    });
});

gulp.task("build:hosted-fields:js", function (done) {
  browserify(
    {
      standalone: "braintree.hosted-fields",
      main: BASE_PATH + "/index.js",
      out: "hosted-fields.js",
      dist: DIST_PATH + "/js",
    },
    done
  );
});

gulp.task("build:hosted-fields:frame:js", function (done) {
  browserify(
    {
      standalone: "braintree.hosted-fields",
      main: BASE_PATH + "/internal/index.js",
      out: "hosted-fields-internal.js",
      dist: DIST_PATH + "/js",
      uglify: false,
    },
    done
  );
});

gulp.task("build:hosted-fields:frame:js:polyfills-ie9", function (done) {
  browserify(
    {
      main: BASE_PATH + "/internal/polyfills/ie9.js",
      out: "hosted-fields-internal-polyfills-ie9.js",
      dist: DIST_PATH + "/js",
    },
    done
  );
});

gulp.task("build:hosted-fields:frame:js:delete", function () {
  var internalJsPath = DIST_PATH + "/js/hosted-fields-internal.js";
  var ie9PolyfillJsPath =
    DIST_PATH + "/js/hosted-fields-internal-polyfills-ie9.js";

  return del([internalJsPath, ie9PolyfillJsPath]);
});

gulp.task(
  "build:hosted-fields:frame",
  gulp.series(
    "build:hosted-fields:frame:js",
    "build:hosted-fields:frame:js:polyfills-ie9",
    // the html task depends on the frame:js
    // and polyfill tasks so it must run after
    // they have finished
    "build:hosted-fields:frame:html",
    "build:hosted-fields:frame:js:delete"
  )
);

gulp.task(
  "build:hosted-fields",
  gulp.parallel("build:hosted-fields:js", "build:hosted-fields:frame")
);
