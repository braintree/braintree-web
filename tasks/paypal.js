'use strict';

var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var run = require('run-sequence');
var browserify = require('./browserify');
var minifyHTML = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION + '/';
var JS_TASKS = [];
var JS_DELETE_TASKS = [];
var HTML_TASKS = [];
var FRAMES = ['redirect', 'cancel'];

FRAMES.forEach(function (frame) {
  var jsTaskName = 'build:paypal:frame:js:' + frame + '-frame';
  var jsDeleteTaskName = 'build:paypal:frame:js:delete:' + frame + '-frame';
  var htmlTaskName = 'build:paypal:frame:html:' + frame + '-frame';


  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'braintree.paypal',
      main: 'src/paypal/internal/' + frame + '-frame.js',
      out: 'paypal-' + frame + '-frame.js',
      dist: DIST_DIR + 'js',
      uglify: false
    }, done);
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    var jsFile = fs.readFileSync(DIST_DIR + 'js/paypal-' + frame + '-frame.js', 'utf8');

    return gulp.src('src/paypal/internal/frame.html')
      .pipe(replace('@BUILT_FILE', jsFile))
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

  gulp.task(jsDeleteTaskName, function () {
    var jsFilePath = DIST_DIR + 'js/paypal-' + frame + '-frame.js'

    return del(jsFilePath);
  });

  JS_DELETE_TASKS.push(jsDeleteTaskName);

});

HTML_TASKS.push('build:paypal:frame:html:landing-frame');
gulp.task('build:paypal:frame:html:landing-frame', function () {
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

gulp.task('build:paypal:js', function (done) {
  browserify({
    standalone: 'braintree.paypal',
    main: 'src/paypal/index.js',
    out: 'paypal.js',
    dist: DIST_DIR + 'js'
  }, done);
});

gulp.task('build:paypal:frame:html', HTML_TASKS);
gulp.task('build:paypal:frame:js', JS_TASKS);
gulp.task('build:paypal:frame:js:delete', JS_DELETE_TASKS);
gulp.task('build:paypal:frame', function (done) {
  run('build:paypal:frame:js', 'build:paypal:frame:html', 'build:paypal:frame:js:delete', done);
});
gulp.task('build:paypal', ['build:paypal:js', 'build:paypal:frame']);
