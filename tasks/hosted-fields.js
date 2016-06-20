'use strict';

var gulp = require('gulp');
var browserify = require('./browserify');
var path = require('path');
var rename = require('gulp-rename');
var VERSION = require('../package.json').version;

var BASE_PATH = path.resolve(__dirname, '..', 'src', 'hosted-fields');
var DIST_PATH = path.resolve(__dirname, '..', 'dist', 'hosted', 'web', VERSION);

gulp.task('build:hosted-fields:html', function () {
  var minifyHTML = require('gulp-minifier');

  return gulp.src(BASE_PATH + '/internal/hosted-fields-frame.html')
    .pipe(gulp.dest(DIST_PATH + '/html'))
    .pipe(minifyHTML({
      minify: true,
      collapseWhitespace: true,
      conservativeCollapse: false,
      minifyJS: true,
      minifyCSS: true
    }))
    .pipe(rename({
      extname: '.min.html'
    }))
    .pipe(gulp.dest(DIST_PATH + '/html'));
});

gulp.task('build:hosted-fields:external-js', function (done) {
  browserify({
    standalone: 'braintree.hosted-fields',
    main: BASE_PATH + '/index.js',
    out: 'hosted-fields.js',
    dist: DIST_PATH + '/js'
  }, done);
});

gulp.task('build:hosted-fields:internal-js', function (done) {
  browserify({
    standalone: 'braintree.hosted-fields',
    main: BASE_PATH + '/internal/index.js',
    out: 'hosted-fields-internal.js',
    dist: DIST_PATH + '/js'
  }, done);
});

gulp.task('build:hosted-fields:polyfills-ie9', function (done) {
  browserify({
    main: BASE_PATH + '/internal/polyfills/ie9.js',
    out: 'hosted-fields-internal-polyfills-ie9.js',
    dist: DIST_PATH + '/js'
  }, done);
});

gulp.task('build:hosted-fields', [
  'build:hosted-fields:html',
  'build:hosted-fields:internal-js',
  'build:hosted-fields:polyfills-ie9',
  'build:hosted-fields:external-js'
]);
