'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var browserify = require('./browserify');
var minify = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION + '/';
var STATIC_DIR = 'dist/hosted/web/static/';
var JS_TASKS = ['build:ideal:js:external'];
var HTML_TASKS = [];
var CSS_TASKS = [];
var IMG_TASKS = [];

var internalFrames = ['issuers', 'redirect'];
var staticFrames = ['sandbox-approval'];

internalFrames.forEach(function (frame) {
  var taskNames = ['js', 'css', 'html'].map(function (lang) {
    return 'build:ideal:' + lang + ':' + frame + '-frame';
  });
  var jsTaskName = taskNames[0];
  var cssTaskName = taskNames[1];
  var htmlTaskName = taskNames[2];

  JS_TASKS.push(jsTaskName);
  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'braintree.ideal',
      main: 'src/ideal/internal/' + frame + '-frame.js',
      out: 'ideal-' + frame + '-frame.js',
      dist: DIST_DIR + 'js'
    }, done);
  });

  CSS_TASKS.push(cssTaskName);
  gulp.task(cssTaskName, function () {
    return gulp.src('src/ideal/internal/' + frame + '-frame.css')
      .pipe(rename(function (path) {
        path.basename = 'ideal-' + path.basename;
      }))
      .pipe(gulp.dest(DIST_DIR + 'css'))
      .pipe(minify({
        minify: true,
        collapseWhitespace: true,
        conservativeCollapse: false,
        minifyCSS: true
      }))
      .pipe(rename({
        extname: '.min.css'
      }))
      .pipe(gulp.dest(DIST_DIR + 'css'));
  });

  HTML_TASKS.push(htmlTaskName);
  gulp.task(htmlTaskName, function () {
    return gulp.src('src/ideal/internal/' + frame + '-frame.html')
      .pipe(rename(function (path) {
        path.basename = 'ideal-' + path.basename;
      }))
      .pipe(gulp.dest(DIST_DIR + 'html'))
      .pipe(minify({
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
});

staticFrames.forEach(function (frame) {
  var taskNames = ['js', 'img', 'html'].map(function (lang) {
    return 'build:static-ideal:' + lang + ':' + frame;
  });
  var jsTaskName = taskNames[0];
  var imgTaskName = taskNames[1];
  var htmlTaskName = taskNames[2];

  JS_TASKS.push(jsTaskName);
  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'braintree.ideal',
      main: 'src/ideal/static/' + frame + '.js',
      out: 'ideal-' + frame + '.js',
      dist: STATIC_DIR + 'js'
    }, done);
  });

  IMG_TASKS.push(imgTaskName);
  gulp.task(imgTaskName, function () {
    return gulp.src('src/ideal/static/images/**/*')
      .pipe(gulp.dest(STATIC_DIR + 'images'));
  });

  HTML_TASKS.push(htmlTaskName);
  gulp.task(htmlTaskName, function () {
    return gulp.src('src/ideal/static/' + frame + '.html')
      .pipe(rename(function (path) {
        path.basename = 'ideal-' + path.basename;
      }))
      .pipe(minify({
        minify: true,
        collapseWhitespace: true,
        conservativeCollapse: false,
        minifyJS: true,
        minifyCSS: true
      }))
      .pipe(gulp.dest(STATIC_DIR + 'html'));
  });
});

gulp.task('build:ideal:js:external', function (done) {
  browserify({
    standalone: 'braintree.ideal',
    main: 'src/ideal/index.js',
    out: 'ideal.js',
    dist: DIST_DIR + 'js'
  }, done);
});

gulp.task('build:ideal:html', HTML_TASKS);
gulp.task('build:ideal:js', JS_TASKS);
gulp.task('build:ideal:css', CSS_TASKS);
gulp.task('build:ideal:img', IMG_TASKS);
gulp.task('build:ideal', ['build:ideal:js', 'build:ideal:css', 'build:ideal:html', 'build:ideal:img']);
