"use strict";

var gulp = require("gulp");
var minify = require("gulp-minifier");
var rename = require("gulp-rename");

function minifyHTML(stream, dist) {
  return stream
    .pipe(gulp.dest(dist))
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
    .pipe(gulp.dest(dist));
}

module.exports = {
  minifyHTML,
};
