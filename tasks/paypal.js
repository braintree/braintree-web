'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var browserify = require('./browserify');
var minifyHTML = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION + '/';
var JS_TASKS = ['build:paypal:js:external'];
var HTML_TASKS = [];
var FRAMES = ['redirect', 'cancel'];

FRAMES.forEach(function (frame) {
  var jsTaskName = 'build:paypal:js:' + frame + '-frame';
  var htmlTaskName = 'build:paypal:html:' + frame + '-frame';

  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'braintree.paypal',
      main: 'src/paypal/internal/' + frame + '-frame.js',
      out: 'paypal-' + frame + '-frame.js',
      dist: DIST_DIR + 'js'
    }, done);
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    return gulp.src('src/paypal/internal/frame.html')
      .pipe(rename(function (path) {
        path.basename = 'paypal-' + frame + '-' + path.basename;
      }))
      .pipe(replace('@FRAME', frame))
      .pipe(gulp.dest(DIST_DIR + 'html'))
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
      .pipe(gulp.dest(DIST_DIR + 'html'));
  });

  HTML_TASKS.push(htmlTaskName);
});

HTML_TASKS.push('build:paypal:html:landing-frame');
gulp.task('build:paypal:html:landing-frame', function () {
  return gulp.src('src/paypal/internal/landing-frame.html')
    .pipe(rename('paypal-landing-frame.html'))
    .pipe(gulp.dest(DIST_DIR + 'html'))
    .pipe(minifyHTML({
      minify: true,
      collapseWhitespace: true,
      conservativeCollapse: false,
      minifyJS: true,
      minifyCSS: true
    }))
    .pipe(rename({extname: '.min.html'}))
    .pipe(gulp.dest(DIST_DIR + 'html'));
});

gulp.task('build:paypal:js:external', function (done) {
  browserify({
    standalone: 'braintree.paypal',
    main: 'src/paypal/index.js',
    out: 'paypal.js',
    dist: DIST_DIR + 'js'
  }, done);
});

gulp.task('build:paypal:html', HTML_TASKS);
gulp.task('build:paypal:js', JS_TASKS);
gulp.task('build:paypal', ['build:paypal:js', 'build:paypal:html']);
