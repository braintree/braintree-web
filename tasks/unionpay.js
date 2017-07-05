'use strict';

var del = require('del');
var gulp = require('gulp');
var browserify = require('./browserify');
var fs = require('fs');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var run = require('run-sequence');
var minifyHTML = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION;

gulp.task('build:unionpay:js', function (done) {
  browserify({
    standalone: 'braintree.unionpay',
    main: 'src/unionpay/index.js',
    out: 'unionpay.js',
    dist: DIST_DIR + '/js'
  }, done);
});

gulp.task('build:unionpay:frame:js', function (done) {
  browserify({
    standalone: 'unionpayHostedFields',
    main: 'src/unionpay/internal/index.js',
    out: 'unionpay-hosted-fields-internal.js',
    dist: DIST_DIR + '/js',
    uglify: false
  }, done);
});

gulp.task('build:unionpay:frame:html', function (done) {
  var jsFile = fs.readFileSync(DIST_DIR + '/js/unionpay-hosted-fields-internal.js', 'utf-8');

  return gulp.src('src/unionpay/internal/unionpay-hosted-fields-frame.html')
    .pipe(replace('@BUILT_FILE', jsFile))
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

gulp.task('build:unionpay:frame:js:delete', function (done) {
  var jsFilePath = DIST_DIR + '/js/unionpay-hosted-fields-internal.js';

  return del(jsFilePath);
});

gulp.task('build:unionpay:frame', function (done) {
  run('build:unionpay:frame:js', 'build:unionpay:frame:html', 'build:unionpay:frame:js:delete', done);
});

gulp.task('build:unionpay', ['build:unionpay:js', 'build:unionpay:frame']);
