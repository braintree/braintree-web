'use strict';

var gulp = require('gulp');
var browserify = require('./browserify');
var rename = require('gulp-rename');
var minifyHTML = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION;

gulp.task('build:unionpay:js:external', function (done) {
  browserify({
    standalone: 'braintree.unionpay',
    main: 'src/unionpay/index.js',
    out: 'unionpay.js',
    dist: DIST_DIR + '/js'
  }, done);
});

gulp.task('build:unionpay:js:internal', function (done) {
  browserify({
    standalone: 'unionpayHostedFields',
    main: 'src/unionpay/internal/index.js',
    out: 'unionpay-hosted-fields-internal.js',
    dist: DIST_DIR + '/js'
  }, done);
});

gulp.task('build:unionpay:html', function (done) {
  return gulp.src('src/unionpay/internal/unionpay-hosted-fields-frame.html')
  .pipe(gulp.dest(DIST_DIR + '/html'))
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
  .pipe(gulp.dest(DIST_DIR + '/html'));
});

gulp.task('build:unionpay:js', ['build:unionpay:js:external', 'build:unionpay:js:internal']);
gulp.task('build:unionpay', ['build:unionpay:js', 'build:unionpay:html']);
