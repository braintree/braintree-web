'use strict';

var del = require('del');
var gulp = require('gulp');
var fs = require('fs');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var run = require('run-sequence');
var browserify = require('./browserify');
var minify = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION + '/';
var STATIC_DIR = 'dist/hosted/web/static/';
var JS_TASKS = [];
var DELETE_INTERNAL_JS_TASKS = [];
var HTML_TASKS = [];
var CSS_TASKS = [];
var IMG_TASKS = [];

var internalFrames = ['issuers', 'redirect'];
var staticFrames = ['sandbox-approval'];

internalFrames.forEach(function (frame) {
  var taskNames = ['js', 'css', 'html', 'js:delete'].map(function (subtask) {
    return 'build:ideal:frame:' + subtask + ':' + frame + '-frame';
  });
  var jsTaskName = taskNames[0];
  var cssTaskName = taskNames[1];
  var htmlTaskName = taskNames[2];
  var deleteInternalJSTaskName = taskNames[3];

  JS_TASKS.push(jsTaskName);
  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'braintree.ideal',
      main: 'src/ideal/internal/' + frame + '-frame.js',
      out: 'ideal-' + frame + '-frame.js',
      dist: DIST_DIR + 'js',
      uglify: false
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
    var jsFile = fs.readFileSync(DIST_DIR + 'js/ideal-' + frame + '-frame.js');

    return gulp.src('src/ideal/internal/' + frame + '-frame.html')
      .pipe(replace('@BUILT_FILE', jsFile))
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

  DELETE_INTERNAL_JS_TASKS.push(deleteInternalJSTaskName);
  gulp.task(deleteInternalJSTaskName, function () {
    var jsFilePath = DIST_DIR + 'js/ideal-' + frame + '-frame.js';

    return del(jsFilePath);
  });
});

staticFrames.forEach(function (frame) {
  var taskNames = ['js', 'img', 'html', 'js:delete'].map(function (lang) {
    return 'build:static-ideal:' + lang + ':' + frame;
  });
  var jsTaskName = taskNames[0];
  var imgTaskName = taskNames[1];
  var htmlTaskName = taskNames[2];
  var deleteInternalJSTaskName = taskNames[3];

  JS_TASKS.push(jsTaskName);
  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'braintree.ideal',
      main: 'src/ideal/static/' + frame + '.js',
      out: 'ideal-' + frame + '.js',
      dist: STATIC_DIR + 'js',
      uglify: false
    }, done);
  });

  IMG_TASKS.push(imgTaskName);
  gulp.task(imgTaskName, function () {
    return gulp.src('src/ideal/static/images/**/*')
      .pipe(gulp.dest(STATIC_DIR + 'images'));
  });

  HTML_TASKS.push(htmlTaskName);
  gulp.task(htmlTaskName, function () {
    var jsFile = fs.readFileSync(STATIC_DIR + 'js/ideal-'+ frame + '.js');

    return gulp.src('src/ideal/static/' + frame + '.html')
      .pipe(replace('@BUILT_FILE', jsFile))
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

  DELETE_INTERNAL_JS_TASKS.push(deleteInternalJSTaskName);
  gulp.task(deleteInternalJSTaskName, function () {
    // All JavaScript built files for static frames
    // are not needed after inlining.
    // Delete the static js folder.
    var jsFolder = STATIC_DIR + 'js/';

    return del(jsFolder);
  });
});

gulp.task('build:ideal:js', function (done) {
  browserify({
    standalone: 'braintree.ideal',
    main: 'src/ideal/index.js',
    out: 'ideal.js',
    dist: DIST_DIR + 'js'
  }, done);
});

gulp.task('build:ideal:frame:html', HTML_TASKS);
gulp.task('build:ideal:frame:js', JS_TASKS);
gulp.task('build:ideal:frame:css', CSS_TASKS);
gulp.task('build:ideal:frame:img', IMG_TASKS);
gulp.task('build:ideal:frame:js:delete', DELETE_INTERNAL_JS_TASKS);
gulp.task('build:ideal:frame', ['build:ideal:frame:css', 'build:ideal:frame:img'], function (done) {
  run('build:ideal:frame:js', 'build:ideal:frame:html', 'build:ideal:frame:js:delete', done);
});
gulp.task('build:ideal', ['build:ideal:js', 'build:ideal:frame']);
